# HimAlert AI — Developer Notes & Contribution Guide

## Setting Up for Development

```bash
# Clone the repository
git clone https://github.com/Amruta09-eng/Himalayan-Flood-Prediction-Glacier-Fed-Rivers.git
cd Himalayan-Flood-Prediction-Glacier-Fed-Rivers

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch the app
python main.py
```

## Backend API — Dev Mode (with hot reload)

```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

## Testing the ML Pipeline Standalone

```bash
# Test data fetching and ML training for a single station
python -c "
from backend.data_manager import fetch_himalayan_data
from backend.ml_engine import train_and_evaluate_pipeline
df, meta = fetch_himalayan_data('imja')
result = train_and_evaluate_pipeline(df, meta)
print('Metrics:', result['metrics'])
"
```

## Adding a New Monitoring Station

1. Open `backend/data_manager.py`
2. Add an entry to the `HIMALAYAN_STATIONS` dict:
```python
"my_station": {
    "id": "my_station",
    "name": "Station Name & River",
    "region": "Region, Country",
    "lat": 28.0,
    "lon": 85.0,
    "altitude_m": 3000,
    "risk_type": "Hazard Type",
    "river": "River Name",
    "description": "Description of the location and risk.",
    "default_start": "2010-01-01",
    "default_end": "2023-12-31"
}
```
3. Add the `<option>` to `frontend/index.html` station selector dropdown
4. Restart the backend

## Project Architecture Notes

### Data Flow

```
Open-Meteo APIs (GloFAS + ERA5)
        ↓
data_manager.py  →  data_cache/ (local CSV)
        ↓
ml_engine.py  →  Feature engineering → Model training → Predictions
        ↓
app.py  →  FastAPI REST endpoints
        ↓
frontend/  →  Charts, GIS map, simulator, backtests
```

### Feature Engineering Details

| Feature | Formula | Description |
|---|---|---|
| `q_lag1` | Q(t-1) | Discharge 1 day ago |
| `q_lag2` | Q(t-2) | Discharge 2 days ago |
| `q_lag3` | Q(t-3) | Discharge 3 days ago |
| `precip_3d` | ΣP(3d) | 3-day antecedent precipitation |
| `precip_7d` | ΣP(7d) | 7-day antecedent precipitation |
| `degree_day_melt` | max(0, T) | Degree-day thermal melt energy |
| `temp_warming_anomaly` | T - T̄(30d) | Temp deviation from 30-day mean |
| `season_sin` | sin(2π·month/12) | Monsoon seasonal encoding |
| `is_monsoon` | 1 if Jun-Sep | Binary monsoon flag |

### Alert Tier Thresholds (training-set percentiles)

| Tier | Threshold |
|---|---|
| 🟢 Normal | < 75th percentile |
| 🟡 Watch | 75th–90th percentile |
| 🟠 Warning | 90th–95th percentile |
| 🔴 Emergency | > 95th percentile |

## Contributing

1. Fork the repo and create a feature branch
2. Follow existing code style (type hints, docstrings)
3. Test with at least one station before submitting a PR
4. Update `RUN_GUIDE.md` if you add new features

## Known Issues

- `data_cache/` CSVs with very long date ranges can be slow on first load (subsequent loads are instant)
- The `__pycache__` directories are excluded via `.gitignore`
- Chamoli 2021 backtesting will correctly flag **no meteorological precursor** (geological event — this is expected behavior)
