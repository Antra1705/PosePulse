import time
from services.persistence.exercise_repository import add_exercise


class WorkoutSession:
    """Tracks rep/set progress for one workout and persists completed sets.

    Detectors report a cumulative rep count; this class splits it into sets,
    saves each completed set, and reports which coach events should fire.
    """

    def __init__(self, user_id, exercise, target_sets, reps_per_set):
        self.user_id = user_id
        self.exercise = exercise
        self.target_sets = max(int(target_sets), 0)
        self.reps_per_set = max(int(reps_per_set), 0)

        self.total_reps = 0
        self.sets_completed = 0
        self.workout_complete = False
        self._set_started_at = time.time()

    def update(self, total_reps):
        """Ingest the detector's cumulative rep count.

        Returns the coach event to fire ("set_completed" /
        "workout_completed") or None.
        """
        if self.workout_complete or self.reps_per_set <= 0:
            self.total_reps = total_reps
            return None

        self.total_reps = total_reps
        event = None

        while (
            self.total_reps - self.sets_completed * self.reps_per_set >= self.reps_per_set
            and self.sets_completed < self.target_sets
        ):
            self._save_completed_set()
            self.sets_completed += 1
            event = "set_completed"

        if self.target_sets > 0 and self.sets_completed >= self.target_sets:
            self.workout_complete = True
            event = "workout_completed"

        return event

    @property
    def current_set_reps(self):
        if self.workout_complete:
            return self.reps_per_set

        reps = self.total_reps - self.sets_completed * self.reps_per_set
        return max(0, min(reps, self.reps_per_set))

    def progress(self):
        return {
            "total_reps": self.total_reps,
            "current_set_reps": self.current_set_reps,
            "reps_per_set": self.reps_per_set,
            "sets_completed": self.sets_completed,
            "target_sets": self.target_sets,
            "workout_complete": self.workout_complete,
        }

    def _save_completed_set(self):
        elapsed = int(time.time() - self._set_started_at)

        add_exercise(
            user_id=self.user_id,
            exercise_name=self.exercise,
            reps=self.reps_per_set,
            sets=1,
            time=elapsed,
        )

        self._set_started_at = time.time()
