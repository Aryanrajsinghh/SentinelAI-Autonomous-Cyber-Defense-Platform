from __future__ import annotations


SEVERITY_MAP = {
    "normal": 10,
    "suspicious_login": 65,
    "port_scan": 60,
    "brute_force": 75,
    "ddos": 92,
}


def to_level(score: int) -> str:
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def compute_risk_score(attack_type: str, confidence: float, anomaly_score: float, frequency: int = 1) -> tuple[int, str]:
    severity = SEVERITY_MAP.get(attack_type, 50)
    frequency_score = min(100, frequency * 8)
    anomaly_component = min(100, max(0, int((1 - anomaly_score) * 50)))
    confidence_component = int(confidence * 100)
    behavior = min(100, int((anomaly_component * 0.6) + (confidence_component * 0.4)))

    risk = int(min(100, 0.35 * frequency_score + 0.40 * severity + 0.25 * behavior))
    return risk, to_level(risk)
