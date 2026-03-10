from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path
import hashlib

import pandas as pd

from ...response_engine import process_response
from ..db import get_ingestion_row, insert_alert, set_ingestion_row
from .detector import ThreatDetector
from .explain_engine import explain
from .mitigation_engine import recommend
from .risk_engine import compute_risk_score


class LogIngestionWorker:
    def __init__(self, detector: ThreatDetector, poll_seconds: int = 2, batch_size: int = 8) -> None:
        self.detector = detector
        self.poll_seconds = poll_seconds
        self.batch_size = batch_size
        self.data_path = Path(__file__).resolve().parents[3] / "log_collector" / "generated" / "security_logs.csv"

    def _build_event_key(self, row: pd.Series, idx: int) -> str:
        raw = "|".join(
            [
                str(idx),
                str(row.get("timestamp", "")),
                str(row.get("src_ip", "")),
                str(row.get("failed_logins", "")),
                str(row.get("req_per_sec", "")),
                str(row.get("dst_ports_count", "")),
                str(row.get("bytes_sent", "")),
                str(row.get("hour_of_day", "")),
            ]
        )
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    async def run(self) -> None:
        while True:
            try:
                self.process_once()
            except Exception:
                pass
            await asyncio.sleep(self.poll_seconds)

    def process_once(self) -> None:
        if not self.data_path.exists():
            return

        df = pd.read_csv(self.data_path)
        total_rows = len(df)
        if total_rows == 0:
            return

        last_row = get_ingestion_row()
        if last_row > total_rows:
            last_row = 0
            set_ingestion_row(0)

        start = last_row
        end = min(last_row + self.batch_size, total_rows)

        for idx in range(start, end):
            row = df.iloc[idx]
            sample = {
                "src_ip": str(row.get("src_ip", "0.0.0.0")),
                "failed_logins": int(row.get("failed_logins", 0)),
                "req_per_sec": float(row.get("req_per_sec", 0.0)),
                "dst_ports_count": int(row.get("dst_ports_count", 0)),
                "bytes_sent": int(row.get("bytes_sent", 0)),
                "hour_of_day": int(row.get("hour_of_day", datetime.utcnow().hour)),
            }

            anomaly_score, attack_type, confidence = self.detector.predict(sample)
            threat_detected = attack_type != "normal" or anomaly_score < 0
            if not threat_detected:
                continue

            frequency_estimate = max(1, int(sample["req_per_sec"] // 10))
            risk_score, risk_level = compute_risk_score(
                attack_type=attack_type,
                confidence=confidence,
                anomaly_score=anomaly_score,
                frequency=frequency_estimate,
            )

            alert_payload = {
                "src_ip": sample["src_ip"],
                "attack_type": attack_type,
                "confidence": round(confidence, 4),
                "anomaly_score": round(anomaly_score, 4),
                "risk_score": risk_score,
                "risk_level": risk_level,
                "explanation": explain(attack_type, sample),
                "recommended_actions": recommend(attack_type),
                "created_at": datetime.utcnow(),
                "event_key": self._build_event_key(row, idx),
            }
            alert_id = insert_alert(alert_payload)
            if alert_id:
                process_response({**alert_payload, "id": alert_id})

        if end > start:
            set_ingestion_row(end)
