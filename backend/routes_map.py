from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import hashlib
import ipaddress
from pathlib import Path

from fastapi import APIRouter

from .app.db import fetch_alerts
from .app.schemas import AttackMapItem

try:
    import geoip2.database
except ImportError:
    geoip2 = None


router = APIRouter(prefix="/api", tags=["attack-map"])


@dataclass(frozen=True)
class GeoPoint:
    country: str
    lat: float
    lon: float


FALLBACK_POINTS = [
    GeoPoint("United States", 37.0902, -95.7129),
    GeoPoint("Russia", 55.7558, 37.6173),
    GeoPoint("China", 39.9042, 116.4074),
    GeoPoint("Brazil", -23.5505, -46.6333),
    GeoPoint("Germany", 52.52, 13.405),
    GeoPoint("United Kingdom", 51.5072, -0.1276),
    GeoPoint("Japan", 35.6762, 139.6503),
    GeoPoint("India", 28.6139, 77.209),
    GeoPoint("Singapore", 1.3521, 103.8198),
    GeoPoint("Australia", -33.8688, 151.2093),
    GeoPoint("Canada", 43.6532, -79.3832),
    GeoPoint("South Africa", -26.2041, 28.0473),
]


class GeoResolver:
    def __init__(self) -> None:
        self.reader = self._load_reader()

    def _load_reader(self):
        if geoip2 is None:
            return None
        db_path = Path(__file__).resolve().parents[1] / "database" / "GeoLite2-City.mmdb"
        if not db_path.exists():
            return None
        try:
            return geoip2.database.Reader(str(db_path))
        except Exception:
            return None

    @lru_cache(maxsize=2048)
    def resolve(self, ip: str) -> GeoPoint:
        try:
            parsed = ipaddress.ip_address(ip)
            if parsed.is_private or parsed.is_loopback or parsed.is_reserved:
                return GeoPoint("Internal Network", 28.6139, 77.209)
        except ValueError:
            return GeoPoint("Unknown", 20.0, 0.0)

        if self.reader is not None:
            try:
                city = self.reader.city(ip)
                country = city.country.name or "Unknown"
                lat = city.location.latitude or 20.0
                lon = city.location.longitude or 0.0
                return GeoPoint(country, float(lat), float(lon))
            except Exception:
                pass

        idx = int(hashlib.sha1(ip.encode("utf-8")).hexdigest(), 16) % len(FALLBACK_POINTS)
        return FALLBACK_POINTS[idx]


resolver = GeoResolver()


def build_attack_items(limit: int = 200) -> list[dict]:
    alerts = fetch_alerts(limit=limit)
    items: list[dict] = []
    for alert in alerts:
        point = resolver.resolve(alert["src_ip"])
        items.append(
            AttackMapItem(
                id=alert["id"],
                ip=alert["src_ip"],
                attack_type=alert["attack_type"].replace("_", " ").title(),
                risk_score=alert["risk_score"],
                timestamp=alert["created_at"],
                country=point.country,
                lat=point.lat,
                lon=point.lon,
                confidence=alert["confidence"],
            ).model_dump(mode="json")
        )
    return items


@router.get("/attacks", response_model=list[AttackMapItem])
def recent_attacks(limit: int = 200) -> list[AttackMapItem]:
    return build_attack_items(limit=limit)
