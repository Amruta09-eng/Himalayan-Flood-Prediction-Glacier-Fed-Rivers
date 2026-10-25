"""
Himalayan Flood Prediction - Data Manager & Open-Meteo Integration
Handles robust data fetching, local caching, cryospheric weather variables, and GloFAS river discharge.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
import requests
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataManager")

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Predefined Himalayan Stations with cryospheric relevance
HIMALAYAN_STATIONS = {
    "imja": {
        "id": "imja",
        "name": "Imja Glacial Lake & Dudh Koshi",
        "region": "Khumbu / Everest Region, Nepal",
        "lat": 27.90,
        "lon": 86.92,
        "altitude_m": 5010,
        "risk_type": "Moraine-dammed Glacial Lake Outburst (GLOF)",
        "river": "Dudh Koshi / Koshi Basin",
        "description": "One of the most studied glacial lakes in the Himalayas, expanding rapidly due to glacier melt with high downstream flood vulnerability.",
        "default_start": "2010-01-01",
        "default_end": "2023-12-31"
    },
    "kedarnath": {
        "id": "kedarnath",
        "name": "Kedarnath / Mandakini Basin",
        "region": "Rudraprayag, Uttarakhand, India",
        "lat": 30.73,
        "lon": 79.07,
        "altitude_m": 3584,
        "risk_type": "Cloudburst & Moraine Breach (Chorabari Lake)",
        "river": "Mandakini / Alaknanda",
        "description": "Site of the catastrophic June 2013 flash flood caused by multi-day cloudbursts and the bursting of Chorabari glacial lake.",
        "default_start": "2010-01-01",
        "default_end": "2023-12-31"
    },
    "chamoli": {
        "id": "chamoli",
        "name": "Chamoli / Rishiganga Gorge",
        "region": "Garhwal Himalayas, Uttarakhand, India",
        "lat": 30.40,
        "lon": 79.70,
        "altitude_m": 1900,
        "risk_type": "Rock-Ice Avalanche & Flash Flood",
        "river": "Rishiganga / Dhauliganga",
        "description": "Site of the February 2021 disaster when a hanging glacier and rock wall collapsed from Ronti Peak, triggering an enormous debris surge.",
        "default_start": "2015-01-01",
        "default_end": "2023-12-31"
    },
    "lhonak": {
        "id": "lhonak",
        "name": "South Lhonak Glacial Lake",
        "region": "North Sikkim, India",
        "lat": 27.80,
        "lon": 88.40,
        "altitude_m": 5200,
        "risk_type": "Glacial Lake Outburst (GLOF) & Dam Breach",
        "river": "Teesta River",
        "description": "Site of the devastating October 2023 GLOF that swept away the Chungthang dam, bridges, and military installations downstream.",
        "default_start": "2015-01-01",
        "default_end": "2023-12-31"
    },
    "sutlej": {
        "id": "sutlej",
        "name": "Kinnaur / Upper Sutlej Basin",
        "region": "Himachal Pradesh, India",
        "lat": 31.55,
        "lon": 78.25,
        "altitude_m": 2200,
        "risk_type": "Glacial Snowmelt & Monsoon Cloudburst",
        "river": "Sutlej River",
        "description": "High-altitude gorge system prone to combined Tibetan glacial melt and heavy monsoon runoff, threatening hydro dams.",
        "default_start": "2015-01-01",
        "default_end": "2023-12-31"
    },
    "kosi": {
        "id": "kosi",
        "name": "Kosi River (Chatra / Bhimnagar)",
        "region": "Sunsari / Bihar Border, Nepal-India",
        "lat": 26.60,
        "lon": 86.90,
        "altitude_m": 140,
        "risk_type": "Downstream Megafan Flooding & Avulsion",
        "river": "Kosi River",
        "description": "Drains the central-eastern Himalayas including Everest. Scene of the 2008 Kusaha embankment breach causing massive flooding.",
        "default_start": "2005-01-01",
        "default_end": "2020-12-31"
    }
}


def get_cache_path(lat: float, lon: float, start_date: str, end_date: str) -> str:
    """Generate deterministic cache filename based on coordinates and date range."""
    filename = f"hima_data_{lat:.3f}_{lon:.3f}_{start_date}_{end_date}.csv"
    return os.path.join(CACHE_DIR, filename)


def fetch_discharge_chunk(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    """Download daily river discharge from Open-Meteo Flood API (GloFAS)."""
    url = "https://flood-api.open-meteo.com/v1/flood"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "river_discharge",
        "start_date": start,
        "end_date": end
    }
    logger.info(f"Fetching Flood API: lat={lat}, lon={lon}, {start} to {end}")
    try:
        r = requests.get(url, params=params, timeout=45)
        r.raise_for_status()
        data = r.json()
        if "daily" not in data or "time" not in data["daily"]:
            logger.warning(f"Flood API returned no daily data for {lat}, {lon}")
            return pd.DataFrame(columns=["date", "discharge"])
        
        times = data["daily"]["time"]
        discharges = data["daily"]["river_discharge"]
        return pd.DataFrame({
            "date": pd.to_datetime(times),
            "discharge": discharges
        })
    except Exception as e:
        logger.error(f"Error fetching discharge: {e}")
        return pd.DataFrame(columns=["date", "discharge"])


def fetch_weather_chunk(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    """Download cryospheric weather (temp, rain, snow) from Open-Meteo Historical Archive API (ERA5)."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,snowfall_sum",
        "start_date": start,
        "end_date": end
    }
    logger.info(f"Fetching Weather API: lat={lat}, lon={lon}, {start} to {end}")
    try:
        r = requests.get(url, params=params, timeout=45)
        r.raise_for_status()
        data = r.json()
        if "daily" not in data or "time" not in data["daily"]:
            logger.warning(f"Weather API returned no daily data for {lat}, {lon}")
            return pd.DataFrame(columns=["date", "temp_mean", "temp_max", "temp_min", "precip", "rain", "snow"])
        
        d = data["daily"]
        return pd.DataFrame({
            "date": pd.to_datetime(d["time"]),
            "temp_mean": d.get("temperature_2m_mean"),
            "temp_max": d.get("temperature_2m_max"),
            "temp_min": d.get("temperature_2m_min"),
            "precip": d.get("precipitation_sum"),
            "rain": d.get("rain_sum", d.get("precipitation_sum")),
            "snow": d.get("snowfall_sum", [0] * len(d["time"]))
        })
    except Exception as e:
        logger.error(f"Error fetching weather: {e}")
        return pd.DataFrame(columns=["date", "temp_mean", "temp_max", "temp_min", "precip", "rain", "snow"])


def fetch_himalayan_data(lat: float, lon: float, start_date: str, end_date: str, force_refresh: bool = False) -> pd.DataFrame:
    """
    Downloads or retrieves cached combined hydrological & meteorological dataset.
    Splits into 5-year chunks to guarantee reliability across large timespans.
    """
    cache_path = get_cache_path(lat, lon, start_date, end_date)
    
    if not force_refresh and os.path.exists(cache_path):
        logger.info(f"Loading cached dataset from {cache_path}")
        df = pd.read_csv(cache_path, parse_dates=["date"])
        if not df.empty and len(df) > 10:
            return df
    
    # Chunking by 5 years
    s_year = int(start_date.split("-")[0])
    e_year = int(end_date.split("-")[0])
    
    discharge_frames = []
    weather_frames = []
    
    curr = s_year
    while curr <= e_year:
        chunk_end_year = min(curr + 4, e_year)
        c_start = f"{curr}-01-01"
        c_end = f"{chunk_end_year}-12-31"
        
        # Clamp to bounds
        if curr == s_year:
            c_start = start_date
        if chunk_end_year == e_year:
            c_end = end_date
            
        q_chunk = fetch_discharge_chunk(lat, lon, c_start, c_end)
        if not q_chunk.empty:
            discharge_frames.append(q_chunk)
            
        w_chunk = fetch_weather_chunk(lat, lon, c_start, c_end)
        if not w_chunk.empty:
            weather_frames.append(w_chunk)
            
        curr = chunk_end_year + 1

    if not discharge_frames or not weather_frames:
        logger.error("Failed to fetch either discharge or weather data")
        return pd.DataFrame()

    q_df = pd.concat(discharge_frames).drop_duplicates("date").sort_values("date")
    w_df = pd.concat(weather_frames).drop_duplicates("date").sort_values("date")
    
    # Merge on date
    merged = q_df.merge(w_df, on="date", how="inner").sort_values("date").reset_index(drop=True)
    
    # Clean nulls
    merged["discharge"] = pd.to_numeric(merged["discharge"], errors="coerce")
    merged["temp_mean"] = pd.to_numeric(merged["temp_mean"], errors="coerce")
    merged["precip"] = pd.to_numeric(merged["precip"], errors="coerce").fillna(0.0)
    merged["rain"] = pd.to_numeric(merged["rain"], errors="coerce").fillna(0.0)
    merged["snow"] = pd.to_numeric(merged["snow"], errors="coerce").fillna(0.0)
    
    # Interpolate small gaps in discharge / temperature
    merged["discharge"] = merged["discharge"].interpolate(method="linear").bfill().ffill()
    merged["temp_mean"] = merged["temp_mean"].interpolate(method="linear").bfill().ffill()
    
    merged = merged.dropna().reset_index(drop=True)
    
    if len(merged) > 30:
        merged.to_csv(cache_path, index=False)
        logger.info(f"Saved {len(merged)} records to cache at {cache_path}")
        
    return merged


def get_station_info(station_id: str) -> Optional[Dict[str, Any]]:
    return HIMALAYAN_STATIONS.get(station_id)


def get_all_stations() -> list:
    return list(HIMALAYAN_STATIONS.values())
