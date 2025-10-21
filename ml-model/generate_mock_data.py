"""
Mock Data Generator
Generates sample pollen and weather data for testing
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path


def _load_regions():
    prefecture_path = (
        Path(__file__).resolve().parent.parent / "shared" / "prefectures.json"
    )
    try:
        with prefecture_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception:  # noqa: BLE001
        payload = []

    regions = []
    for item in payload:
        try:
            regions.append(
                {
                    "id": item["id"],
                    "name": item.get("name", item["prefecture"]),
                    "prefecture": item.get(
                        "prefecture", item.get("name", item["id"])
                    ),
                    "lat": float(item.get("latitude", 0.0)),
                    "lng": float(item.get("longitude", 0.0)),
                }
            )
        except KeyError:
            continue

    return regions or [
        {
            "id": "tokyo",
            "name": "東京",
            "prefecture": "東京都",
            "lat": 35.6762,
            "lng": 139.6503,
        }
    ]


REGIONS = _load_regions()


def generate_historical_data(days=365):
    """Generate historical pollen data for training"""
    data = []
    
    for day_offset in range(days):
        date = datetime.now() - timedelta(days=day_offset)
        month = date.month
        
        for region in REGIONS:
            # Seasonal pattern (peak in March-April)
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
            
            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "region": region["name"],
                "region_id": region["id"],
                "pollen_count": round(base_pollen, 2),
                "temperature": round(temperature, 1),
                "humidity": round(humidity, 1),
                "wind_speed": round(wind_speed, 1),
                "rainfall": round(rainfall, 1)
            })
    
    return data


def generate_sample_json():
    """Generate sample JSON payloads for testing"""
    samples = {
        "current_data": {
            "success": True,
            "data": [
                {
                    "region": "東京",
                    "region_id": "tokyo",
                    "prefecture": "東京都",
                    "latitude": 35.6762,
                    "longitude": 139.6503,
                    "pollen_count": 45.2,
                    "temperature": 18.5,
                    "humidity": 65.0,
                    "wind_speed": 3.5,
                    "wind_direction": 180.0,
                    "rainfall": 0.0,
                    "timestamp": datetime.now().isoformat()
                }
            ],
            "timestamp": datetime.now().isoformat()
        },
        "prediction": {
            "success": True,
            "predictions": [
                {
                    "region": "東京",
                    "pollen_today": 45.2,
                    "pollen_predicted": 52.3,
                    "confidence": 0.87,
                    "wind_dir": 180.0,
                    "wind_speed": 3.5,
                    "temperature": 18.5,
                    "humidity": 65.0,
                    "risk_level": "high",
                    "timestamp": datetime.now().isoformat()
                }
            ],
            "timestamp": datetime.now().isoformat()
        },
        "websocket_update": {
            "type": "update",
            "data": [
                {
                    "region": "東京",
                    "pollen_today": 45.2,
                    "pollen_predicted": 52.3,
                    "confidence": 0.87,
                    "wind_dir": 180.0,
                    "wind_speed": 3.5,
                    "temperature": 18.5,
                    "humidity": 65.0,
                    "risk_level": "high"
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    }
    
    return samples


if __name__ == "__main__":
    print("📊 Generating mock data...")
    
    # Generate historical data
    historical = generate_historical_data(365)
    with open("historical_data.json", "w", encoding="utf-8") as f:
        json.dump(historical, f, ensure_ascii=False, indent=2)
    print(f"✓ Generated {len(historical)} historical data points")
    
    # Generate sample JSON
    samples = generate_sample_json()
    with open("sample_payloads.json", "w", encoding="utf-8") as f:
        json.dump(samples, f, ensure_ascii=False, indent=2)
    print("✓ Generated sample JSON payloads")
    
    print("\n📝 Files created:")
    print("  - historical_data.json (training data)")
    print("  - sample_payloads.json (API response examples)")
