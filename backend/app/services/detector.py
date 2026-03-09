from __future__ import annotations

from pathlib import Path
import math
import joblib
import numpy as np
import pandas as pd


FEATURES = [
    "failed_logins",
    "req_per_sec",
    "dst_ports_count",
    "bytes_sent",
    "hour_of_day",
]


class ThreatDetector:
    def __init__(self) -> None:
        root = Path(__file__).resolve().parents[3]
        artifacts = root / "ai_models" / "artifacts"
        self.scaler = None
        self.anomaly_model = None
        self.classifier = None
        self.label_encoder = None

        try:
            self.scaler = joblib.load(artifacts / "scaler.pkl")
            self.anomaly_model = joblib.load(artifacts / "anomaly_model.pkl")
            self.classifier = joblib.load(artifacts / "classifier_model.pkl")
            self.label_encoder = joblib.load(artifacts / "label_encoder.pkl")
        except Exception:
            pass

    def _fallback_predict(self, sample: dict) -> tuple[float, str, float]:
        failed = sample["failed_logins"]
        rps = sample["req_per_sec"]
        ports = sample["dst_ports_count"]
        bytes_sent = sample["bytes_sent"]

        attack = "normal"
        conf = 0.55

        if failed > 30:
            attack, conf = "brute_force", 0.87
        elif rps > 250 or bytes_sent > 800_000:
            attack, conf = "ddos", 0.91
        elif ports > 30:
            attack, conf = "port_scan", 0.85
        elif failed > 8 and rps > 25:
            attack, conf = "suspicious_login", 0.73

        anomaly = -0.9 if attack != "normal" else 0.5
        return anomaly, attack, conf

    def _safe_confidence(self, value: float, attack_type: str) -> float:
        if isinstance(value, (int, float)) and math.isfinite(float(value)):
            return max(0.0, min(1.0, float(value)))
        return 0.8 if attack_type != "normal" else 0.55

    def predict(self, sample: dict) -> tuple[float, str, float]:
        if not (self.scaler and self.anomaly_model and self.classifier and self.label_encoder):
            return self._fallback_predict(sample)

        frame = pd.DataFrame([{k: sample[k] for k in FEATURES}], columns=FEATURES)
        scaled = self.scaler.transform(frame)

        anomaly_score = float(self.anomaly_model.decision_function(scaled)[0])
        y = int(self.classifier.predict(frame)[0])
        probs = self.classifier.predict_proba(frame)[0]
        attack_type = str(self.label_encoder.inverse_transform([y])[0])
        confidence = self._safe_confidence(float(np.max(probs)), attack_type)

        return anomaly_score, attack_type, confidence
