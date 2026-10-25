# Changelog

All notable changes to **HimAlert AI** are documented here.

## [2.0.0] - 2026-10-26

### Added
- Full FastAPI backend with RESTful API endpoints
- 6 pre-configured Himalayan monitoring stations (Imja, Kedarnath, Chamoli, Lhonak, Sutlej, Kosi)
- Multi-tier alert classification: Normal / Watch / Warning / Emergency
- Interactive web dashboard with 4 main modules
- What-If climate surge simulator with real-time sliders
- Historical disaster backtesting: 2013 Kedarnath, 2021 Chamoli, 2023 Lhonak, 2008 Kosi
- Gradient Boosting model alongside Random Forest
- 30-day warming anomaly feature detection
- Monsoon sine/cosine harmonic encoding
- 9 pre-cached GloFAS + ERA5 CSV datasets for instant station switching
- 4 visual themes: Light, Glacial Cyan, Alpine Emerald, Deep Indigo
- Leaflet GIS map with glacial lake overlays
- Academic scientific report with 7 critical model limitations
- Custom GPS coordinate support for any Himalayan location

### Improved
- Zero data leakage via strict chronological train/test splitting
- In-memory forecast cache for sub-second station toggling
- Responsive layout for all screen sizes

---

## [1.0.0] - 2026-10-23

### Initial Release
- Base ML model: Random Forest Regressor + Classifier
- Single station: Imja Glacial Lake (Dudh Koshi, Nepal)
- Data: Open-Meteo GloFAS v4 + ERA5 reanalysis (no API key needed)
- Google Colab compatible scripts
- Flood events CSV with major Himalayan disaster dates
- Events backtesting script (events_test.py)
