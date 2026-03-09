from __future__ import annotations


def explain(attack_type: str, sample: dict) -> str:
    if attack_type == "brute_force":
        return (
            f"High failed login volume ({sample['failed_logins']}) in a short interval "
            "matches brute-force credential guessing behavior."
        )
    if attack_type == "ddos":
        return (
            f"Traffic spike detected ({sample['req_per_sec']:.2f} req/s, {sample['bytes_sent']} bytes sent), "
            "which is consistent with possible DDoS activity."
        )
    if attack_type == "port_scan":
        return (
            f"Unusually high number of destination ports targeted ({sample['dst_ports_count']}) "
            "suggests reconnaissance or port scanning."
        )
    if attack_type == "suspicious_login":
        return (
            "Login behavior deviates from normal baseline with elevated failures and request rate, "
            "indicating suspicious authentication activity."
        )
    return "Current behavior is within normal baseline thresholds."
