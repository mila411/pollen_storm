import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

logger = logging.getLogger(__name__)


@dataclass
class RegionSource:
    id: str
    name: str
    prefecture: str
    latitude: float
    longitude: float
    amedas_station: str
    forecast_city: str
    pollen_station: str
    city_code: Optional[str] = None


PREFECTURE_DATA_PATH = (
    Path(__file__).resolve().parents[2] / "shared" / "prefectures.json"
)

_DEFAULT_REGION_ITEMS = [
    {
        "id": "tokyo",
        "name": "東京",
        "prefecture": "東京都",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "amedasStation": "44132",
        "forecastCity": "130010",
        "pollenStation": "441321000",
        "cityCode": "13101",
    },
    {
        "id": "osaka",
        "name": "大阪",
        "prefecture": "大阪府",
        "latitude": 34.6937,
        "longitude": 135.5023,
        "amedasStation": "62078",
        "forecastCity": "270000",
        "pollenStation": "620780000",
        "cityCode": "27128",
    },
    {
        "id": "kyoto",
        "name": "京都",
        "prefecture": "京都府",
        "latitude": 35.0116,
        "longitude": 135.7681,
        "amedasStation": "61286",
        "forecastCity": "260010",
        "pollenStation": "612860000",
        "cityCode": "26104",
    },
    {
        "id": "nagoya",
        "name": "名古屋",
        "prefecture": "愛知県",
        "latitude": 35.1815,
        "longitude": 136.9066,
        "amedasStation": "51106",
        "forecastCity": "230010",
        "pollenStation": "511060000",
        "cityCode": "23106",
    },
    {
        "id": "fukuoka",
        "name": "福岡",
        "prefecture": "福岡県",
        "latitude": 33.5904,
        "longitude": 130.4017,
        "amedasStation": "82182",
        "forecastCity": "400010",
        "pollenStation": "821820000",
        "cityCode": "40133",
    },
    {
        "id": "sapporo",
        "name": "札幌",
        "prefecture": "北海道",
        "latitude": 43.0642,
        "longitude": 141.3469,
        "amedasStation": "47412",
        "forecastCity": "016000",
        "pollenStation": "474120000",
        "cityCode": "01101",
    },
    {
        "id": "sendai",
        "name": "仙台",
        "prefecture": "宮城県",
        "latitude": 38.2682,
        "longitude": 140.8694,
        "amedasStation": "54202",
        "forecastCity": "040010",
        "pollenStation": "542020000",
        "cityCode": "04101",
    },
    {
        "id": "hiroshima",
        "name": "広島",
        "prefecture": "広島県",
        "latitude": 34.3853,
        "longitude": 132.4553,
        "amedasStation": "67437",
        "forecastCity": "340010",
        "pollenStation": "674370000",
        "cityCode": "34101",
    },
]


def _build_region_sources(
    items: Iterable[Dict[str, Any]]
) -> Dict[str, RegionSource]:
    sources: Dict[str, RegionSource] = {}
    for item in items:
        try:
            source = RegionSource(
                id=item["id"],
                name=item.get("name", item["prefecture"]),
                prefecture=item.get("prefecture", item["name"]),
                latitude=float(item.get("latitude", 0.0)),
                longitude=float(item.get("longitude", 0.0)),
                amedas_station=str(
                    item.get("amedasStation")
                    or item.get("amedas_station")
                    or item["id"]
                ),
                forecast_city=str(
                    item.get("forecastCity")
                    or item.get("forecast_city")
                    or item["id"]
                ),
                pollen_station=str(
                    item.get("pollenStation")
                    or item.get("pollen_station")
                    or item["id"]
                ),
                city_code=(
                    str(item.get("cityCode") or item.get("city_code") or "")
                    or None
                ),
            )
        except KeyError as exc:
            logger.warning("Region entry missing required field: %s", exc)
            continue
        sources[source.id] = source
    return sources


def _load_region_sources() -> Dict[str, RegionSource]:
    use_prefecture_data = os.getenv(
        "POLLEN_USE_PREFECTURE_DATA",
        "false"
    ).lower() in {"1", "true", "yes"}

    if use_prefecture_data:
        if PREFECTURE_DATA_PATH.exists():
            try:
                with PREFECTURE_DATA_PATH.open(
                    "r",
                    encoding="utf-8",
                ) as handle:
                    payload = json.load(handle)
                if isinstance(payload, list) and payload:
                    logger.info(
                        "Loaded %d prefecture regions from %s",
                        len(payload),
                        PREFECTURE_DATA_PATH,
                    )
                    return _build_region_sources(payload)
                logger.warning(
                    "Prefecture data %s was empty or not a list; "
                    "using defaults.",
                    PREFECTURE_DATA_PATH,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to load prefecture data from %s: %s; "
                    "using defaults.",
                    PREFECTURE_DATA_PATH,
                    exc,
                )
        else:
            logger.warning(
                "Prefecture data file %s missing; using default region set.",
                PREFECTURE_DATA_PATH,
            )

    logger.info("Using default region set (5 locations).")
    return _build_region_sources(_DEFAULT_REGION_ITEMS)


REGION_SOURCES: Dict[str, RegionSource] = _load_region_sources()

__all__ = ["RegionSource", "REGION_SOURCES", "_build_region_sources"]
