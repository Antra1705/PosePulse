import os
import time

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from detectors.squat import SquatDetector
from detectors.pushup import PushUpDetector
from detectors.biceps_curl import BicepsCurlDetector
from detectors.shoulder_press import ShoulderPressDetector
from detectors.lunges import LungesDetector
from services.config.workout_config import POSE_CONNECTIONS

_GREEN = (0, 255, 0)
_BLUE = (255, 0, 0)

_PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)


def default_model_path():
    """Resolve the pose model file. POSE_MODEL_PATH overrides the bundled model."""
    return os.environ.get(
        "POSE_MODEL_PATH",
        os.path.join(_PROJECT_ROOT, "ml_models", "pose_landmarker_full.task"),
    )


class PoseAnalyzer:
    """Runs pose landmarking + exercise detection on individual video frames.

    One instance per workout session: the underlying landmarker runs in VIDEO
    mode and the detectors keep cumulative rep state.
    """

    MIN_VISIBILITY = 0.7

    def __init__(self, exercise_type="Squats"):
        options = vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=default_model_path()),
            running_mode=vision.RunningMode.VIDEO,
            min_pose_detection_confidence=0.7,
            min_pose_presence_confidence=0.7,
            min_tracking_confidence=0.7,
            output_segmentation_masks=False,
        )

        self._landmarker = vision.PoseLandmarker.create_from_options(options)

        self._detectors = {
            "Squats": SquatDetector(),
            "Push-ups": PushUpDetector(),
            "Biceps Curls (Dumbbell)": BicepsCurlDetector(),
            "Shoulder Press": ShoulderPressDetector(),
            "Lunges": LungesDetector(),
        }

        self._exercise_type = exercise_type
        self._started_at = time.monotonic()
        self._last_timestamp_ms = -1

    def set_exercise(self, exercise_type):
        if exercise_type != self._exercise_type and exercise_type in self._detectors:
            self._exercise_type = exercise_type
            self._detectors[exercise_type].reset()

    def close(self):
        self._landmarker.close()

    # ── core inference ─────────────────────────────────────────────────────

    def _next_timestamp_ms(self):
        """VIDEO mode needs strictly increasing timestamps; use wall-clock so
        the tracker's temporal smoothing matches the real frame cadence."""
        now_ms = int((time.monotonic() - self._started_at) * 1000)

        if now_ms <= self._last_timestamp_ms:
            now_ms = self._last_timestamp_ms + 1

        self._last_timestamp_ms = now_ms
        return now_ms

    def analyze(self, image_bgr):
        """Analyze one BGR frame without drawing anything.

        Returns (landmarks, metrics) where ``landmarks`` is a list of
        ``[x, y, visibility]`` triples in the *mirrored* image space (the
        frame is flipped horizontally so the user sees a mirror view), or
        ``None`` when no pose was found.
        """
        image = np.ascontiguousarray(cv2.flip(image_bgr, 1))

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB),
        )

        result = self._landmarker.detect_for_video(mp_image, self._next_timestamp_ms())

        if not result.pose_landmarks:
            return None, {"pose_detected": False}

        landmarks = result.pose_landmarks[0]
        detector = self._detectors.get(self._exercise_type)

        if detector is None:
            return None, {"pose_detected": False}

        metrics = detector.process(landmarks)
        metrics["pose_detected"] = True

        compact = [
            [round(lm.x, 4), round(lm.y, 4), round(lm.visibility, 2)]
            for lm in landmarks
        ]

        return compact, metrics

    # ── legacy annotated-frame path (kept for local debugging) ─────────────

    def process_frame(self, image_bgr):
        """Analyze one BGR frame. Returns (annotated_bgr, metrics dict)."""
        image = np.ascontiguousarray(cv2.flip(image_bgr, 1))
        landmarks, metrics = self.analyze(image_bgr)

        if landmarks is None:
            self._draw_no_pose_warning(image)
            return image, metrics

        self._draw_skeleton(image, landmarks)
        self._draw_status_bar(image, metrics)
        return image, metrics

    def _draw_skeleton(self, img, landmarks):
        h, w = img.shape[:2]

        for start_idx, end_idx in POSE_CONNECTIONS:
            x1, y1, v1 = landmarks[start_idx]
            x2, y2, v2 = landmarks[end_idx]

            if v1 > self.MIN_VISIBILITY and v2 > self.MIN_VISIBILITY:
                cv2.line(img, (int(x1 * w), int(y1 * h)), (int(x2 * w), int(y2 * h)), _GREEN, 8)

        for x, y, v in landmarks:
            if v > self.MIN_VISIBILITY:
                cv2.circle(img, (int(x * w), int(y * h)), 8, _BLUE, -1)

    def _draw_no_pose_warning(self, img):
        for i, text in enumerate(("NO POSE DETECTED", "PLEASE FACE THE CAMERA")):
            cv2.putText(img, text, (30, 50 * (i + 1)), cv2.FONT_HERSHEY_SIMPLEX, 1, _GREEN, 2, cv2.LINE_AA)

    _STATUS_LINES = {
        "Squats": lambda m: f"DEPTH: {m['depth_status']}",
        "Push-ups": lambda m: f"BODY: {m['body_alignment']} | HIP: {m['hip_status']}",
        "Biceps Curls (Dumbbell)": lambda m: f"SWING: {m['swing_status']}",
        "Shoulder Press": lambda m: f"EXT: {m['extension_status']} | BACK: {m['back_arch_status']}",
        "Lunges": lambda m: f"BALANCE: {m['balance_status']}",
    }

    def _draw_status_bar(self, img, metrics):
        build_line = self._STATUS_LINES.get(self._exercise_type)

        if build_line is None:
            return

        h = img.shape[0]
        cv2.putText(img, build_line(metrics), (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 1, _GREEN, 2)


def warm_up():
    """Load the model once so the first real session doesn't pay the cost."""
    analyzer = PoseAnalyzer()

    try:
        blank = np.zeros((240, 320, 3), dtype=np.uint8)
        analyzer.analyze(blank)
    finally:
        analyzer.close()
