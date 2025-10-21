from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from .regions import REGION_SOURCES
from .value_parsing import ValueParsingMixin

logger = logging.getLogger(__name__)


if TYPE_CHECKING:
    from .regions import RegionSource


class StaticDataMixin(ValueParsingMixin):
    sample_file: Path
    STATIC_POLLEN_DIR: Path
    DEFAULT_WEATHER: Dict[str, float]
    _sample_cache: Optional[List[Dict[str, Any]]]

    def _load_sample_payloads(self) -> Optional[List[Dict[str, Any]]]:
        if self._sample_cache is not None:
            return self._sample_cache

        if not self.sample_file.exists():
            logger.warning(
                "Sample data file %s not found; falling back to static files.",
                self.sample_file,
            )
            self._sample_cache = None
            return None

        try:
            with self.sample_file.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to read sample data file %s: %s", self.sample_file, exc
            )
            self._sample_cache = None
            return None

        if not isinstance(data, list):
            logger.warning(
                "Sample data file %s payload unexpected; expected list.",
                self.sample_file,
            )
            self._sample_cache = None
            return None

        self._sample_cache = data
        logger.info(
            "Loaded %d records from sample data file %s",
            len(data),
            self.sample_file,
        )
        return data

    def _build_payload_from_static(
        self,
        source: "RegionSource",
        date_ref: Optional[datetime] = None,
    ) -> Optional[Dict[str, Any]]:
        raw = self._load_static_pollen(source.pollen_station)
        count = self._find_numeric(raw) if raw else None
        timestamp = self._find_timestamp(raw) if raw else None

        if count is None:
            count = 25.0
        if timestamp is None:
            reference = date_ref or datetime.now()
            timestamp = reference.isoformat()

        payload = {
            "region": source.name,
            "region_id": source.id,
            "prefecture": source.prefecture,
            "latitude": source.latitude,
            "longitude": source.longitude,
            "pollen_count": float(count),
            "pollen_level": self._classify_level(float(count)),
            "temperature": self.DEFAULT_WEATHER["temperature"],
            "humidity": self.DEFAULT_WEATHER["humidity"],
            "wind_speed": self.DEFAULT_WEATHER["wind_speed"],
            "wind_direction": self.DEFAULT_WEATHER["wind_direction"],
            "rainfall": self.DEFAULT_WEATHER["rainfall"],
            "timestamp": timestamp,
            "citycode": source.city_code
            or source.pollen_station
            or source.forecast_city
            or source.id,
            "raw": {
                "source": "static",
                "pollen_station": source.pollen_station,
            },
        }
        return payload

    def _build_static_entries(
        self,
        date_key: str,
    ) -> List[Dict[str, Any]]:
        try:
            reference = datetime.strptime(date_key, "%Y%m%d")
        except ValueError:
            reference = datetime.now()

        entries: List[Dict[str, Any]] = []
        for source in REGION_SOURCES.values():
            static_payload = self._build_payload_from_static(
                source,
                reference,
            )
            if not static_payload:
                continue
            static_payload = dict(static_payload)
            static_payload.setdefault("timestamp", reference.isoformat())
            static_payload.setdefault("region_id", source.id)
            entries.append(static_payload)

        return entries

    def _load_static_pollen(self, station: str) -> Optional[Dict[str, Any]]:
        candidate = self.STATIC_POLLEN_DIR / f"{station}.json"
        if not candidate.exists():
            logger.warning(
                "Static pollen sample %s missing; returning default payload.",
                candidate,
            )
            return None

        try:
            with candidate.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to load static pollen file %s: %s", candidate, exc
            )
            return None

    def _classify_level(self, value: float) -> str:
        if value >= 101:
            return "very_high"
        if value >= 31:
            return "high"
        if value >= 11:
            return "moderate"
        if value >= 1:
            return "low"
        return "low"


__all__ = ["StaticDataMixin"]
