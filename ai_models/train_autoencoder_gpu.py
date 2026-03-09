from __future__ import annotations

from pathlib import Path

import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import StandardScaler
import joblib


FEATURES = [
    "failed_logins",
    "req_per_sec",
    "dst_ports_count",
    "bytes_sent",
    "hour_of_day",
]


class Autoencoder(nn.Module):
    def __init__(self, in_dim: int) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(in_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, in_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        z = self.encoder(x)
        return self.decoder(z)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    data_path = root / "log_collector" / "generated" / "security_logs.csv"
    artifacts = Path(__file__).parent / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path)
    X = df[FEATURES].copy()

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    joblib.dump(scaler, artifacts / "scaler_gpu.pkl")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training device: {device}")

    x_tensor = torch.tensor(Xs, dtype=torch.float32)
    ds = TensorDataset(x_tensor)
    dl = DataLoader(ds, batch_size=128, shuffle=True)

    model = Autoencoder(in_dim=len(FEATURES)).to(device)
    optim = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()

    epochs = 20
    model.train()
    for epoch in range(1, epochs + 1):
        total = 0.0
        for (batch,) in dl:
            batch = batch.to(device)
            recon = model(batch)
            loss = loss_fn(recon, batch)

            optim.zero_grad()
            loss.backward()
            optim.step()
            total += loss.item()

        print(f"epoch={epoch:02d} loss={total/len(dl):.6f}")

    torch.save(model.state_dict(), artifacts / "autoencoder_gpu.pt")
    print("Saved GPU autoencoder model artifacts.")


if __name__ == "__main__":
    main()
