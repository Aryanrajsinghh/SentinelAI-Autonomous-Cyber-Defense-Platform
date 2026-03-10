from __future__ import annotations

from .app.db import fetch_blocked_ip
from .routes_map import resolver


def build_investigation_report(alert: dict) -> dict:
    location = resolver.resolve(alert["src_ip"])
    attack_type = alert["attack_type"]
    sample_analysis = {
        "brute_force": [
            "Repeated authentication failures indicate a credential guessing pattern.",
            "The activity window suggests automated login attempts rather than manual user behavior.",
            "Likely objective: credential compromise and lateral access to privileged accounts.",
        ],
        "ddos": [
            "Request volume and network throughput indicate service saturation behavior.",
            "The traffic pattern is consistent with disruption or availability degradation attempts.",
            "Likely objective: deny service to internet-facing applications.",
        ],
        "port_scan": [
            "Broad destination port targeting suggests reconnaissance and exposure mapping.",
            "The attacker is likely identifying reachable services before exploitation.",
            "Likely objective: enumerate open ports and vulnerable services.",
        ],
        "suspicious_login": [
            "Authentication behavior deviates from baseline with elevated failures and request rate.",
            "The activity may indicate account takeover attempts or abnormal remote access.",
            "Likely objective: establish foothold using valid or partially valid credentials.",
        ],
    }
    actions = {
        "brute_force": ["Block IP", "Enable MFA", "Enable rate limiting", "Monitor login activity"],
        "ddos": ["Block IP", "Rate limit edge traffic", "Scale edge protections", "Review WAF rules"],
        "port_scan": ["Block IP", "Harden exposed services", "Tighten firewall rules", "Monitor follow-on probes"],
        "suspicious_login": ["Block IP", "Force password reset", "Enable MFA", "Review account activity"],
    }
    response_status = fetch_blocked_ip(alert["src_ip"])
    summary = {
        "attack_type": attack_type.replace("_", " ").title(),
        "source_ip": alert["src_ip"],
        "country": location.country,
        "risk_score": alert["risk_score"],
        "timestamp": alert["created_at"],
    }
    details = {
        "brute_force": f"{max(10, int(alert['risk_score'] * 0.6))} login attempts detected in a compressed interval targeting privileged access paths.",
        "ddos": f"Network activity shows sustained request pressure with a risk score of {alert['risk_score']} against protected services.",
        "port_scan": f"Sequential probing behavior indicates broad service discovery from {location.country}.",
        "suspicious_login": f"Authentication anomalies suggest abnormal account access patterns from {location.country}.",
    }
    return {
        "alert_id": alert["id"],
        "attack_type": summary["attack_type"],
        "source_ip": alert["src_ip"],
        "country": location.country,
        "risk_score": alert["risk_score"],
        "summary": {
            **summary,
            "details": details.get(attack_type, alert["explanation"]),
        },
        "analysis": sample_analysis.get(attack_type, [alert["explanation"]]),
        "recommended_actions": actions.get(attack_type, alert["recommended_actions"]),
        "response_status": {
            "blocked": response_status is not None,
            "reason": response_status["reason"] if response_status else "No automated response executed.",
            "timestamp": response_status["timestamp"] if response_status else None,
        },
    }
