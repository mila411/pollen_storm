import json
import logging
import os
import re
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import aiohttp

from .regions import REGION_SOURCES, RegionSource
from .static_data import StaticDataMixin

logger = logging.getLogger(__name__)


class RealtimeDataClient(StaticDataMixin):
    """Load pollen/weather data from locally stored samples."""

    POLLEN_API_URL = os.getenv(
        "WEATHERNEWS_POLLEN_URL",
        "https://wxtech.weathernews.com/opendata/v1/pollen"
    )
    WEATHER_API_URL = os.getenv(
        "TSUKUMIJIMA_FORECAST_URL",
        "https://weather.tsukumijima.net/api/forecast"
    )
    STATIC_POLLEN_DIR = Path(os.getenv("POLLEN_API_STATIC_DIR", str(
        Path(__file__).resolve().parent / "static" / "pollen"
    )))
    SAMPLE_DATA_FILE = Path(os.getenv("REALTIME_SAMPLE_FILE", str(
        Path(__file__).resolve().parent / "static" / "sample_regions.json"
    )))
    CACHE_DIR = Path(os.getenv(
        "POLLEN_CACHE_DIR",
        str(Path(__file__).resolve().parent / "cache")
    ))
    USER_AGENT = os.getenv(
        "POLLEN_USER_AGENT",
        "PollenStorm/1.0"
    )
    WEATHER_CACHE_TTL_SECONDS = int(
        os.getenv("WEATHER_CACHE_TTL_SECONDS", "1800")
    )
    DISABLE_LIVE_FETCH = os.getenv(
        "POLLEN_DISABLE_LIVE_FETCH",
        "false"
    ).lower() in {"1", "true", "yes"}

    DEFAULT_WEATHER = {
        "temperature": 20.0,
        "humidity": 60.0,
        "wind_speed": 3.0,
        "wind_direction": 180.0,
        "rainfall": 0.0,
    }

    def __init__(self, timeout: int = 10) -> None:
        # timeout retained for compatibility with previous interface
        self.timeout = timeout
        self.sample_file = Path(
            os.getenv("REALTIME_SAMPLE_FILE", str(self.SAMPLE_DATA_FILE))
        )
        self._sample_cache: Optional[List[Dict[str, Any]]] = None
        self._daily_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_source_keys: Dict[str, str] = {}
        self._weather_cache: Dict[str, Tuple[datetime, Dict[str, Any]]] = {}

    async def fetch_regions(
        self,
        regions: List[Dict[str, Any]],
        region_filter: Optional[str] = None,
        force_refresh: bool = False,
        target_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        sources = self._resolve_sources(regions, region_filter)
        if not sources:
            return []

        date_ref = target_date or datetime.now()
        date_key = date_ref.strftime("%Y%m%d")

        api_map = await self._load_daily_pollen_map(
            date_key=date_key,
            force_refresh=force_refresh
        )
        sample_payloads = self._load_sample_payloads()
        sample_map = {
            item.get("region_id"): item for item in (sample_payloads or [])
            if isinstance(item, dict)
        }
        weather_lookup = await self._load_weather_data(sources, date_ref)

        payloads: List[Dict[str, Any]] = []
        for source in sources:
            payload = None
            api_entry = None
            if api_map:
                for key in (
                    source.city_code,
                    source.forecast_city,
                    source.pollen_station,
                    source.amedas_station,
                    source.id,
                ):
                    if key and key in api_map:
                        api_entry = api_map[key]
                        break
            if api_entry is not None:
                payload = self._build_payload_from_api(source, api_entry)
            if payload is None:
                sample_entry = sample_map.get(source.id)
                if sample_entry is not None:
                    payload = dict(sample_entry)
            if payload is None:
                payload = self._build_payload_from_static(source, date_ref)
            if payload:
                if target_date:
                    payload["timestamp"] = date_ref.isoformat()
                    payload.setdefault("raw", {}).setdefault(
                        "requested_date",
                        date_key
                    )
                weather_entry = None
                if weather_lookup:
                    for key in (
                        source.forecast_city,
                        source.city_code,
                        source.id,
                    ):
                        if key and key in weather_lookup:
                            weather_entry = weather_lookup[key]
                            break
                if weather_entry:
                    payload["temperature"] = weather_entry["temperature"]
                    payload["humidity"] = weather_entry["humidity"]
                    payload["wind_speed"] = weather_entry["wind_speed"]
                    payload["wind_direction"] = weather_entry["wind_direction"]
                    payload.setdefault("weatherData", {})
                    payload["weatherData"].update({
                        "temperature": payload["temperature"],
                        "humidity": payload["humidity"],
                        "windSpeed": payload["wind_speed"],
                        "windDirection": payload["wind_direction"],
                        "condition": weather_entry.get("condition"),
                        "observedAt": weather_entry.get("observed_at"),
                        "source": weather_entry.get("source"),
                    })
                    if weather_entry.get("condition"):
                        payload.setdefault(
                            "weather_condition",
                            weather_entry.get("condition"),
                        )
                    payload.setdefault("raw", {})
                    payload["raw"].setdefault(
                        "weather_source",
                        weather_entry.get("source")
                    )
                    if weather_entry.get("observed_at"):
                        payload["raw"].setdefault(
                            "weather_observed_at",
                            weather_entry["observed_at"]
                        )
                payloads.append(payload)

        return payloads

    async def refresh_cache(self) -> None:
        today_key = datetime.now().strftime("%Y%m%d")
        self._daily_cache.pop(today_key, None)
        self._cache_source_keys.pop(today_key, None)
        self._weather_cache.clear()
        await self._load_daily_pollen_map(
            date_key=today_key,
            force_refresh=True
        )
        retention_days = max(
            int(os.getenv("POLLEN_CACHE_RETENTION_DAYS", "365")),
            365,
        )
        self._cleanup_old_cache(retention_days)

    async def _load_daily_pollen_map(
        self,
        date_key: str,
        force_refresh: bool = False
    ) -> Dict[str, Dict[str, Any]]:
        if not force_refresh and date_key in self._daily_cache:
            return self._daily_cache[date_key]

        cache_path = self.CACHE_DIR / f"pollen_{date_key}.json"
        cached_entries: Optional[List[Dict[str, Any]]] = None
        cache_source_key = date_key

        if (
            cache_path.exists()
            and not force_refresh
            and not self.DISABLE_LIVE_FETCH
        ):
            try:
                with cache_path.open("r", encoding="utf-8") as handle:
                    cached_entries = json.load(handle)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to read pollen cache %s: %s",
                    cache_path,
                    exc
                )

        if cached_entries is None or force_refresh:
            downloaded_entries: Optional[List[Dict[str, Any]]] = None
            static_used = False
            if not self.DISABLE_LIVE_FETCH:
                downloaded_entries = await self._download_daily_entries(
                    date_key
                )
            if not downloaded_entries:
                downloaded_entries = self._build_static_entries(date_key)
                static_used = bool(downloaded_entries)
            if downloaded_entries:
                try:
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    with cache_path.open("w", encoding="utf-8") as handle:
                        json.dump(
                            downloaded_entries,
                            handle,
                            ensure_ascii=False
                        )
                    self._clear_raw_daily_dir(date_key)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Failed to persist pollen cache %s: %s",
                        cache_path,
                        exc
                    )
                cached_entries = downloaded_entries
                cache_source_key = (
                    f"static_{date_key}" if static_used else date_key
                )
                if static_used:
                    logger.info(
                        "Using static pollen samples for %s",
                        date_key,
                    )
            elif cache_path.exists() and cached_entries is None:
                try:
                    with cache_path.open("r", encoding="utf-8") as handle:
                        cached_entries = json.load(handle)
                        cache_source_key = date_key
                        logger.info(
                            "Reusing previously cached pollen data for %s",
                            date_key,
                        )
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Failed to reload cached pollen data %s: %s",
                        cache_path,
                        exc,
                    )
                    cached_entries = None

        if not cached_entries:
            fallback = self._load_recent_cache(date_key)
            if fallback:
                cache_source_key, cached_entries = fallback
                logger.info(
                    "Using pollen cache from %s as fallback for %s",
                    cache_source_key,
                    date_key,
                )

        if not cached_entries:
            logger.warning("No pollen data available for %s", date_key)
            self._cache_source_keys[date_key] = cache_source_key
            self._daily_cache[date_key] = {}
            return {}

        pollen_map = {
            str(entry.get("citycode")): entry for entry in cached_entries
            if entry.get("citycode")
        }

        # Provide aliases for convenience when looking up by region id or
        # legacy station codes.
        for source in REGION_SOURCES.values():
            entry = None
            if source.city_code and source.city_code in pollen_map:
                entry = pollen_map[source.city_code]
            if not entry:
                continue
            for alias in (
                source.pollen_station,
                source.forecast_city,
                source.amedas_station,
                source.id,
            ):
                if alias and alias not in pollen_map:
                    pollen_map[alias] = entry

        self._daily_cache[date_key] = pollen_map
        self._cache_source_keys[date_key] = cache_source_key
        self._prune_memory_cache()
        return pollen_map

    async def _download_daily_entries(
        self, date_key: str
    ) -> List[Dict[str, Any]]:
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        headers = {
            "User-Agent": self.USER_AGENT,
            "Accept": "text/csv",
        }

        results: List[Dict[str, Any]] = []
        target_dates = self._build_target_dates(date_key)

        async with aiohttp.ClientSession(
            timeout=timeout,
            headers=headers
        ) as session:
            for source in REGION_SOURCES.values():
                if not source.city_code:
                    continue
                entry = await self._download_city_entry(
                    session,
                    source.city_code,
                    target_dates,
                    date_key,
                )
                if entry:
                    entry.setdefault("region_id", source.id)
                    results.append(entry)

        return results

    async def _load_weather_data(
        self,
        sources: List[RegionSource],
        target_date: Optional[datetime],
    ) -> Dict[str, Dict[str, Any]]:
        if not sources:
            return {}

        now = datetime.now()
        if target_date and abs((now - target_date).days) > 1:
            # Forecast API covers only near-future dates; skip older requests.
            return {}

        code_to_sources: Dict[str, List[RegionSource]] = {}
        for source in sources:
            if source.forecast_city:
                code_to_sources.setdefault(
                    source.forecast_city,
                    []
                ).append(source)

        if not code_to_sources:
            return {}

        timeout = aiohttp.ClientTimeout(total=self.timeout)
        headers = {
            "User-Agent": self.USER_AGENT,
            "Accept": "application/json",
        }
        weather_results: Dict[str, Dict[str, Any]] = {}

        async with aiohttp.ClientSession(
            timeout=timeout,
            headers=headers
        ) as session:
            for city_code, mapped_sources in code_to_sources.items():
                weather_entry = await self._get_weather_for_city(
                    session,
                    city_code,
                    target_date,
                )
                if not weather_entry:
                    continue
                for mapped_source in mapped_sources:
                    weather_results[
                        mapped_source.forecast_city
                    ] = weather_entry
                    if mapped_source.city_code:
                        weather_results[
                            mapped_source.city_code
                        ] = weather_entry
                    weather_results[mapped_source.id] = weather_entry

        return weather_results

    async def _get_weather_for_city(
        self,
        session: aiohttp.ClientSession,
        city_code: str,
        target_date: Optional[datetime],
    ) -> Optional[Dict[str, Any]]:
        now = datetime.now()
        cached = self._weather_cache.get(city_code)
        if cached and (
            now - cached[0]
        ).total_seconds() < self.WEATHER_CACHE_TTL_SECONDS:
            return cached[1]

        params = {"city": city_code}
        try:
            async with session.get(
                self.WEATHER_API_URL,
                params=params
            ) as response:
                if response.status != 200:
                    logger.debug(
                        "Weather API returned %s for city %s",
                        response.status,
                        city_code,
                    )
                    return cached[1] if cached else None
                payload = await response.json(content_type=None)
        except aiohttp.ClientError as exc:  # noqa: BLE001
            logger.debug(
                "Failed to reach weather API for %s: %s",
                city_code,
                exc,
            )
            return cached[1] if cached else None
        except Exception as exc:  # noqa: BLE001
            logger.debug(
                "Unexpected weather API error for %s: %s",
                city_code,
                exc,
            )
            return cached[1] if cached else None

        metrics = self._parse_weather_metrics(payload, target_date)
        if not metrics:
            return cached[1] if cached else None

        metrics["observed_at"] = payload.get("publicTime")
        metrics["source"] = "tsukumijima_forecast"
        # Store a shallow copy to avoid accidental mutations.
        cached_value = dict(metrics)
        self._weather_cache[city_code] = (now, cached_value)
        return cached_value

    def _parse_weather_metrics(
        self,
        payload: Dict[str, Any],
        target_date: Optional[datetime],
    ) -> Optional[Dict[str, Any]]:
        forecasts = payload.get("forecasts") or []
        if not forecasts:
            return None

        target_key = (
            target_date.strftime("%Y-%m-%d")
            if target_date is not None
            else datetime.now().strftime("%Y-%m-%d")
        )
        selected: Optional[Dict[str, Any]] = None
        for forecast in forecasts:
            if forecast.get("date") == target_key:
                selected = forecast
                break
        if selected is None:
            selected = forecasts[0]

        if not selected:
            return None

        condition_text = selected.get("telop")

        temp_values: List[float] = []
        temperatures = selected.get("temperature") or {}
        for key in ("max", "min"):
            temp_value = self._to_float(
                ((temperatures.get(key) or {}).get("celsius"))
            )
            if temp_value is not None:
                temp_values.append(temp_value)
        temperature = (
            sum(temp_values) / len(temp_values)
            if temp_values
            else None
        )

        chance_map = selected.get("chanceOfRain") or {}
        humidity_values = [
            value for value in (
                self._parse_percent_value(entry)
                for entry in chance_map.values()
            )
            if value is not None
        ]
        humidity = (
            sum(humidity_values) / len(humidity_values)
            if humidity_values
            else None
        )

        wind_text = ((selected.get("detail") or {}).get("wind") or "").strip()
        wind_direction = self._parse_wind_direction(wind_text)
        wind_speed = self._estimate_wind_speed(wind_text)

        return {
            "temperature": (
                temperature
                if temperature is not None
                else self.DEFAULT_WEATHER["temperature"]
            ),
            "humidity": (
                humidity
                if humidity is not None
                else self.DEFAULT_WEATHER["humidity"]
            ),
            "wind_speed": (
                wind_speed
                if wind_speed is not None
                else self.DEFAULT_WEATHER["wind_speed"]
            ),
            "wind_direction": (
                wind_direction
                if wind_direction is not None
                else self.DEFAULT_WEATHER["wind_direction"]
            ),
            "condition": condition_text,
        }

    def _parse_percent_value(self, value: Optional[str]) -> Optional[float]:
        if not value:
            return None
        if value == "--%":
            return None
        numeric = value.replace("%", "").strip()
        if not numeric:
            return None
        try:
            return float(numeric)
        except ValueError:
            return None

    def _parse_wind_direction(self, text: str) -> Optional[float]:
        if not text:
            return None
        text = text.replace("　", " ")
        direction_map = [
            ("北北東", 22.5),
            ("東北東", 67.5),
            ("東南東", 112.5),
            ("南南東", 157.5),
            ("南南西", 202.5),
            ("西南西", 247.5),
            ("西北西", 292.5),
            ("北北西", 337.5),
            ("北東", 45.0),
            ("南東", 135.0),
            ("南西", 225.0),
            ("北西", 315.0),
            ("東", 90.0),
            ("南", 180.0),
            ("西", 270.0),
            ("北", 0.0),
        ]
        for keyword, degrees in direction_map:
            if keyword in text:
                return degrees
        return None

    def _estimate_wind_speed(self, text: str) -> Optional[float]:
        if not text:
            return None

        match = re.search(r"(\d+(?:\.\d+)?)\s*メートル", text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass

        if "非常に強" in text or "猛烈" in text:
            return 12.0
        if "強く" in text:
            return 8.0
        if "やや強" in text:
            return 5.5
        if "弱く" in text or "弱い" in text:
            return 2.0
        if "静穏" in text:
            return 0.5
        return self.DEFAULT_WEATHER["wind_speed"]

    def _to_float(self, value: Optional[Any]) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            try:
                return float(value)
            except ValueError:
                return None
        return None

    async def _download_city_entry(
        self,
        session: aiohttp.ClientSession,
        city_code: str,
        target_dates: List[str],
        request_date: str,
    ) -> Optional[Dict[str, Any]]:
        for target_date in target_dates:
            params = {
                "citycode": city_code,
                "start": target_date,
                "end": target_date,
            }

            try:
                async with session.get(
                    self.POLLEN_API_URL,
                    params=params
                ) as response:
                    if response.status == 404:
                        logger.debug(
                            "No pollen data for %s on %s",
                            city_code,
                            target_date,
                        )
                        continue
                    response.raise_for_status()
                    text_payload = await response.text()
            except aiohttp.ClientResponseError as exc:  # noqa: BLE001
                if exc.status == 404:
                    logger.debug(
                        "No pollen data for %s on %s", city_code, target_date
                    )
                    continue
                logger.warning(
                    "Failed to download pollen CSV for %s (%s): %s",
                    city_code,
                    target_date,
                    exc,
                )
                continue
            except aiohttp.ClientError as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to download pollen CSV for %s (%s): %s",
                    city_code,
                    target_date,
                    exc,
                )
                continue
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Unexpected error downloading pollen CSV for %s (%s): %s",
                    city_code,
                    target_date,
                    exc,
                )
                continue

            parsed = self._parse_csv_payload(text_payload)
            entry = parsed.get(city_code)
            if entry is None and parsed:
                entry = next(iter(parsed.values()), None)

            if not entry:
                logger.debug(
                    "Parsed pollen CSV for %s (%s) but found no entries",
                    city_code,
                    target_date,
                )
                continue

            pollen_value = entry.get("pollen")
            if pollen_value is None:
                logger.debug(
                    "Pollen CSV for %s (%s) contained no pollen value",
                    city_code,
                    target_date,
                )
                continue
            if isinstance(pollen_value, (int, float)) and pollen_value < 0:
                logger.debug(
                    "Pollen CSV for %s (%s) reported negative pollen %.2f",
                    city_code,
                    target_date,
                    pollen_value,
                )
                continue

            entry["citycode"] = city_code
            entry["source_date"] = target_date
            entry.setdefault("raw", {}).setdefault("source_date", target_date)
            self._persist_city_csv(request_date, city_code, text_payload)
            return entry

        return None

    def _build_target_dates(self, date_key: str) -> List[str]:
        today = datetime.strptime(date_key, "%Y%m%d")
        lookback_days = max(0, int(os.getenv("POLLEN_API_LOOKBACK_DAYS", "7")))
        dates: List[str] = []
        seen: Set[str] = set()

        def add(day: datetime) -> None:
            key = day.strftime("%Y%m%d")
            if key not in seen:
                seen.add(key)
                dates.append(key)

        for offset in range(lookback_days + 1):
            add(today - timedelta(days=offset))

        return dates

    def _persist_city_csv(
        self,
        date_key: str,
        city_code: str,
        payload: str
    ) -> None:
        try:
            target_dir = self.CACHE_DIR / "raw" / date_key
            target_dir.mkdir(parents=True, exist_ok=True)
            path = target_dir / f"{city_code}.csv"
            path.write_text(payload, encoding="utf-8")
        except Exception as exc:  # noqa: BLE001
            logger.debug(
                "Failed to persist raw pollen CSV for %s on %s: %s",
                city_code,
                date_key,
                exc,
            )

    def _clear_raw_daily_dir(self, date_key: str) -> None:
        raw_dir = self.CACHE_DIR / "raw" / date_key
        if not raw_dir.exists():
            return
        try:
            shutil.rmtree(raw_dir)
        except Exception as exc:  # noqa: BLE001
            logger.debug(
                "Failed to clear raw pollen cache for %s: %s",
                raw_dir,
                exc,
            )

    def _load_recent_cache(
        self,
        target_key: str
    ) -> Optional[Tuple[str, List[Dict[str, Any]]]]:
        if not self.CACHE_DIR.exists():
            return None

        try:
            target_day = datetime.strptime(target_key, "%Y%m%d")
        except ValueError:
            target_day = None

        best_match: Optional[
            Tuple[int, datetime, str, List[Dict[str, Any]]]
        ] = None

        for candidate in self.CACHE_DIR.glob("pollen_*.json"):
            key = candidate.stem.replace("pollen_", "")
            if key == target_key:
                continue

            try:
                with candidate.open("r", encoding="utf-8") as handle:
                    payload = json.load(handle)
            except Exception as exc:  # noqa: BLE001
                logger.debug(
                    "Failed to read fallback pollen cache %s: %s",
                    candidate,
                    exc,
                )
                continue

            if not payload:
                continue

            if target_day is None:
                return key, payload

            try:
                candidate_day = datetime.strptime(key, "%Y%m%d")
            except ValueError:
                continue

            delta_days = abs((candidate_day - target_day).days)
            if delta_days > 365:
                continue

            if best_match is None or delta_days < best_match[0] or (
                delta_days == best_match[0] and candidate_day > best_match[1]
            ):
                best_match = (delta_days, candidate_day, key, payload)

        if best_match:
            _, _, key, payload = best_match
            return key, payload

        return None

    def _cleanup_old_cache(self, retention_days: int) -> None:
        if retention_days <= 0:
            return

        cutoff = datetime.now() - timedelta(days=retention_days)
        try:
            self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        except Exception as exc:  # noqa: BLE001
            logger.debug(
                "Failed to ensure cache directory %s: %s",
                self.CACHE_DIR,
                exc,
            )
            return

        for path in self.CACHE_DIR.glob("pollen_*.json"):
            key = path.stem.replace("pollen_", "")
            try:
                day = datetime.strptime(key, "%Y%m%d")
            except ValueError:
                continue
            if day < cutoff:
                try:
                    path.unlink()
                except Exception as exc:  # noqa: BLE001
                    logger.debug(
                        "Failed to remove cache file %s: %s",
                        path,
                        exc,
                    )

        raw_root = self.CACHE_DIR / "raw"
        if not raw_root.exists():
            return
        for path in raw_root.iterdir():
            if not path.is_dir():
                continue
            try:
                day = datetime.strptime(path.name, "%Y%m%d")
            except ValueError:
                continue
            if day < cutoff:
                try:
                    shutil.rmtree(path)
                except Exception as exc:  # noqa: BLE001
                    logger.debug(
                        "Failed to remove raw cache directory %s: %s",
                        path,
                        exc,
                    )

    def _prune_memory_cache(self) -> None:
        """Keep in-memory cache bounded to roughly one year."""
        max_entries = 370
        if len(self._daily_cache) <= max_entries:
            return

        def parse_key(key: str) -> datetime:
            try:
                return datetime.strptime(key, "%Y%m%d")
            except ValueError:
                return datetime.min

        sorted_keys = sorted(self._daily_cache.keys(), key=parse_key)
        for stale_key in sorted_keys[:-max_entries]:
            self._daily_cache.pop(stale_key, None)
            self._cache_source_keys.pop(stale_key, None)

    async def prefetch_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        *,
        force_refresh: bool = False,
        keep_dates: Optional[Iterable[datetime]] = None,
    ) -> None:
        """Persist cache files for the given inclusive date range."""
        if end_date < start_date:
            return

        keep_keys: Set[str] = set()
        if keep_dates:
            for candidate in keep_dates:
                keep_keys.add(candidate.strftime("%Y%m%d"))

        current = start_date
        while current <= end_date:
            date_key = current.strftime("%Y%m%d")
            try:
                await self._load_daily_pollen_map(
                    date_key=date_key,
                    force_refresh=force_refresh,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to prefetch pollen cache for %s: %s",
                    date_key,
                    exc,
                )

            if keep_keys:
                if date_key not in keep_keys:
                    self._daily_cache.pop(date_key, None)
                    self._cache_source_keys.pop(date_key, None)
            else:
                self._daily_cache.pop(date_key, None)
                self._cache_source_keys.pop(date_key, None)

            current += timedelta(days=1)

        if keep_keys:
            existing_keys = set(self._daily_cache.keys())
            for key in existing_keys:
                if key not in keep_keys:
                    self._daily_cache.pop(key, None)
                    self._cache_source_keys.pop(key, None)
        else:
            self._daily_cache.clear()
            self._cache_source_keys.clear()

    async def prefetch_history(
        self,
        days: int,
        force_refresh: bool = False,
    ) -> None:
        """Warm pollen cache for the past N days (including today)."""
        if days < 0:
            return

        now = datetime.now()
        today_key = now.strftime("%Y%m%d")
        cached_today: Optional[Dict[str, Any]] = None
        cached_today_source: Optional[str] = None

        for offset in range(days + 1):
            target_date = now - timedelta(days=offset)
            date_key = target_date.strftime("%Y%m%d")
            try:
                await self._load_daily_pollen_map(
                    date_key=date_key,
                    force_refresh=force_refresh,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to prefetch pollen cache for %s: %s",
                    date_key,
                    exc,
                )
                continue

            if date_key == today_key:
                cached_today = self._daily_cache.get(date_key)
                cached_today_source = self._cache_source_keys.get(date_key)
            else:
                # Persist on disk but avoid keeping year-long data in memory.
                self._daily_cache.pop(date_key, None)
                self._cache_source_keys.pop(date_key, None)

        self._daily_cache.clear()
        self._cache_source_keys = {}
        if cached_today is not None:
            self._daily_cache[today_key] = cached_today
            if cached_today_source:
                self._cache_source_keys[today_key] = cached_today_source
            else:
                self._cache_source_keys[today_key] = today_key

    def _build_payload_from_api(
        self,
        source: RegionSource,
        api_entry: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        pollen_value = api_entry.get("pollen")
        if pollen_value is None:
            return None

        try:
            pollen_count = float(pollen_value)
        except (TypeError, ValueError):
            return None

        timestamp = api_entry.get("date") or datetime.now().isoformat()
        raw = api_entry.get("raw") or {}
        timestamp = raw.get("date") or raw.get("datetime") or timestamp
        if timestamp and len(timestamp) == 8 and timestamp.isdigit():
            # Format YYYYMMDD
            timestamp = datetime.strptime(timestamp, "%Y%m%d").isoformat()

        return {
            "region": source.name,
            "region_id": source.id,
            "prefecture": source.prefecture,
            "latitude": source.latitude,
            "longitude": source.longitude,
            "pollen_count": float(pollen_count),
            "pollen_level": self._classify_level(float(pollen_count)),
            "temperature": self.DEFAULT_WEATHER["temperature"],
            "humidity": self.DEFAULT_WEATHER["humidity"],
            "wind_speed": self.DEFAULT_WEATHER["wind_speed"],
            "wind_direction": self.DEFAULT_WEATHER["wind_direction"],
            "rainfall": self.DEFAULT_WEATHER["rainfall"],
            "timestamp": timestamp,
        }

    def _resolve_sources(
        self,
        regions: List[Dict[str, Any]],
        region_filter: Optional[str]
    ) -> List[RegionSource]:
        resolved: List[RegionSource] = []
        for region in regions:
            if region_filter and region["id"] != region_filter:
                continue
            source = REGION_SOURCES.get(region["id"])
            if source:
                resolved.append(source)
        return resolved

