# 🏔️ Himalayan Flood Prediction & Glacier-Fed Rivers — HimAlert AI

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![ML](https://img.shields.io/badge/ML-Scikit--Learn-orange?logo=scikit-learn)](https://scikit-learn.org/)
[![Data](https://img.shields.io/badge/Data-GloFAS%20%26%20ERA5-4b9cd3)](https://open-meteo.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?logo=render)](https://himalayan-flood-prediction-glacier-fed-dyvg.onrender.com/)

> 🌐 **Live App:** [himalayan-flood-prediction-glacier-fed-dyvg.onrender.com](https://himalayan-flood-prediction-glacier-fed-dyvg.onrender.com/)

> **HimAlert AI** — An end-to-end predictive early warning platform for high-altitude cryospheric river basins across the Himalayas. Built with real hydrometeorological data from Open-Meteo GloFAS v4 river discharge and ERA5 reanalysis.

---

## 🌊 Project Overview

Himalayan floods are uniquely driven by three mechanisms that standard lowland flood models miss:

| Mechanism | Description |
|---|---|
| 🧊 **GLOF** | Glacial Lake Outburst Floods — sudden moraine dam failures |
| ⛈️ **Monsoon Cloudbursts** | Extreme convective storms dropping >100mm in <2 hours |
| ☀️ **Thermal Ablation** | Degree-day heating causing rapid snow & ice melt surges |

---

## ⚡ Quickstart

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch the full application (backend + opens browser automatically)
python main.py
```

Visit **http://127.0.0.1:8000** — the interactive dashboard loads automatically.

---

## 🗂️ Project Structure

```
Himalayan-Flood-Prediction-Glacier-Fed-Rivers/
│
├── backend/                         # FastAPI backend
│   ├── app.py                       # REST API routes & frontend serving
│   ├── data_manager.py              # GloFAS + ERA5 data fetching & caching
│   ├── ml_engine.py                 # Feature engineering & ML models
│   ├── backtesting.py               # Forensic backtesting on historic disasters
│   ├── simulator.py                 # What-If climate surge simulator
│   └── scientific_report.py        # Academic research documentation
│
├── frontend/                        # Interactive web dashboard
│   ├── index.html                   # Main SPA entry point
│   ├── css/style.css                # Custom design system (dark/light themes)
│   └── js/app.js                    # Dashboard logic, charts, maps
│
├── colab_research/                  # Google Colab research notebooks
│   ├── fetch_and_model.py           # Base ML model (run in Colab)
│   ├── events_test.py               # Flood event backtesting script
│   ├── flood_events.csv             # Verified Himalayan flood event dataset
│   └── README.md                    # Colab usage guide
│
├── data_cache/                      # Local CSV cache (auto-generated)
├── main.py                          # One-command app launcher
├── requirements.txt                 # Python dependencies
└── RUN_GUIDE.md                     # Detailed run guide & architecture docs
```

---

## 🔬 ML Pipeline

- **Data**: Daily GloFAS river discharge + ERA5 cryospheric weather variables
- **Features**: Lag flows (Q_t, Q_t-1, Q_t-2, Q_t-3), 3-day & 7-day antecedent precipitation, degree-day melt energy, 30-day warming anomaly, monsoon harmonic encoding
- **Models**: Persistence Baseline → Random Forest Regressor → Random Forest Classifier → Gradient Boosting
- **Evaluation**: MAE, RMSE, R², Precision, Recall, F1, False Alarm Ratio (FAR), Critical Success Index (CSI)
- **Split**: Strict chronological train/test — **zero data leakage**

---

## 🗺️ Pre-Configured Himalayan Monitoring Stations

| Station | River / Region | Hazard Type |
|---|---|---|
| 🇳🇵 **Imja Glacial Lake** | Dudh Koshi, Everest Nepal | Moraine-dammed GLOF |
| 🇮🇳 **Kedarnath** | Mandakini, Uttarakhand | Cloudburst + Chorabari Breach |
| 🇮🇳 **Chamoli** | Rishiganga, Uttarakhand | Rock-Ice Avalanche |
| 🇮🇳 **South Lhonak** | Teesta, Sikkim | Glacial Lake Outburst |
| 🇮🇳 **Kinnaur / Sutlej** | Upper Sutlej, Himachal Pradesh | Glacial Melt + Cloudburst |
| 🇮🇳 **Kosi Basin** | Kosi, Bihar / Nepal Border | River Avulsion & Silt Overload |

---

## 🌐 Dashboard Features

- 📡 **Telemetry Hub** — Real-time gauge metrics: flow, 24h forecast, alert tier, exceedance probability, degree-day melt index
- 🗺️ **GIS Map** — Interactive Leaflet map of high-risk glacial lakes & river basins
- 📈 **Hydrographs** — Actual vs. Predicted flow with 90th percentile threshold & rainfall overlay
- 🤖 **Model Benchmarks** — Comparison table with confusion matrix & feature importance chart
- 🔭 **What-If Simulator** — Real-time ΔT warming, cloudburst mm, antecedent moisture sliders with source partitioning
- 🕰️ **Historical Backtesting** — Forensic cards for 2013 Kedarnath, 2021 Chamoli, 2023 Lhonak, 2008 Kosi disasters
- 📄 **Scientific Report** — Full academic paper format with model limitations

---

## ⚠️ Model Limitations (Honest Appraisal)

1. **~5 km Grid Resolution** — GloFAS averages steep gorges into grid cells
2. **GLOF Geotechnical Blindspot** — Moraine failures need structural monitoring, not just weather models
3. **Extreme Event Sparsity** — Catastrophic floods occur once every 5–10 years
4. **ERA5 Cloudburst Smoothing** — 1–3 km convective storms underestimated in reanalysis
5. **No Dynamic Lake Bathymetry** — Lacks daily satellite glacial lake volume tracking
6. **24h Aggregation** — Daily GloFAS averages dampen GLOF wave peaks (30–90 min events)
7. **Sediment Bulking** — Up to 50% sediment by volume causes avulsion at sub-peak discharge

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | System health check |
| GET | `/api/stations` | List all monitoring stations |
| GET | `/api/forecast?station_id=imja` | Run ML forecast for a station |
| GET | `/api/events` | Historical disaster backtests |
| POST | `/api/simulate` | Run What-If climate simulation |
| GET | `/api/report` | Get full scientific report |
| POST | `/api/predict` | Live prediction with custom inputs |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI, Uvicorn |
| ML | Scikit-Learn (Random Forest, Gradient Boosting) |
| Data | Open-Meteo GloFAS v4, ERA5 Reanalysis |
| Frontend | HTML5, Vanilla CSS, JavaScript, Chart.js, Leaflet.js |
| Maps | Leaflet.js with OSM tiles |
| Fonts | Inter, Outfit, JetBrains Mono (Google Fonts) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👩‍💻 Author

**Amruta M Patil** — [@Amruta09-eng](https://github.com/Amruta09-eng)

> *"The Himalayas don't flood like lowland rivers. This system is built for that difference."*
