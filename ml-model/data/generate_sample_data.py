"""Generate synthetic pollen datasets for offline operation.

This script refreshes two artifacts used by the ML service:

1. ``sample_regions.json`` — the latest per-region snapshot consumed by
   :class:`RealtimeDataClient` when serving "current" values.
2. ``historical_samples.json`` — multi-day sequences leveraged during model
   training so the LSTM can learn temporal patterns.

Both datasets are derived from deterministic seasonal patterns with small
stochastic noise to make the numbers look realistic while remaining
reproducible between runs.
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from .realtime_client import REGION_SOURCES, RealtimeDataClient


random.seed(42)


@dataclass
class StaticSample:
    pollen_count: float
    timestamp: str


def _static_samples_dir() -> Path:
    return RealtimeDataClient.STATIC_POLLEN_DIR


def _load_static_samples() -> Dict[str, StaticSample]:
    directory = _static_samples_dir()
    samples: Dict[str, StaticSample] = {}

    for path in directory.glob("*.json"):
        station = path.stem
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        samples[station] = StaticSample(
            pollen_count=float(payload.get("pollenCount", 30.0)),
            timestamp=str(payload.get("timestamp"))
        )

    return samples


def _seasonal_components(
    day_of_year: int,
    region_offset: int
) -> Tuple[float, float]:
    annual = math.sin(
        2 * math.pi * (day_of_year / 365.0) + region_offset * 0.5
    )
    weekly = math.sin(2 * math.pi * (day_of_year / 7.0))
    return annual, weekly


def _generate_weather(day: datetime, region_offset: int) -> Dict[str, float]:
    day_of_year = day.timetuple().tm_yday
    annual, weekly = _seasonal_components(day_of_year, region_offset)

    temperature = 15 + 8 * annual + random.uniform(-2.5, 2.5)
    humidity = 55 - 10 * annual + 5 * weekly + random.uniform(-5, 5)
    wind_speed = max(0.2, 2.5 + 1.2 * weekly + random.uniform(-1.0, 1.0))
    wind_direction = (region_offset * 45 + (day_of_year * 11) % 360) % 360
    rainfall = max(0.0, random.gauss(0.6 - 0.4 * annual, 1.2))
    if rainfall < 0.8:
        rainfall = 0.0

    return {
        "temperature": round(temperature, 1),
        "humidity": round(max(30.0, min(90.0, humidity)), 1),
        "wind_speed": round(wind_speed, 1),
        "wind_direction": float(round(wind_direction, 1)),
        "rainfall": round(rainfall, 1),
    }


def _generate_historical_series(days: int = 120) -> List[Dict[str, float]]:
    static_samples = _load_static_samples()
    today = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)

    historical: List[Dict[str, float]] = []

    for region_index, source in enumerate(REGION_SOURCES.values()):
        base_sample = static_samples.get(source.pollen_station)
        base = base_sample.pollen_count if base_sample else 35.0

        for offset in range(days):
            day = today - timedelta(days=days - offset)
            day_of_year = day.timetuple().tm_yday
            annual, weekly = _seasonal_components(day_of_year, region_index)

            seasonal = base * (1.0 + 0.55 * annual + 0.18 * weekly)
            drift = 0.065 * (offset - days / 2)
            intra_week = 4.0 * math.sin((offset / 3.5) + region_index * 0.6)
            noise = random.uniform(-9.0, 9.0)

            pollen = seasonal + drift + intra_week + noise
            pollen = max(5.0, min(120.0, pollen))

            weather = _generate_weather(day, region_index)

            record = {
                "region": source.name,
                "region_id": source.id,
                "prefecture": source.prefecture,
                "date": day.strftime("%Y-%m-%d"),
                "pollen_count": round(pollen, 2),
                **weather,
            }

            historical.append(record)

    historical.sort(key=lambda item: (item["region_id"], item["date"]))
    return historical


def _latest_snapshot(
    historical: Iterable[Dict[str, float]]
) -> List[Dict[str, float]]:
    latest: Dict[str, Dict[str, float]] = {}
    for item in historical:
        latest[item["region_id"]] = item

    snapshot: List[Dict[str, float]] = []
    for source in REGION_SOURCES.values():
        data = latest[source.id]
        snapshot.append(
            {
                "region": data["region"],
                "region_id": data["region_id"],
                "prefecture": data["prefecture"],
                "latitude": source.latitude,
                "longitude": source.longitude,
                "pollen_count": data["pollen_count"],
                "pollen_level": _classify_level(data["pollen_count"]),
                "temperature": data["temperature"],
                "humidity": data["humidity"],
                "wind_speed": data["wind_speed"],
                "wind_direction": data["wind_direction"],
                "rainfall": data["rainfall"],
                "timestamp": f"{data['date']}T09:00:00+09:00",
            }
        )

    return snapshot


def _classify_level(value: float) -> str:
    if value < 25:
        return "low"
    if value < 50:
        return "moderate"
    if value < 75:
        return "high"
    return "very_high"


def _write_json(path: Path, payload: List[Dict[str, float]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def main() -> None:
    client = RealtimeDataClient()

    historical = _generate_historical_series(days=140)
    snapshot = _latest_snapshot(historical)

    _write_json(client.sample_file, snapshot)
    historical_path = (
        client.SAMPLE_DATA_FILE.parent / "historical_samples.json"
    )
    _write_json(historical_path, historical)

    print(f"✓ Wrote {len(snapshot)} current samples to {client.sample_file}")
    print(f"✓ Wrote {len(historical)} historical rows to {historical_path}")


if __name__ == "__main__":
    main()
