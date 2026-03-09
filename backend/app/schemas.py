from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class DetectRequest(BaseModel):
    src_ip: str = Field(default="0.0.0.0")
    failed_logins: int
    req_per_sec: float
    dst_ports_count: int
    bytes_sent: int
    hour_of_day: int | None = None


class DetectResponse(BaseModel):
    threat_detected: bool
    attack_type: str
    confidence: float
    risk_score: int
    risk_level: str
    explanation: str
    recommended_actions: list[str]
    created_at: datetime


class AlertItem(BaseModel):
    id: int
    src_ip: str
    attack_type: str
    confidence: float
    anomaly_score: float
    risk_score: int
    risk_level: str
    explanation: str
    recommended_actions: list[str]
    created_at: datetime
