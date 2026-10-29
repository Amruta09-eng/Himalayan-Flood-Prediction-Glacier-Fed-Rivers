# 🏔️ Himalayan Flood Prediction & Glacier-Fed Rivers — HimAlert AI

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![ML](https://img.shields.io/badge/ML-Scikit--Learn-orange?logo=scikit-learn)](https://scikit-learn.org/)
[![Data](https://img.shields.io/badge/Data-GloFAS%20%26%20ERA5-4b9cd3)](https://open-meteo.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Website](https://img.shields.io/badge/Website-Visit-46E3B7?logo=googlechrome)](https://himalayan-flood-prediction-glacier-fed-rivers.ai.studio/)

> 🌐 **Website:** [HimAlert AI — Himalayan Flood Prediction & Glacier-Fed Rivers](https://himalayan-flood-prediction-glacier-fed-rivers.ai.studio/)

> 💻 **GitHub Repository:** [Himalayan Flood Prediction & Glacier-Fed Rivers](https://github.com/Amruta09-eng/Himalayan-Flood-Prediction-Glacier-Fed-Rivers)

**HimAlert AI** is an early-warning and flood-risk awareness platform for high-altitude, glacier-fed river basins across the Himalayas. The project explores hydrometeorological data, machine learning, river-flow forecasting, and flood-risk scenarios to support better understanding of potential flood hazards.

---

## 🌊 Project Overview

Himalayan floods can result from several interacting hazards that require specialised monitoring and analysis.

| Mechanism | Description |
|---|---|
| 🧊 **GLOF** | Glacial Lake Outburst Floods caused by sudden releases of water from glacial lakes |
| ⛈️ **Monsoon Cloudbursts** | Intense rainfall that can trigger flash floods and landslides |
| ☀️ **Thermal Ablation** | Snow and ice melt that can contribute to increased river discharge |

The project is inspired by devastating flood events in the Himalayan region, including disasters in Nepal, and aims to improve flood-risk awareness through an interactive website.

---

## ⚡ Quickstart

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch the application
python main.py
```

Visit **http://127.0.0.1:8000** to access the locally running website, assuming the backend starts successfully on that address.

---

## 🗂️ Project Structure

```text
Himalayan-Flood-Prediction-Glacier-Fed-Rivers/
│
├── backend/                         # FastAPI backend
│   ├── app.py                       # REST API routes and frontend serving
│   ├── data_manager.py              # Data fetching and caching
│   ├── ml_engine.py                 # Feature engineering and ML models
│   ├── backtesting.py               # Historical event backtesting
│   ├── simulator.py                 # What-If climate simulator
│   └── scientific_report.py         # Research documentation
│
├── frontend/                        # Interactive website
│   ├── index.html                   # Main website entry point
│   ├── css/style.css                # Styling and themes
│   └── js/app.js                    # Dashboard logic, charts, and maps
│
├── colab_research/                  # Research scripts and notebooks
│   ├── fetch_and_model.py           # Base ML model
│   ├── events_test.py               # Flood event backtesting
│   ├── flood_events.csv             # Historical event dataset
│   └── README.md                    # Research usage guide
│
├── data_cache/                      # Local data cache
├── main.py                          # Application launcher
├── requirements.txt                 # Python dependencies
└── RUN_GUIDE.md                     # Setup and architecture guide
```

---

## 🔬 Machine Learning Pipeline

- **Data:** River-discharge and meteorological data, subject to source availability.
- **Features:** Lagged river flows, antecedent precipitation, degree-day melt estimates, warming anomalies, and monsoon-related features.
- **Models:** Persistence baseline, Random Forest regression and classification, and Gradient Boosting.
- **Evaluation:** MAE, RMSE, R², precision, recall, F1-score, False Alarm Ratio (FAR), and Critical Success Index (CSI).
- **Validation:** Chronological train/test splitting to help prevent temporal data leakage.

---

## 🗺️ Pre-Configured Himalayan Monitoring Stations

| Station | River / Region | Relevant Hazard |
|---|---|---|
| 🇳🇵 **Imja Glacial Lake** | Dudh Koshi, Everest, Nepal | Potential glacial lake outburst flood |
| 🇮🇳 **Kedarnath** | Mandakini, Uttarakhand | Extreme rainfall and flash-flood hazards |
| 🇮🇳 **Chamoli** | Rishiganga, Uttarakhand | Flood and landslide-related hazards |
| 🇮🇳 **South Lhonak** | Teesta basin, Sikkim | Glacial lake outburst flood |
| 🇮🇳 **Kinnaur / Sutlej** | Upper Sutlej, Himachal Pradesh | Glacier melt and extreme rainfall |
| 🇮🇳 **Kosi Basin** | Kosi basin, Nepal and India | River flooding and sediment-related hazards |

---

## 🌐 Website Features

- 📡 **Telemetry Dashboard** — Displays river-flow information, forecast indicators, and risk metrics where data is available.
- 🗺️ **Interactive GIS Map** — Visualises relevant glacial lakes, river basins, and monitoring locations.
- 📈 **Hydrographs** — Presents observed and predicted river-flow trends where supported by the data pipeline.
- 🤖 **Model Evaluation** — Displays model comparisons and performance metrics where implemented.
- 🔭 **What-If Simulator** — Explores how changes in temperature, rainfall, and antecedent moisture may affect simulated flood risk.
- 🕰️ **Historical Disaster Analysis** — Examines selected historical Himalayan flood events.
- 📄 **Scientific Report** — Documents the modelling approach, assumptions, and limitations.

---

## ⚠️ Model Limitations

1. **Spatial Resolution:** Gridded hydrological data may not capture local conditions in steep Himalayan valleys.
2. **GLOF Detection:** Weather and river-flow models alone cannot reliably predict glacial lake dam failure without additional monitoring.
3. **Rare Extreme Events:** Limited historical examples of catastrophic floods can make model validation difficult.
4. **Extreme Rainfall:** Gridded weather datasets may smooth localised cloudbursts.
5. **Lake Monitoring:** Dynamic lake volume and moraine stability require additional observations.
6. **Temporal Resolution:** Daily discharge data may not capture short-lived flood waves.
7. **Sediment Effects:** Sediment transport can alter flood impacts and river channels in ways that simple models may not represent.

---

## 📡 API Endpoints

The following endpoints describe the intended backend interface; confirm their availability against the actual implementation.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | System health check |
| GET | `/api/stations` | List monitoring stations |
| GET | `/api/forecast?station_id=imja` | Retrieve a station forecast |
| GET | `/api/events` | Retrieve historical event information |
| POST | `/api/simulate` | Run a What-If simulation |
| GET | `/api/report` | Retrieve the scientific report |
| POST | `/api/predict` | Generate a prediction from supplied inputs |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| Machine Learning | Scikit-learn |
| Hydrometeorological Data | Open-Meteo / GloFAS and ERA5, where configured |
| Frontend | HTML5, CSS3, JavaScript |
| Charts | Chart.js |
| Maps | Leaflet.js and OpenStreetMap tiles |
| Fonts | Inter, Outfit, JetBrains Mono |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👩‍💻 Author

**Amruta M Patil** — [@Amruta09-eng](https://github.com/Amruta09-eng)

> *"The Himalayas don't flood like lowland rivers. This system is built for that difference."*

---

## 🔗 Project Links

- 🌐 **Website:** [Visit HimAlert AI](https://himalayan-flood-prediction-glacier-fed-rivers.ai.studio/)
- 💻 **Source Code:** [GitHub Repository](https://github.com/Amruta09-eng/Himalayan-Flood-Prediction-Glacier-Fed-Rivers)
