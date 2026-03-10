from __future__ import annotations

from .app.db import add_blocked_ip, fetch_blocked_ips, fetch_blocked_ip


def process_response(alert: dict) -> dict:
    if alert["risk_score"] < 90:
        return {
            "executed": False,
            "action": "monitor",
            "reason": "Risk score below autonomous response threshold.",
        }

    reason = f"Automatically blocked after {alert['attack_type']} scored {alert['risk_score']}"
    add_blocked_ip(alert["src_ip"], reason)
    blocked = fetch_blocked_ip(alert["src_ip"])
    return {
        "executed": True,
        "action": "block_ip",
        "reason": reason,
        "blocked_ip": blocked,
    }


def list_responses(limit: int = 100) -> list[dict]:
    return fetch_blocked_ips(limit=limit)
