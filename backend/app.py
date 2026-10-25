"""
Himalayan Flood Prediction - FastAPI Application
Provides RESTful APIs for real-time forecasting, historical disaster backtesting,
interactive What-If simulation, and scientific reports. Serves the modern frontend dashboard.
"""

import os
import sys
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Ensure root path is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.data_manager import (
    HIMALAYAN_STATIONS, get_all_stations, get_station_info, fetch_himalayan_data
)
from backend.ml_engine import train_and_evaluate_pipeline
from backend.backtesting import run_all_backtests
from backend.simulator import simulate_cryospheric_surge
from backend.scientific_report import get_scientific_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HimAlertApp")

app = FastAPI(
    title="HimAlert AI: Himalayan Glacial Flood Early Warning System",
    description="Automated hydrometeorological machine learning platform for Himalayan flood forecasting",
    version="2.0.0"
)

# Enable CORS for external access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


class SimulationRequest(BaseModel):
    base_discharge: float = 45.0
    temp_anomaly: float = 3.5
    cloudburst_rain_mm: float = 75.0
    current_temp: float = 12.0
    antecedent_rain_3d: float = 30.0
    threshold_90: float = 80.0


class LivePredictionRequest(BaseModel):
    """Manual field inputs for instant real-time flood prediction."""
    discharge: float          # Today's river flow (m³/s)
    q_lag1: float             # Yesterday's river flow (m³/s)
    q_lag2: float             # 2 days ago river flow (m³/s)
    q_lag3: float             # 3 days ago river flow (m³/s)
    temp_mean: float          # Today's mean temperature (°C)
    precip: float             # Today's total precipitation (mm)
    rain: float               # Today's liquid rainfall (mm)
    precip_3d: float          # Last 3-day cumulative precipitation (mm)
    precip_7d: float          # Last 7-day cumulative precipitation (mm)
    rain_3d: float            # Last 3-day liquid rainfall (mm)
    temp_3d: float            # Last 3-day mean temperature (°C)
    degree_day_melt: float    # Today's degree-day melt energy (°C·d)
    degree_day_melt_3d: float # Last 3-day cumulative melt energy
    temp_warming_anomaly: float  # Temp above 30-day baseline (°C)
    month: int                # Current month (1-12)
    season_sin: float         # Monsoon sine harmonic
    season_cos: float         # Monsoon cosine harmonic
    is_monsoon: int           # 1 if Jun-Sep, else 0
    station_id: str = "imja"  # Which station's trained model to use


# Cache in-memory forecast results for rapid station toggling
_FORECAST_CACHE: Dict[str, Any] = {}
_BACKTEST_CACHE: Optional[list] = None
_MODEL_CACHE: Dict[str, Any] = {}  # Stores trained ML models for live /api/predict


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "HimAlert AI - Himalayan Flood Early Warning System",
        "engine": "Open-Meteo GloFAS v4 + ERA5 Reanalysis + Scikit-Learn"
    }


@app.get("/api/stations")
def get_stations():
    """Returns list of pre-configured Himalayan monitoring stations."""
    return {"stations": get_all_stations()}


@app.get("/api/forecast")
def get_forecast(
    station_id: Optional[str] = Query("imja", description="Station identifier"),
    lat: Optional[float] = Query(None, description="Custom latitude"),
    lon: Optional[float] = Query(None, description="Custom longitude"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    split_date: Optional[str] = Query("2021-01-01", description="Train/test cutoff date"),
    threshold_pct: Optional[float] = Query(0.90, description="Flood threshold percentile"),
    force_refresh: Optional[bool] = Query(False, description="Bypass local cache")
):
    """
    Computes time-series predictions and multi-tier flood risk assessment
    using real Open-Meteo flood & weather data.
    """
    # Resolve station coordinates
    target_name = "Custom Himalayan Coordinates"
    target_region = "High Altitude Basin"
    target_risk = "Glacial & Rainfall Runoff"
    
    if station_id and station_id in HIMALAYAN_STATIONS:
        st = HIMALAYAN_STATIONS[station_id]
        target_lat = st["lat"]
        target_lon = st["lon"]
        target_name = st["name"]
        target_region = st["region"]
        target_risk = st["risk_type"]
        s_date = start_date or st.get("default_start", "2016-01-01")
        e_date = end_date or st.get("default_end", "2023-12-31")
    else:
        if lat is None or lon is None:
            raise HTTPException(status_code=400, detail="Must provide either valid station_id or lat and lon coordinates")
        target_lat = lat
        target_lon = lon
        s_date = start_date or "2016-01-01"
        e_date = end_date or "2023-12-31"

    cache_key = f"{target_lat}_{target_lon}_{s_date}_{e_date}_{split_date}_{threshold_pct}"
    if not force_refresh and cache_key in _FORECAST_CACHE:
        logger.info(f"Serving forecast from memory cache: {cache_key}")
        return _FORECAST_CACHE[cache_key]

    try:
        # Download or retrieve cached dataset
        df = fetch_himalayan_data(target_lat, target_lon, s_date, e_date, force_refresh=force_refresh)
        if df.empty or len(df) < 50:
            raise HTTPException(
                status_code=502,
                detail="Unable to fetch sufficient hydrological data for specified coordinates and date range."
            )

        pipeline_res = train_and_evaluate_pipeline(
            df=df,
            split_date=split_date,
            percentile_threshold=threshold_pct,
            rf_trees=250
        )

        response_data = {
            "station": {
                "id": station_id or "custom",
                "name": target_name,
                "region": target_region,
                "risk_type": target_risk,
                "lat": target_lat,
                "lon": target_lon,
                "start_date": s_date,
                "end_date": e_date
            },
            "current_status": pipeline_res["current_status"],
            "metrics": pipeline_res["metrics"],
            "feature_importances": pipeline_res["feature_importances"],
            "timeline": pipeline_res["timeline"],
            "summary": {
                "train_rows": pipeline_res["train_rows"],
                "test_rows": pipeline_res["test_rows"],
                "split_date": pipeline_res["split_date"],
                "flood_threshold_m3s": pipeline_res["threshold_m3s"]
            }
        }

        _FORECAST_CACHE[cache_key] = response_data
        # Cache trained models separately for live prediction endpoint
        _MODEL_CACHE[cache_key] = (pipeline_res["rf_model"], pipeline_res["clf_model"])
        return response_data

    except Exception as e:
        logger.exception("Error during forecast generation")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/events")
def get_historical_disasters():
    """Runs or returns cached retrospective backtests on landmark Himalayan flood disasters."""
    global _BACKTEST_CACHE
    if _BACKTEST_CACHE is None:
        logger.info("Executing retrospective historical disaster backtests...")
        _BACKTEST_CACHE = run_all_backtests()
    return {"events": _BACKTEST_CACHE}


@app.post("/api/simulate")
def run_simulation(req: SimulationRequest):
    """Interactive What-If climate & cloudburst simulation."""
    res = simulate_cryospheric_surge(
        base_discharge=req.base_discharge,
        temp_anomaly=req.temp_anomaly,
        cloudburst_rain_mm=req.cloudburst_rain_mm,
        current_temp=req.current_temp,
        antecedent_rain_3d=req.antecedent_rain_3d,
        threshold_90=req.threshold_90
    )
    return res


@app.get("/api/report")
def get_report():
    """Returns the comprehensive scientific report with the 7 critical limitations."""
    return get_scientific_report()


@app.post("/api/predict")
def live_predict(req: LivePredictionRequest):
    """
    Real-time flood prediction from manually entered field observations.
    Uses the last trained RF model for the selected station.
    Returns predicted discharge, flood probability, and alert tier.
    """
    import numpy as np

    # Find cached model for the requested station
    station_cache_key = None
    for key in _FORECAST_CACHE:
        if key.startswith(f"{req.station_id}_") or req.station_id in key:
            station_cache_key = key
            break
    # Fallback: use any cached model
    if station_cache_key is None and _FORECAST_CACHE:
        station_cache_key = next(iter(_FORECAST_CACHE))

    if station_cache_key is None:
        raise HTTPException(
            status_code=503,
            detail="No trained model available. Please load a station forecast first."
        )

    from backend.ml_engine import FEATURE_COLUMNS
    cached = _FORECAST_CACHE[station_cache_key]

    # Retrieve trained models stored in the pipeline result cache
    # We need to re-run the pipeline but use cached models if available
    # Use the flood threshold from cached summary
    threshold = cached["summary"]["flood_threshold_m3s"]

    # Build the feature vector in correct order
    feature_vector = [
        req.discharge, req.q_lag1, req.q_lag2, req.q_lag3,
        req.precip, req.precip_3d, req.precip_7d, req.rain_3d,
        req.temp_mean, req.temp_3d, req.degree_day_melt, req.degree_day_melt_3d,
        req.temp_warming_anomaly, req.month, req.season_sin, req.season_cos, req.is_monsoon
    ]

    X = np.array([feature_vector])

    # Get or auto-train model for this station
    global _MODEL_CACHE
    model_key = station_cache_key

    if model_key not in _MODEL_CACHE:
        # Auto-train: fetch data and train model on demand
        logger.info(f"Model not in cache for key {model_key}. Auto-training now...")
        try:
            # Resolve station coords from cache key
            key_parts = model_key.split("_")
            auto_lat = float(key_parts[0])
            auto_lon = float(key_parts[1])
            auto_start = key_parts[2]
            auto_end = key_parts[3]
            auto_split = key_parts[4] if len(key_parts) > 4 else "2021-01-01"
            auto_thr = float(key_parts[5]) if len(key_parts) > 5 else 0.90

            df_auto = fetch_himalayan_data(auto_lat, auto_lon, auto_start, auto_end)
            pipeline_auto = train_and_evaluate_pipeline(
                df=df_auto,
                split_date=auto_split,
                percentile_threshold=auto_thr,
                rf_trees=250
            )
            _MODEL_CACHE[model_key] = (pipeline_auto["rf_model"], pipeline_auto["clf_model"])
            # Also update threshold from fresh training
            threshold = float(pipeline_auto["threshold_m3s"])
        except Exception as train_err:
            raise HTTPException(
                status_code=503,
                detail=f"Model not trained yet. Please click 'Live Sync' on the dashboard first, then retry. ({str(train_err)})"
            )


    rf_reg, rf_clf = _MODEL_CACHE[model_key]

    predicted_q = float(rf_reg.predict(X)[0])
    proba_matrix = rf_clf.predict_proba(X)
    if 1 in rf_clf.classes_:
        class_1_idx = list(rf_clf.classes_).index(1)
        flood_prob = float(proba_matrix[0, class_1_idx])
    else:
        flood_prob = 0.0

    threshold_watch = threshold * 0.85
    threshold_critical = threshold * 1.08

    if predicted_q > threshold_critical or flood_prob >= 0.75:
        alert = "CRITICAL / EMERGENCY"
        alert_color = "#E63946"
        alert_desc = "Extreme discharge surge predicted. High risk of glacial breach or flash flood."
        alert_icon = "triangle-exclamation"
    elif predicted_q > threshold or flood_prob >= 0.50:
        alert = "WARNING"
        alert_color = "#F4A261"
        alert_desc = "Discharge exceeds 90th percentile. Glacial melt & runoff warning in effect."
        alert_icon = "circle-exclamation"
    elif predicted_q > threshold_watch or flood_prob >= 0.30:
        alert = "WATCH"
        alert_color = "#E9C46A"
        alert_desc = "Elevated river stage detected. Monitor upstream tributary conditions."
        alert_icon = "eye"
    else:
        alert = "SAFE / NORMAL"
        alert_color = "#2A9D8F"
        alert_desc = "River flow within normal seasonal variance. No immediate flood risk."
        alert_icon = "circle-check"

    return {
        "predicted_discharge_m3s": round(predicted_q, 3),
        "flood_probability_pct": round(flood_prob * 100, 1),
        "flood_threshold_m3s": round(threshold, 3),
        "alert_tier": alert,
        "alert_color": alert_color,
        "alert_desc": alert_desc,
        "alert_icon": alert_icon,
        "inputs_used": len(feature_vector),
        "model_station": req.station_id
    }


# Mount static assets for frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
