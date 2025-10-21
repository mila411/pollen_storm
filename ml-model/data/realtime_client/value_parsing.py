from __future__ import annotations

import csv
from typing import Any, Dict, Optional


class ValueParsingMixin:
    """Utility parsing helpers shared across realtime client mixins."""

    def _to_float(self, value: Optional[Any]) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None
            try:
                return float(stripped)
            except ValueError:
                return None
        return None

    def _find_numeric(
        self,
        payload: Optional[Dict[str, Any]]
    ) -> Optional[float]:
        if not isinstance(payload, dict):
            return None

        for key in ("pollenCount", "count", "value", "pollen", "today"):
            value = payload.get(key)
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                try:
                    return float(value)
                except ValueError:
                    continue
        return None

    def _find_timestamp(
        self,
        payload: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        if not isinstance(payload, dict):
            return None

        for key in ("timestamp", "datetime", "time", "observed"):
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value
        return None

    def _parse_csv_payload(self, payload: str) -> Dict[str, Dict[str, Any]]:
        rows: Dict[str, Dict[str, Any]] = {}
        reader = csv.DictReader(payload.splitlines())
        for row in reader:
            city_code = (
                row.get("citycode")
                or row.get("city_code")
                or ""
            ).strip()
            if not city_code:
                continue
            pollen_value = (
                row.get("pollen")
                or row.get("value")
                or row.get("pollen_count")
            )
            try:
                pollen_float = float(pollen_value)
            except (TypeError, ValueError):
                pollen_float = None
            if pollen_float is not None:
                if abs(pollen_float + 9999.0) < 1e-3:
                    pollen_float = 0.0
                elif pollen_float < 0:
                    pollen_float = None

            rows[city_code] = {
                "citycode": city_code,
                "date": (row.get("date") or row.get("datetime") or "").strip(),
                "pollen": pollen_float,
                "raw": row,
            }

        return rows


__all__ = ["ValueParsingMixin"]
