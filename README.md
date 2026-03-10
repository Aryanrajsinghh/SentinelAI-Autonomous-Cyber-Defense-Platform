# SentinelAI

<p align="center">
  <strong>Autonomous Cyber Defense Platform</strong><br/>
  A beginner-friendly mini SOC project for simulating, detecting, scoring, and investigating cyber threats.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Backend-0f766e?style=for-the-badge" alt="FastAPI Backend" />
  <img src="https://img.shields.io/badge/ML-Anomaly%20Detection-c2410c?style=for-the-badge" alt="ML Anomaly Detection" />
  <img src="https://img.shields.io/badge/SQLite-Alert%20Storage-1d4ed8?style=for-the-badge" alt="SQLite Alert Storage" />
  <img src="https://img.shields.io/badge/Dashboard-Live%20SOC-111827?style=for-the-badge" alt="Live SOC Dashboard" />
</p>

## Overview

SentinelAI is a compact Security Operations Center project built for learning and demos. It simulates security telemetry, detects suspicious activity with machine learning or heuristics, classifies likely attack types, calculates risk, stores alerts, and presents the results through a FastAPI backend and an interactive dashboard.

## What It Does

- Simulates network and login security events
- Detects anomalies from incoming telemetry
- Classifies likely attacks such as `brute_force`, `ddos`, and `port_scan`
- Calculates a risk score and risk level for each alert
- Generates plain-English explanations and mitigation recommendations
- Stores alerts in SQLite for later review
- Exposes analyst-friendly API endpoints for alerts, threats, investigations, and responses
- Serves a dashboard with maps, charts, timeline replay, and investigation views

## Project Structure

```text
New project/
|-- SentinelAI-Autonomous-Cyber-Defense-Platform/
|   |-- backend/
|   |-- ai_models/
|   |-- log_collector/
|   |-- database/
|   |-- frontend/
|   |-- requirements.txt
|   `-- README.md
`-- README.md
```

## Tech Stack

- Backend: FastAPI
- ML/Data: scikit-learn, pandas, numpy, joblib, torch
- Database: SQLite
- Frontend: HTML, CSS, JavaScript, Chart.js, Leaflet

## Quick Start

From the repository root:

```powershell
cd .\SentinelAI-Autonomous-Cyber-Defense-Platform\
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Run The Pipeline

### 1. Generate training data

```powershell
python .\log_collector\simulate_logs.py
```

### 2. Train the models

```powershell
python .\ai_models\train_anomaly.py
python .\ai_models\train_classifier.py
```

### 3. Initialize the database

```powershell
python .\database\init_db.py
```

### 4. Start the API

```powershell
uvicorn backend.app.main:app --reload
```

## Open The App

- API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Live dashboard: [http://127.0.0.1:8000/dashboard](http://127.0.0.1:8000/dashboard)
- Static frontend file: `frontend/index.html`

## Example Detection Payload

```json
{
  "src_ip": "45.12.92.101",
  "failed_logins": 120,
  "req_per_sec": 75,
  "dst_ports_count": 2,
  "bytes_sent": 22000
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/detect` | Analyze an event and generate a threat decision |
| `GET` | `/alerts` | Fetch recent alerts |
| `GET` | `/risk-score/{alert_id}` | Return risk details for an alert |
| `GET` | `/threats` | Aggregate threat statistics |
| `GET` | `/investigation/{alert_id}` | Build an investigation report |
| `GET` | `/responses` | Show autonomous response activity |
| `GET` | `/dashboard` | Open the SOC dashboard |

## Detection Flow

```text
Simulated Logs / Incoming Event
            |
            v
   Threat Detection Engine
   - anomaly model
   - classifier
   - heuristic fallback
            |
            v
  Risk Score + Risk Level
            |
            v
 Explanation + Mitigation
            |
            v
 SQLite Alerts + Dashboard + API
```

## Notes

- If model artifacts are missing, SentinelAI falls back to rule-based detection.
- The SQLite database is created at `database/soc.db`.
- The backend starts a background ingestion worker on startup.
- The current repository layout keeps the app inside the `SentinelAI-Autonomous-Cyber-Defense-Platform` folder.

## Why This Project

This project is designed to be small enough for beginners to understand, but rich enough to demonstrate how SOC-style systems connect data collection, detection logic, risk analysis, investigation support, and analyst-facing visualization in one place.
