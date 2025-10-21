"""Data fetcher that favors real APIs with mock fallback."""

import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from .realtime_client import REGION_SOURCES, RealtimeDataClient


logger = logging.getLogger(__name__)


class PollenDataFetcher:
    def __init__(self):
        self.regions = [
            {
                "id": source.id,
                "name": source.name,
                "prefecture": source.prefecture,
                "lat": source.latitude,
                "lng": source.longitude,
            }
            for source in REGION_SOURCES.values()
        ]
        self.realtime_client = RealtimeDataClient()

    @staticmethod
    def compute_selectable_bounds(
        reference: Optional[datetime] = None,
    ) -> Tuple[datetime, datetime, datetime]:
        """Compute frontend-equivalent selectable date range."""
        now = reference or datetime.now()
        season_year = now.year if now.month >= 2 else now.year - 1
        season_start = datetime(season_year, 2, 1, 12, 0, 0)
        season_end_candidate = datetime(season_year, 5, 31, 12, 0, 0)

        if season_start > season_end_candidate:
            season_end_candidate = season_start

        if season_start <= now <= season_end_candidate:
            season_end = now.replace(
                hour=12,
                minute=0,
                second=0,
                microsecond=0,
            )
        else:
            season_end = season_end_candidate

        if season_end < season_start:
            season_end = season_start

        season_today = now.replace(
            hour=12,
            minute=0,
            second=0,
            microsecond=0,
        )
        if season_today < season_start:
            season_today = season_start
        elif season_today > season_end:
            season_today = season_end

        return season_start, season_end, season_today

    async def fetch_current_data(
        self,
        region_filter: Optional[str] = None,
        force_refresh: bool = False,
        target_date: Optional[datetime] = None,
    ) -> List[Dict]:
        """
        Fetch current pollen and weather data

        In production, this would call:
        - JMA (Japan Meteorological Agency) API
        - Weathernews API
        - Environmental monitoring stations

        For now, returns mock data with realistic patterns
        """
        data = []

        filtered_regions = [
            region
            for region in self.regions
            if not region_filter or region["id"] == region_filter
        ]

        realtime_results: List[Dict] = []
        try:
            realtime_results = await self.realtime_client.fetch_regions(
                filtered_regions,
                None,
                force_refresh=force_refresh,
                target_date=target_date,
            )
        except Exception as exc:
            logger.exception("Failed to fetch realtime data: %s", exc)

        realtime_map = {
            payload["region_id"]: payload for payload in realtime_results
            if payload
        }

        for region in filtered_regions:
            payload = realtime_map.get(region["id"])
            if not payload:
                payload = self._generate_pollen_data(region, target_date)
            data.append(payload)

        return data

    def _generate_pollen_data(
        self,
        region: Dict,
        date_ref: Optional[datetime] = None,
    ) -> Dict:
        """Generate realistic pollen data for a region"""
        reference = date_ref or datetime.now()

        # Time-based variation (higher in spring, morning hours)
        hour = reference.hour or 12
        month = reference.month

        # Seasonal factor (peak in March-April)
        if month in [3, 4]:
            seasonal_factor = 1.5
        elif month in [2, 5]:
            seasonal_factor = 1.0
        else:
            seasonal_factor = 0.3

        # Daily variation (peak around 10-14:00)
        if 10 <= hour <= 14:
            daily_factor = 1.2
        elif 6 <= hour <= 18:
            daily_factor = 1.0
        else:
            daily_factor = 0.6

        # Base pollen count with variation
        base_pollen = 30 + random.random() * 50
        pollen_count = base_pollen * seasonal_factor * daily_factor

        # Weather data
        temperature = 10 + random.random() * 20  # 10-30°C
        humidity = 40 + random.random() * 40     # 40-80%
        wind_speed = random.random() * 8         # 0-8 m/s
        wind_direction = random.random() * 360   # 0-360°
        rainfall = random.random() * 3 if random.random() < 0.2 else 0

        # If raining, reduce pollen
        if rainfall > 0:
            pollen_count *= 0.3

        return {
            "region": region["name"],
            "region_id": region["id"],
            "prefecture": region["prefecture"],
            "latitude": region["lat"],
            "longitude": region["lng"],
            "pollen_count": round(pollen_count, 2),
            "pollen_level": self._classify_pollen_level(pollen_count),
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
            "wind_speed": round(wind_speed, 1),
            "wind_direction": round(wind_direction, 1),
            "rainfall": round(rainfall, 1),
            "timestamp": reference.isoformat()
        }

    async def fetch_historical_data(
        self,
        region_filter: Optional[str] = None,
        days: int = 30
    ) -> List[Dict]:
        """
        Fetch historical pollen data for training

        In production, this would query a database or external API
        For now, generates synthetic historical data
        """
        historical = []

        for day_offset in range(days):
            date = datetime.now() - timedelta(days=day_offset)

            for region in self.regions:
                if region_filter and region["id"] != region_filter:
                    continue

                # Generate data for this date
                data = self._generate_historical_day_data(region, date)
                historical.append(data)

        return historical

    def _generate_historical_day_data(
        self,
        region: Dict,
        date: datetime
    ) -> Dict:
        """Generate historical data for a specific day"""
        month = date.month

        # Seasonal pattern
        if month in [3, 4]:
            base_pollen = 60 + random.random() * 30
        elif month in [2, 5]:
            base_pollen = 30 + random.random() * 30
        else:
            base_pollen = 5 + random.random() * 15

        temperature = 10 + random.random() * 20
        humidity = 40 + random.random() * 40
        wind_speed = random.random() * 8
        rainfall = random.random() * 5 if random.random() < 0.2 else 0

        if rainfall > 0:
            base_pollen *= 0.3

        return {
            "region": region["name"],
            "region_id": region["id"],
            "date": date.isoformat(),
            "pollen_count": round(base_pollen, 2),
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
            "wind_speed": round(wind_speed, 1),
            "rainfall": round(rainfall, 1)
        }

    @staticmethod
    def _classify_pollen_level(value: float) -> str:
        if value >= 101:
            return "very_high"
        if value >= 31:
            return "high"
        if value >= 11:
            return "moderate"
        if value >= 1:
            return "low"
        return "low"

    async def refresh_cache(self) -> None:
        await self.realtime_client.refresh_cache()

    async def warm_cache(
        self,
        days: int = 10,
        force_refresh: bool = False,
    ) -> None:
        await self.realtime_client.prefetch_history(
            days=days,
            force_refresh=force_refresh,
        )

    async def prefetch_selectable_range(
        self,
        start_date: datetime,
        end_date: datetime,
        keep_date: Optional[datetime] = None,
        force_refresh: bool = False,
    ) -> None:
        if end_date < start_date:
            return

        normalized_start = start_date.replace(
            hour=12,
            minute=0,
            second=0,
            microsecond=0,
        )
        normalized_end = end_date.replace(
            hour=12,
            minute=0,
            second=0,
            microsecond=0,
        )
        normalized_keep = (
            keep_date.replace(
                hour=12,
                minute=0,
                second=0,
                microsecond=0,
            )
            if keep_date
            else None
        )

        await self.realtime_client.prefetch_date_range(
            start_date=normalized_start,
            end_date=normalized_end,
            force_refresh=force_refresh,
            keep_dates=[normalized_keep] if normalized_keep else None,
        )
