from __future__ import annotations


MITIGATION_MAP = {
    "brute_force": [
        "Block source IP address",
        "Enable account lockout and rate limiting",
        "Force password reset for targeted account(s)",
    ],
    "ddos": [
        "Apply upstream rate limiting",
        "Enable WAF/CDN DDoS protection profile",
        "Temporarily block abusive IP ranges",
    ],
    "port_scan": [
        "Block scanning source IP",
        "Close or filter unused ports",
        "Harden firewall and IDS rules",
    ],
    "suspicious_login": [
        "Require MFA challenge",
        "Verify account access history",
        "Increase authentication monitoring sensitivity",
    ],
    "normal": [
        "No immediate action required",
        "Continue monitoring",
    ],
}


def recommend(attack_type: str) -> list[str]:
    return MITIGATION_MAP.get(attack_type, ["Investigate event details", "Continue monitoring"])
