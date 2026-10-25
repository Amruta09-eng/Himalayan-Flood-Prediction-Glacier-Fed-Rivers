# Himalayan Glacial Flood Early Warning System (HimAlert AI)

**Project 2: Himalayan Flood Prediction & Disaster Risk Analytics**  
*Real-world Hydrometeorological Machine Learning with Open-Meteo GloFAS River Discharge & ERA5 Reanalysis*

---

## 🏔️ 1. Project Overview

HimAlert AI is an end-to-end predictive early warning platform tailored to high-altitude cryospheric river basins in the Himalayas (Hindu Kush Himalaya - HKH).

Unlike standard lowland floods, Himalayan floods are driven by:
1. **Glacial Lake Outburst Floods (GLOFs)**: Sudden failures of moraine dams holding back rapidly expanding proglacial lakes (e.g. Imja, South Lhonak).
2. **Coupled Monsoon Cloudbursts**: Extreme convective storms dropping >100 mm in <2 hours on steep mountain slopes.
3. **Thermal Glacial Ablation**: Positive degree-day heating pulses causing rapid snow and ice melt surges.

---

## ⚡ 2. Quickstart - How to Run

### Option A: One-Command Instant Launch (Recommended)
From your terminal in `Himalayan_Flood_Project_v2`:
```bash
python main.py
```
This automatically starts the FastAPI backend server on `http://127.0.0.1:8000` and opens your default browser!

### Option B: Direct Uvicorn Server Launch
```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```
Then visit: `http://127.0.0.1:8000` in your web browser.

---

## 🛠️ 3. Architecture & Key Features

### Backend (`/backend`)
- **`data_manager.py`**: Fetches daily river discharge from ECMWF GloFAS v4 (via Open-Meteo Flood API) and cryospheric weather variables (mean/max temp, precipitation, rain vs snow sum) via Open-Meteo Historical Archive API. Includes local caching in `data_cache/` for instant sub-second station toggling.
- **`ml_engine.py`**:
  - Time-series lag feature extraction ($Q_t, Q_{t-1}, Q_{t-2}, Q_{t-3}$).
  - 3-day and 7-day antecedent precipitation index ($\sum P_{3d}, \sum P_{7d}$).
  - Degree-day thermal melt energy ($\max(0, T)$) and 30-day warming anomaly detection.
  - Multi-tier alert classification (Normal, Watch, Warning, Emergency) based on training-set percentiles.
  - Strict chronological train/test splitting (zero data leakage).
  - Models: Persistence Baseline, Random Forest Regressor & Classifier, Gradient Boosting.
  - Metrics: MAE, RMSE, $R^2$, Precision, Recall, F1-Score, False Alarm Ratio (FAR), Critical Success Index (CSI).
- **`backtesting.py`**: Retrospective walk-forward forensic backtesting across verified Himalayan catastrophes:
  - 2013 Kedarnath Cloudburst & Moraine Breach (Uttarakhand)
  - 2021 Chamoli Rock-Ice Avalanche Surge (Uttarakhand)
  - 2023 South Lhonak Glacial Lake Outburst (Sikkim)
  - 2008 Kosi Embankment Breach (Indo-Nepal)
  - 2026 High-Altitude Glacier Surges
- **`simulator.py`**: Interactive "What-If" engine simulating heatwave anomalies ($\Delta T$), cloudburst rain, and antecedent moisture with runoff source partitioning.
- **`scientific_report.py`**: Full academic research documentation including the 7 critical limitations of macro-hydrological models in steep mountain terrains.
- **`app.py`**: Clean RESTful FastAPI backend serving data, predictions, and the frontend web app.

### Frontend (`/frontend`)
- **Telemetry & Forecast Hub**:
  - Real-time gauge metrics (Today's flow, +24h predicted flow, early warning tier, exceedance probability, degree-day melt index).
  - Interactive Leaflet GIS Map with high-risk Himalayan glacial lakes and river basins.
  - Multi-axis hydrograph charts (Actual vs Predicted flow, 90th percentile threshold, rainfall overlay).
  - Model benchmark comparison table with confusion matrix.
  - Permutation feature importance chart.
- **"What-If" Climate Simulator**:
  - Real-time sliders for $\Delta T$ warming, cloudburst precipitation, antecedent moisture, and base discharge.
  - Dynamic surge calculation, alert level, and source partitioning (Direct Rain % vs Glacier Melt % vs Rain-on-Snow Coupling %).
- **Historical Disaster Backtesting**:
  - Visual forensic cards for historic disasters with lead-time warnings and scientific explanations for detections or omissions.
- **Scientific Report & Limitations Reader**:
  - Full academic paper format directly readable and printable to PDF.

---

## 🔬 4. The 7 Critical Model Limitations (Honest Appraisal)

An honest scientific report must highlight the model's physical and computational constraints:

1. **Spatial Grid Mismatch (~5 km Grid vs 100 m Gorges):** GloFAS 0.05° grid averages high peaks and steep canyons, smoothing out local slope hydraulics.
2. **The GLOF Geotechnical Blindspot:** Glacial lake outbursts are caused by moraine dam structural failure or hanging glacier collapse, which cannot be foreseen solely by meteorological rainfall models.
3. **Extreme Event Sparsity:** Catastrophic floods occur once every 5–10 years, making parameter estimation on the extreme upper tail prone to variance.
4. **ERA5 Cloudburst Smoothing:** Localized mountain convective storms (1–3 km wide) are smoothed across broader grid cells, underestimating peak instantaneous rainfall intensities.
5. **Lack of Dynamic Satellite Bathymetry:** The model lacks daily satellite radar/optical inputs tracking changes in glacial lake perimeter, volume, or ice tongue calving.
6. **24-Hour Daily Aggregation vs Sub-Hourly Hydrographs:** GloFAS daily discharge averages flow over 24 hours. A GLOF wave peaks and travels downstream in 30–90 minutes; daily averaging dampens the true lethal peak stage.
7. **Sediment Bulking & Riverbed Avulsion:** Himalayan flash floods carry up to 50% sediment and boulders by volume. Debris damming and avulsion cause severe flooding at water discharges well below historic flood stages.

---

## 🌐 5. Pre-Configured Himalayan Stations

| Station Key | Name & River | Region | Lat / Lon | Hazard Mechanism |
|---|---|---|---|---|
| `imja` | Imja Glacial Lake (Dudh Koshi) | Khumbu / Everest, Nepal | 27.90° N, 86.92° E | Moraine-dammed GLOF |
| `kedarnath` | Kedarnath (Mandakini / Alaknanda) | Rudraprayag, Uttarakhand | 30.73° N, 79.07° E | Cloudburst & Chorabari Breach |
| `chamoli` | Chamoli (Rishiganga / Dhauliganga) | Garhwal, Uttarakhand | 30.40° N, 79.70° E | Rock-Ice Avalanche Flood |
| `lhonak` | South Lhonak Lake (Teesta) | North Sikkim, India | 27.80° N, 88.40° E | Glacial Lake Outburst (GLOF) |
| `sutlej` | Kinnaur (Upper Sutlej Basin) | Himachal Pradesh, India | 31.55° N, 78.25° E | Glacial Melt & Cloudburst |
| `kosi` | Kosi Basin (Chatra / Bhimnagar) | Sunsari / Bihar Border | 26.60° N, 86.90° E | River Avulsion & Silt Overload |
