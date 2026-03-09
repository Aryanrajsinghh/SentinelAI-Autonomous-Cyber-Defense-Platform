from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


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
    y_raw = df["label"].copy()

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=250,
        max_depth=12,
        random_state=42,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    print(classification_report(y_test, preds, target_names=le.classes_))

    joblib.dump(clf, artifacts / "classifier_model.pkl")
    joblib.dump(le, artifacts / "label_encoder.pkl")
    print("Saved classifier artifacts.")


if __name__ == "__main__":
    main()
