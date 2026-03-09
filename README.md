# SentinelAI - Autonomous Cyber Defense Platform

Beginner-friendly mini SOC project that:

- Collects/simulates security logs
- Detects suspicious behavior with anomaly detection
- Classifies likely attack type
- Calculates risk score
- Provides explanation + mitigation recommendations
- Exposes everything via FastAPI and a simple frontend dashboard

## 1) Setup

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Generate training data

```powershell
python .\log_collector\simulate_logs.py
```

## 3) Train models

```powershell
python .\ai_models\train_anomaly.py
python .\ai_models\train_classifier.py
```

## 4) Initialize database (optional, also done automatically on startup)

```powershell
python .\database\init_db.py
```

## 5) Run API

```powershell
uvicorn backend.app.main:app --reload
```

Open:

- API docs: http://127.0.0.1:8000/docs
- Dashboard file: `frontend/index.html` (open directly in browser)

## 6) Test `/detect` quickly

Send in `/docs` or curl:

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

- `POST /detect`
- `GET /alerts`
- `GET /risk-score/{alert_id}`
- `GET /threats`

## Notes

- If model artifacts are missing, backend falls back to heuristic detection.
- SQLite DB file is created at `database/soc.db`.
