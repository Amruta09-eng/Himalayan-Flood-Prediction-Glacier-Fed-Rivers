# Himalayan Flood Prediction (Predictive Analytics)

Predict whether a dangerous river flood will happen tomorrow near the Imja Lake area (Everest region, Nepal), using real weather and river data from free online sources.

## What you need
- A Google account (for Google Colab)
- Nothing to install. Everything runs in your browser.
- No API key needed. Open-Meteo is free for this kind of use.

## Data sources (all real, downloaded automatically by the script)
| Data | Source | Link |
|---|---|---|
| Daily river discharge (flow) | Open-Meteo Flood API (GloFAS model) | https://open-meteo.com/en/docs/flood-api |
| Daily temperature and rainfall | Open-Meteo Historical Weather API (ERA5) | https://open-meteo.com/en/docs/historical-weather-api |

Open-Meteo docs are the reference if the script ever fails because the API changed.

## Steps

1. Go to https://colab.research.google.com and click **New notebook**.
2. In the left sidebar, click the **folder icon** and **upload** `fetch_and_model.py`.
3. In a code cell, run:
   ```
   !python fetch_and_model.py
   ```
4. The script downloads the data, builds features, trains two models, and prints results. A plot is saved as `flood_forecast.png`. Download it from the file panel.
5. Copy the printed results into your report.

## What the script does
1. **Downloads** daily river discharge and weather for 2000–2020 at the Imja location.
2. **Merges** them by date and removes missing rows.
3. **Builds features** from past data only: today's discharge, discharge 1 and 2 days ago, temperature, rain, 3-day rain total, 3-day temperature average, and month.
4. **Defines a flood** as tomorrow's discharge above the 90th percentile of the training period. The threshold is computed from training data only, so it doesn't leak test information.
5. **Splits by time:** train on 2000–2014, test on 2015–2020. Never shuffle time series.
6. **Compares models:**
   - Persistence baseline: "tomorrow will be like today"
   - Random Forest regressor: predicts tomorrow's discharge (MAE, RMSE)
   - Random Forest classifier: predicts flood or no flood (precision, recall, F1)

## How to read the results
- **MAE / RMSE:** average size of the error in m³/s. Lower is better. The model should beat the persistence baseline to be useful.
- **Precision:** of the floods the model predicted, how many were real.
- **Recall:** of the real floods, how many the model caught. For early warnings, recall matters most, because missing a flood is worse than a false alarm.
- **F1:** a balance of precision and recall.

## Limitations (write these in your report)
- The discharge data comes from a computer model (GloFAS) with grid cells about 5 km wide. It may not capture small, sudden glacial lake outburst floods.
- The coordinates point to the Imja area, but the model's river point may not sit exactly on the Imja river. Check the location on a map and say what you used.
- Weather comes from ERA5 reanalysis, which is a model blend, not direct station readings.
- Only one location and one flood threshold were tested.
- Glacier lake area isn't included, because no free daily source for it was used here.
- Results only cover predicting one day ahead.

## Checklist
- [ ] Opened Colab and uploaded `fetch_and_model.py`
- [ ] Ran the script without errors
- [ ] Saved `flood_forecast.png`
- [ ] Recorded MAE, RMSE, precision, recall, F1 for both models
- [ ] Compared against the persistence baseline
- [ ] Wrote the limitations section
- [ ] Described the data sources accurately in the report

## Version 2: Testing on real flood events

- `flood_events.csv`: a list of major Himalayan floods. Dates and coordinates marked "CHECK" are from memory and must be verified (EM-DAT, news archives, ICIMOD). Coordinates are approximate.
- `events_test.py`: for each event, trains on data more than a year before the event and checks whether the model flagged a flood in the 3 days before it. Untested. Run it in Colab after uploading `flood_events.csv`.

Report note: a model that misses an event isn't failing the project. Explain why (grid size, landslide dams, small catchments).
