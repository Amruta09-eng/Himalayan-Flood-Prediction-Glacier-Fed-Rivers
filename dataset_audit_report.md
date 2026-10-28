# Himalayan GLOF Dataset Audit — Action Plan

> **Scope:** Structural and quality audit of three uploaded CSVs in `data/` against the existing pipeline in `backend/`. Identifies what must be fixed before any training run, and what the existing architecture already handles correctly.

---

## Current Architecture (What Already Works Well)

The existing pipeline in [`backend/`](file:///c:/Users/AMRUTA%20M%20PATIL/Downloads/Himalayan_Flood_Project_v2%20(2)/backend/) is well-structured:

| Component | File | Status |
|---|---|---|
| Data fetching + caching | [`data_manager.py`](file:///c:/Users/AMRUTA%20M%20PATIL/Downloads/Himalayan_Flood_Project_v2%20(2)/backend/data_manager.py) | ✅ Pulls from GloFAS + ERA5 per station coordinates |
| Feature engineering | [`ml_engine.py`](file:///c:/Users/AMRUTA%20M%20PATIL/Downloads/Himalayan_Flood_Project_v2%20(2)/backend/ml_engine.py) | ✅ Lag flows, degree-day melt, antecedent rain, monsoon harmonics |
| Train/test split | [`ml_engine.py` L89–98](file:///c:/Users/AMRUTA%20M%20PATIL/Downloads/Himalayan_Flood_Project_v2%20(2)/backend/ml_engine.py#L89-L98) | ✅ Strict chronological — zero leakage |
| Threshold derivation | [`ml_engine.py` L101–103](file:///c:/Users/AMRUTA%20M%20PATIL/Downloads/Himalayan_Flood_Project_v2%20(2)/backend/ml_engine.py#L101-L103) | ✅ Computed from training data only |
| `data_cache/` | 14 pre-fetched CSVs | ✅ Already covers Kedarnath (30.73, 79.07) 2002–2023 |

The **primary data path** (GloFAS + ERA5 via `fetch_himalayan_data`) is already production-ready and location-matched per station. The three uploaded files are a *secondary supplementary source* that needs QC before integration.

---

## Uploaded File Issues — Prioritized

### 🔴 Critical (Must Fix Before Any Integration)

#### 1. CWC Discharge: Sentinel Values
**File:** `cwc_uttarakhand_telemetry_1970_2025.csv`

- **23 rows with value `99999.99`** and **3 rows with `100000.00`** — these are data-provider sentinel codes for "no reading", not real discharge.
- **Fix:** Flag and exclude before any aggregation. Log each exclusion.

```python
SENTINEL_VALUES = {99999.99, 100000.0}
df["discharge_clean"] = df["Telemetry Hourly River Water Discharge (m3/sec)"].where(
    ~df["Telemetry Hourly River Water Discharge (m3/sec)"].isin(SENTINEL_VALUES)
)
df["is_sentinel"] = df["Telemetry Hourly River Water Discharge (m3/sec)"].isin(SENTINEL_VALUES)
```

#### 2. CWC Discharge: Negative Readings
- **8,778 rows (~2.41%)** have negative discharge — physically impossible for streamflow.
- **Fix:** Treat as invalid/missing. Do **not** clip to zero — that would invent data.

```python
df["discharge_clean"] = df["discharge_clean"].where(df["discharge_clean"] >= 0)
```

#### 3. Filename Mismatch — `1970_2025`
- The file only has data from **2022-08-04**. The filename `cwc_uttarakhand_telemetry_1970_2025.csv` is misleading.
- **Fix:** Never use filename as evidence of date coverage. Parse and validate actual timestamps.

---

### 🟠 High Priority (Fix Before Training with CWC Data)

#### 4. Spatial Mismatch: Weather Point vs. CWC Stations

The single weather file covers **lat 30.685, lon 79.068** (near Kedarnath). CWC stations are scattered 43–120 km away:

| Station | Distance from weather point |
|---|---:|
| Marchula_1 | 120 km |
| Kheri_5 | 120 km |
| Koteshwar | 72 km |

**Fix:** Do **not** merge this single weather series into all CWC stations. Either:
- Fetch station-local weather via `fetch_weather_chunk(station_lat, station_lon, ...)` for each CWC station, **or**
- Restrict the one-point weather to Lambagarh only (43 km — closest).

#### 5. Time Cadence: 15-min vs. "Hourly" Label
- Timestamps are predominantly **15 minutes apart** despite "Hourly" in the column name.
- **Fix:** Resample explicitly before joining with daily GloFAS/ERA5:

```python
df_hourly = df.set_index("Data Acquisition Time").resample("1h")["discharge_clean"].mean()
df_daily = df.set_index("Data Acquisition Time").resample("1D")["discharge_clean"].mean()
```

#### 6. Open-Meteo Files: `skiprows=3` Required
Both weather CSVs have two metadata rows + one blank row before the real header.

```python
hourly = pd.read_csv("open_meteo_himalaya_weather_hourly_2016_2023.csv", skiprows=3, parse_dates=["time"])
daily  = pd.read_csv("open_meteo_himalaya_weather_daily_2016_2023.csv",  skiprows=3, parse_dates=["date"])
```

---

### 🟡 Medium Priority (Validate Before Using as Feature)

#### 7. `snow_depth (m)` Range 6.91–8.46 m
- This range is suspicious for a single weather grid cell at 3,583 m. May be cumulative/climatological rather than instantaneous.
- **Fix:** Run model both with and without this feature. Check sensitivity.

#### 8. Hourly vs. Daily Weather: Don't Stack as Separate Samples
- Both Open-Meteo files cover the same grid point and period.
- **Fix:** Use one cadence per experiment. Aggregate hourly → daily if needed, then validate with a known-day spot-check.

---

### 🟢 Already Correct (No Changes Needed)

#### 9. CWC Positive Peaks
- Values >1,000 m³/s exist for some stations but are **not blanket removed** — per audit, review per station.
- Karnaprayag and Koteshwar are large mainstem Alaknanda gauges; high peaks are plausible.

#### 10. No Duplicate Rows or Station/Timestamp Pairs in CWC
- Initial audit confirms no duplicates. ✅

#### 11. Train/Test Leakage in Existing Pipeline
- Thresholds and transforms fitted on training data only in `ml_engine.py`. ✅

---

## Overlap Window (Weather ↔ CWC)

Weather files end **2023-12-31**. CWC starts **2022-08-04** for the earliest station. The usable joint window is approximately **Aug 2022 – Dec 2023** (~17 months), with partial station availability:

| Station | Approx. Overlap Days |
|---|---:|
| Koteshwar | ~210 |
| Karnaprayag (P) | ~190 |
| Lambagarh | ~194 |
| Kheri_5 | ~148 |
| Marchula_1 | ~172 |
| Rudraprayag_3 | ~1 |
| Tekhla | **0** |

**This is not enough data for a standalone training run.** Treat the CWC data as a validation supplement, not a primary training source.

---

## Recommended Next Steps (Ordered)

- [ ] **Step 1:** Add a `cwc_qc.py` script in `backend/` that applies sentinel removal, negative-value masking, and explicit 15-min→daily resampling per station. Output one clean CSV per station.
- [ ] **Step 2:** For each CWC station, call `fetch_weather_chunk(station_lat, station_lon, ...)` to get station-local weather (not the uploaded single-point file).
- [ ] **Step 3:** For the primary model, continue using `data_cache/hima_data_30.730_79.070_2010-01-01_2023-12-31.csv` (already cached Kedarnath data) — it covers 13 years and is already location-matched.
- [ ] **Step 4:** Run a separate CWC experiment using Lambagarh (closest CWC station, 43 km) as an observational discharge target, clearly labeled as a distinct experiment from the GloFAS-based model.
- [ ] **Step 5:** Never blend GloFAS modeled discharge and CWC observed discharge into one unlabeled target column.
- [ ] **Step 6:** Update any UI or report text to clarify that the flood label is the **90th-percentile training threshold**, not a verified GLOF event record.

---

## What NOT to Do

> [!CAUTION]
> - Do **not** use `data/cwc_uttarakhand_telemetry_1970_2025.csv` as a drop-in replacement for the existing `data_cache/` files — temporal coverage, cadence, and source type are completely different.
> - Do **not** merge the single weather grid point (30.685, 79.068) into all 7 CWC stations as if geographically aligned.
> - Do **not** backfill or forward-fill the target discharge column using future values.
> - Do **not** blanket-remove all CWC discharge values above 1,000 m³/s — some are genuine high-flow events.
