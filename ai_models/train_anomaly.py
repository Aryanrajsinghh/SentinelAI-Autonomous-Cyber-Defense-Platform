from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


FEATURES = [
    "failed_logins",
    "req_per_sec",
    "dst_ports_count",
    "bytes_sent",
    "hour_of_day",
]


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    data_path = root / "log_collector" / "generated" / "security_logs.csv"
    artifacts = Path(__file__).parent / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path)
    X = df[FEATURES].copy()

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.15,
        random_state=42,
    )
    model.fit(Xs)

    joblib.dump(scaler, artifacts / "scaler.pkl")
    joblib.dump(model, artifacts / "anomaly_model.pkl")
    print("Saved anomaly model artifacts.")


if __name__ == "__main__":
    main()
