import os
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


class PoseAnalyzer:
    """Runs pose landmarking + exercise detection on individual video frames.

    One instance per workout session: the underlying landmarker runs in VIDEO
    mode and the detectors keep cumulative rep state.
    """

    FRAME_INTERVAL_MS = 30
    MIN_VISIBILITY = 0.7

    def __init__(self, exercise_type="Squats"):
        model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "ml_models",
            "pose_landmarker_full.task",
        )

        options = vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=model_path),
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
        self._frame_timestamp_ms = 0

    def set_exercise(self, exercise_type):
        if exercise_type != self._exercise_type and exercise_type in self._detectors:
            self._exercise_type = exercise_type
            self._detectors[exercise_type].reset()

    def close(self):
        self._landmarker.close()

    def process_frame(self, image_bgr):
        """Analyze one BGR frame. Returns (annotated_bgr, metrics dict)."""
        image = np.ascontiguousarray(cv2.flip(image_bgr, 1))

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB),
        )

        self._frame_timestamp_ms += self.FRAME_INTERVAL_MS
        result = self._landmarker.detect_for_video(mp_image, self._frame_timestamp_ms)

        if not result.pose_landmarks:
            self._draw_no_pose_warning(image)
            return image, {"pose_detected": False}

        landmarks = result.pose_landmarks[0]
        self._draw_skeleton(image, landmarks)

        detector = self._detectors.get(self._exercise_type)

        if detector is None:
            return image, {"pose_detected": False}

        metrics = detector.process(landmarks)
        metrics["pose_detected"] = True

        self._draw_status_bar(image, metrics)

        return image, metrics

    def _draw_skeleton(self, img, landmarks):
        h, w = img.shape[:2]

        for start_idx, end_idx in POSE_CONNECTIONS:
            p1, p2 = landmarks[start_idx], landmarks[end_idx]

            if p1.visibility > self.MIN_VISIBILITY and p2.visibility > self.MIN_VISIBILITY:
                cv2.line(
                    img,
                    (int(p1.x * w), int(p1.y * h)),
                    (int(p2.x * w), int(p2.y * h)),
                    _GREEN,
                    8,
                )

        for lm in landmarks:
            if lm.visibility > self.MIN_VISIBILITY:
                cv2.circle(img, (int(lm.x * w), int(lm.y * h)), 8, _BLUE, -1)

    def _draw_no_pose_warning(self, img):
        for i, text in enumerate(("NO POSE DETECTED", "PLEASE FACE THE CAMERA")):
            cv2.putText(
                img,
                text,
                (30, 50 * (i + 1)),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                _GREEN,
                2,
                cv2.LINE_AA,
            )

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

        cv2.putText(
            img,
            build_line(metrics),
            (20, h - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            _GREEN,
            2,
        )
