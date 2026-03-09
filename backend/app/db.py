from __future__ import annotations

from datetime import datetime
from pathlib import Path
import json
import sqlite3


DB_PATH = Path(__file__).resolve().parents[2] / "database" / "soc.db"


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _has_column(conn: sqlite3.Connection, table: str, column: str) -> bool:
    cur = conn.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cur.fetchall()]
    return column in cols


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                src_ip TEXT NOT NULL,
                attack_type TEXT NOT NULL,
                confidence REAL NOT NULL,
                anomaly_score REAL NOT NULL,
                risk_score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                explanation TEXT NOT NULL,
                recommended_actions TEXT NOT NULL,
                created_at TEXT NOT NULL,
                event_key TEXT
            )
            """
        )
        if not _has_column(conn, "alerts", "event_key"):
            conn.execute("ALTER TABLE alerts ADD COLUMN event_key TEXT")
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_event_key
            ON alerts(event_key)
            WHERE event_key IS NOT NULL
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ingestion_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_row INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO ingestion_state (id, last_row, updated_at)
            VALUES (1, 0, ?)
            """,
            (datetime.utcnow().isoformat(),),
        )
        conn.commit()


def insert_alert(payload: dict) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO alerts (
                src_ip, attack_type, confidence, anomaly_score, risk_score,
                risk_level, explanation, recommended_actions, created_at, event_key
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["src_ip"],
                payload["attack_type"],
                payload["confidence"],
                payload["anomaly_score"],
                payload["risk_score"],
                payload["risk_level"],
                payload["explanation"],
                json.dumps(payload["recommended_actions"]),
                payload["created_at"].isoformat(),
                payload.get("event_key"),
            ),
        )
        conn.commit()
        return int(cur.lastrowid or 0)


def fetch_alerts(limit: int = 50) -> list[dict]:
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT * FROM alerts ORDER BY datetime(created_at) DESC LIMIT ?",
            (limit,),
        )
        rows = cur.fetchall()
    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "src_ip": r["src_ip"],
                "attack_type": r["attack_type"],
                "confidence": r["confidence"],
                "anomaly_score": r["anomaly_score"],
                "risk_score": r["risk_score"],
                "risk_level": r["risk_level"],
                "explanation": r["explanation"],
                "recommended_actions": json.loads(r["recommended_actions"]),
                "created_at": datetime.fromisoformat(r["created_at"]),
            }
        )
    return out


def fetch_alert(alert_id: int) -> dict | None:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        r = cur.fetchone()
    if not r:
        return None
    return {
        "id": r["id"],
        "src_ip": r["src_ip"],
        "attack_type": r["attack_type"],
        "confidence": r["confidence"],
        "anomaly_score": r["anomaly_score"],
        "risk_score": r["risk_score"],
        "risk_level": r["risk_level"],
        "explanation": r["explanation"],
        "recommended_actions": json.loads(r["recommended_actions"]),
        "created_at": datetime.fromisoformat(r["created_at"]),
    }


def fetch_threat_stats() -> list[dict]:
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT attack_type, COUNT(*) AS count, AVG(risk_score) AS avg_risk
            FROM alerts
            GROUP BY attack_type
            ORDER BY count DESC
            """
        )
        rows = cur.fetchall()

    return [
        {"attack_type": r["attack_type"], "count": r["count"], "avg_risk": round(r["avg_risk"] or 0, 2)}
        for r in rows
    ]


def get_ingestion_row() -> int:
    with get_conn() as conn:
        cur = conn.execute("SELECT last_row FROM ingestion_state WHERE id = 1")
        row = cur.fetchone()
    if not row:
        return 0
    return int(row["last_row"])


def set_ingestion_row(last_row: int) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE ingestion_state
            SET last_row = ?, updated_at = ?
            WHERE id = 1
            """,
            (int(last_row), datetime.utcnow().isoformat()),
        )
        conn.commit()
