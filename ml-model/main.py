"""
PollenStorm AI - ML Service
FastAPI backend for pollen prediction using LSTM/regression model
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.predictor import PollenPredictor
from data.data_fetcher import PollenDataFetcher

app = FastAPI(
    title="PollenStorm AI ML Service",
    description="AI-powered pollen prediction and data streaming",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
predictor = PollenPredictor()
data_fetcher = PollenDataFetcher()
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_warm_cache() -> None:
    async def warm_cache_background() -> None:
        try:
            reference = datetime.now()
            (
                season_start,
                season_end,
                season_today,
            ) = PollenDataFetcher.compute_selectable_bounds(reference)

            await data_fetcher.prefetch_selectable_range(
                start_date=season_start,
                end_date=season_end,
                keep_date=season_today,
                force_refresh=False,
            )

            in_season = season_start <= reference <= season_end
            if in_season:
                warm_days_value = int(
                    os.getenv("POLLEN_WARM_CACHE_DAYS", "1")
                )
                warm_days = max(1, warm_days_value)
                await data_fetcher.warm_cache(
                    days=warm_days,
                    force_refresh=False,
                )
                await data_fetcher.refresh_cache()

            logger.info(
                "Background cache warm completed. "
                "Season range %s-%s (%d days). In-season=%s",
                season_start.strftime("%Y-%m-%d"),
                season_end.strftime("%Y-%m-%d"),
                max(
                    1,
                    (season_end.date() - season_start.date()).days + 1,
                ),
                "yes" if in_season else "no",
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to prefetch pollen cache: %s", exc)

    asyncio.create_task(warm_cache_background())


def _parse_request_date(date_value: Optional[str]) -> Optional[datetime]:
    if not date_value:
        return None

    parsed: Optional[datetime] = None
    try:
        parsed = datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        try:
            parsed = datetime.fromisoformat(date_value)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD.",
            ) from exc

    assert parsed is not None

    now = datetime.now()
    if parsed > now:
        raise HTTPException(
            status_code=400,
            detail="Date must not be in the future.",
        )
    if parsed < now - timedelta(days=365):
        raise HTTPException(
            status_code=400,
            detail="Date must be within the past year.",
        )

    return parsed.replace(hour=12, minute=0, second=0, microsecond=0)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "PollenStorm AI ML Service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/data/current")
async def get_current_data(
    region: Optional[str] = None,
    refresh: bool = False,
    date: Optional[str] = None,
):
    """
    Get current pollen and weather data
    Returns real-time pollen levels with weather conditions
    """
    try:
        target_date = _parse_request_date(date)
        data = await data_fetcher.fetch_current_data(
    
            region,
            force_refresh=refresh,
            target_date=target_date,
        )
        return {
            "success": True,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "requested_date": (
                target_date.date().isoformat() if target_date else None
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/predict")
async def predict_pollen(
    region: Optional[str] = None,
    days: int = 1,
    refresh: bool = False,
    date: Optional[str] = None,
):
    """
    Predict pollen levels for specified region and days ahead
    Uses trained LSTM/regression model
    """
    try:
        target_date = _parse_request_date(date)
        # Get current data as input
        current_data = await data_fetcher.fetch_current_data(
            region,
            force_refresh=refresh,
            target_date=target_date,
        )
        
        # Generate predictions
        predictions = []
        for region_data in current_data:
            prediction = predictor.predict(region_data, days)
            predictions.append({
                "region": region_data["region"],
                "pollen_today": region_data["pollen_count"],
                "pollen_tomorrow": prediction["pollen_tomorrow"],
                "pollen_day_after": prediction.get("pollen_day_after"),
                "confidence": prediction["confidence"],
                "wind_dir": region_data["wind_direction"],
                "wind_speed": region_data["wind_speed"],
                "temperature": region_data["temperature"],
                "humidity": region_data["humidity"],
                "risk_level": prediction["risk_level"],
                "forecast": prediction["forecast"],
                "timestamp": (
                    target_date.isoformat()
                    if target_date is not None
                    else datetime.now().isoformat()
                )
    
            })
        
        return {
            "success": True,
            "predictions": predictions,
            "timestamp": datetime.now().isoformat(),
            "requested_date": (
                target_date.date().isoformat() if target_date else None
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/historical")
async def get_historical_data(
    region: Optional[str] = None,
    days: int = 30,
):
    """
    Get historical pollen data for training or analysis
    """
    
    try:
        data = await data_fetcher.fetch_historical_data(region, days)
        return {
            "success": True,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/info")
async def get_model_info():
    
    """Get information about the trained model."""
    return {
        "model_type": predictor.model_type,
        "version": predictor.version,
        "accuracy": predictor.accuracy,
        "features": predictor.features,
        "last_trained": predictor.last_trained,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/train")
async def train_model():
    """
    Trigger model retraining (admin endpoint)
    """
    try:
        # Fetch training data
        historical_data = await data_fetcher.fetch_historical_data(days=365)
        
        # Train model
        result = predictor.train(historical_data)
        
        return {
            "success": True,
            "message": "Model trained successfully",
            "metrics": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    try:
        import uvicorn  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "uvicorn is required to run the development server"
        ) from exc

    uvicorn.run(app, host="0.0.0.0", port=8001)
