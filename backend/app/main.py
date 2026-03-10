from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ..investigation_engine import build_investigation_report
from ..response_engine import list_responses, process_response
from ..routes_map import router as map_router
from .db import fetch_alert, fetch_alerts, fetch_threat_stats, init_db, insert_alert
from .schemas import DetectRequest, DetectResponse
from .services.detector import ThreatDetector
from .services.explain_engine import explain
from .services.ingestion import LogIngestionWorker
from .services.mitigation_engine import recommend
from .services.risk_engine import compute_risk_score


app = FastAPI(title="SentinelAI - Autonomous Cyber Defense Platform", version="0.1.0")
detector = ThreatDetector()
ingestion_worker = LogIngestionWorker(detector=detector)
ingestion_task: asyncio.Task | None = None
frontend_dir = Path(__file__).resolve().parents[2] / "frontend"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")
app.include_router(map_router)


@app.on_event("startup")
async def on_startup() -> None:
    global ingestion_task
    init_db()
    ingestion_task = asyncio.create_task(ingestion_worker.run())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global ingestion_task
    if ingestion_task is not None:
        ingestion_task.cancel()
        try:
            await ingestion_task
        except asyncio.CancelledError:
            pass
        ingestion_task = None


@app.get("/")
def root() -> dict:
    return {"service": "SentinelAI - Autonomous Cyber Defense Platform", "status": "running"}


@app.get("/dashboard")
def dashboard() -> FileResponse:
    return FileResponse(frontend_dir / "index.html")


@app.post("/detect", response_model=DetectResponse)
def detect(payload: DetectRequest) -> DetectResponse:
    sample = payload.model_dump()
    if sample["hour_of_day"] is None:
        sample["hour_of_day"] = datetime.utcnow().hour

    anomaly_score, attack_type, confidence = detector.predict(sample)
    threat_detected = attack_type != "normal" or anomaly_score < 0
    frequency_estimate = max(1, int(sample["req_per_sec"] // 10))
    risk_score, risk_level = compute_risk_score(
        attack_type=attack_type,
        confidence=confidence,
        anomaly_score=anomaly_score,
        frequency=frequency_estimate,
    )
    explanation = explain(attack_type, sample)
    actions = recommend(attack_type)
    created_at = datetime.utcnow()

    alert_payload = {
        "src_ip": sample["src_ip"],
        "attack_type": attack_type,
        "confidence": round(confidence, 4),
        "anomaly_score": round(anomaly_score, 4),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "explanation": explanation,
        "recommended_actions": actions,
        "created_at": created_at,
    }

    if threat_detected:
        alert_id = insert_alert(alert_payload)
        if alert_id:
            process_response({**alert_payload, "id": alert_id})

    return DetectResponse(
        threat_detected=threat_detected,
        attack_type=attack_type,
        confidence=round(confidence, 4),
        risk_score=risk_score,
        risk_level=risk_level,
        explanation=explanation,
        recommended_actions=actions,
        created_at=created_at,
    )


@app.get("/alerts")
def alerts(limit: int = 50) -> dict:
    return {"items": fetch_alerts(limit=limit)}


@app.get("/risk-score/{alert_id}")
def risk_score(alert_id: int) -> dict:
    alert = fetch_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "alert_id": alert["id"],
        "risk_score": alert["risk_score"],
        "risk_level": alert["risk_level"],
        "attack_type": alert["attack_type"],
    }


@app.get("/threats")
def threats() -> dict:
    return {"items": fetch_threat_stats()}


@app.get("/investigation/{alert_id}")
def investigation(alert_id: int) -> dict:
    alert = fetch_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return build_investigation_report(alert)


@app.get("/responses")
def responses(limit: int = 100) -> dict:
    return {"items": list_responses(limit=limit)}
