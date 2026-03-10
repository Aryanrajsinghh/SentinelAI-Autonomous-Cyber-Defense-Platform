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


class AttackMapItem(BaseModel):
    id: int
    ip: str
    attack_type: str
    risk_score: int
    timestamp: datetime
    country: str
    lat: float
    lon: float
    confidence: float


class InvestigationResponse(BaseModel):
    alert_id: int
    attack_type: str
    source_ip: str
    country: str
    risk_score: int
    summary: dict
    analysis: list[str]
    recommended_actions: list[str]
    response_status: dict


class ResponseActionItem(BaseModel):
    id: int
    ip: str
    reason: str
    timestamp: datetime | str


class SecurityChatRequest(BaseModel):
    question: str = Field(min_length=1)


class SecurityChatResponse(BaseModel):
    answer: str
    timestamp: datetime
