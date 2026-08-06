import random

from services.config.workout_config import PROMPT

_FALLBACK_LINES = {
    "workout_started": [
        "Let's go! Camera is on, show me your best form.",
        "Workout time! Keep your core tight and let's crush this.",
    ],
    "set_completed": [
        "Set done! Shake it out and get ready for the next one.",
        "Great set! Breathe, reset, and go again.",
    ],
    "workout_completed": [
        "Workout complete! Amazing effort today, be proud of yourself.",
        "That's a wrap! You showed up and finished strong.",
    ],
    "ongoing_form_check": [
        "Reset your stance and keep the movement controlled.",
        "Tighten up — quality reps beat sloppy ones every time.",
    ],
}


class LLMCoach:
    """Generates short spoken coaching lines via Groq (PosePulse prompt)."""

    MODEL = "llama-3.3-70b-versatile"

    def __init__(self, groq_client):
        self.client = groq_client
        self.history = []
        self.system_prompt = PROMPT

    def give_feedback(self, event, issue=None):
        prompt = f"Event: {event}"

        if issue:
            prompt += f" Form Issue: {issue}"

        messages = [
            {"role": "system", "content": self.system_prompt},
            *self.history[-10:],
            {"role": "user", "content": prompt},
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=messages,
                temperature=0.4,
            )
            text = (response.choices[0].message.content or "").strip().strip('"')

            if text:
                self.history.append({"role": "assistant", "content": text})
                return text
        except Exception:
            pass

        return self._fallback(event)

    def generate(self, event, exercise, metrics=None):
        """Compatibility helper used by the FastAPI coach event endpoint."""
        issue = None

        if metrics:
            issue = metrics.get("issue")

        return self.give_feedback(event, issue)

    def _fallback(self, event):
        lines = _FALLBACK_LINES.get(event, _FALLBACK_LINES["set_completed"])
        return random.choice(lines)
