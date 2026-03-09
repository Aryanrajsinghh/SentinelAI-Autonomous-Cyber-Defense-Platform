from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
import random
import ipaddress

import pandas as pd


ATTACK_LABELS = ["normal", "brute_force", "ddos", "port_scan", "suspicious_login"]


@dataclass
class Event:
    timestamp: str
    src_ip: str
    failed_logins: int
    req_per_sec: float
    dst_ports_count: int
    bytes_sent: int
    hour_of_day: int
    label: str


def random_ip() -> str:
    first = random.choice([23, 31, 45, 62, 77, 91, 103, 121, 138, 172, 185, 203])
    return str(ipaddress.IPv4Address(f"{first}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"))


def generate_event(ts: datetime, label: str) -> Event:
    if label == "normal":
        failed = random.randint(0, 2)
        rps = random.uniform(1, 25)
        ports = random.randint(1, 5)
        bytes_sent = random.randint(2_000, 50_000)
    elif label == "brute_force":
        failed = random.randint(20, 180)
        rps = random.uniform(20, 80)
        ports = random.randint(1, 3)
        bytes_sent = random.randint(8_000, 90_000)
    elif label == "ddos":
        failed = random.randint(0, 5)
        rps = random.uniform(200, 1200)
        ports = random.randint(2, 20)
        bytes_sent = random.randint(100_000, 2_000_000)
    elif label == "port_scan":
        failed = random.randint(0, 4)
        rps = random.uniform(20, 120)
        ports = random.randint(20, 200)
        bytes_sent = random.randint(4_000, 70_000)
    else:
        failed = random.randint(5, 30)
        rps = random.uniform(5, 60)
        ports = random.randint(1, 8)
        bytes_sent = random.randint(3_000, 60_000)

    return Event(
        timestamp=ts.isoformat(),
        src_ip=random_ip(),
        failed_logins=failed,
        req_per_sec=round(rps, 2),
        dst_ports_count=ports,
        bytes_sent=bytes_sent,
        hour_of_day=ts.hour,
        label=label,
    )


def generate_dataset(samples: int = 5000, seed: int = 7) -> pd.DataFrame:
    random.seed(seed)
    now = datetime.utcnow() - timedelta(hours=5)
    weights = [0.68, 0.12, 0.08, 0.08, 0.04]
    rows: list[Event] = []

    for i in range(samples):
        ts = now + timedelta(seconds=i * random.randint(1, 5))
        label = random.choices(ATTACK_LABELS, weights=weights, k=1)[0]
        rows.append(generate_event(ts, label))

    return pd.DataFrame([r.__dict__ for r in rows])


def main() -> None:
    out_dir = Path(__file__).parent / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    df = generate_dataset()
    out_file = out_dir / "security_logs.csv"
    df.to_csv(out_file, index=False)
    print(f"Generated {len(df)} rows at {out_file}")


if __name__ == "__main__":
    main()
