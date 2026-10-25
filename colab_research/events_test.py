# Test the model on a list of real flood events.
# Run in Colab after uploading fetch_and_model.py's helper style data sources, flood_events.csv.
# For each event: train on data more than 1 year before the event, then check whether the model
# flagged a flood in the 3 days before the event, and whether discharge actually rose.
# UNTESTED - check results against your event list before using them in the report.

import requests
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

events = pd.read_csv("flood_events.csv", parse_dates=["date"])

def get_data(lat, lon, start, end):
    q = requests.get("https://flood-api.open-meteo.com/v1/flood", timeout=120, params={
        "latitude": lat, "longitude": lon, "daily": "river_discharge",
        "start_date": start, "end_date": end}).json()
    if "daily" not in q:
        return pd.DataFrame()
    qdf = pd.DataFrame({"date": pd.to_datetime(q["daily"]["time"]),
                        "discharge": q["daily"]["river_discharge"]})
    w = requests.get("https://archive-api.open-meteo.com/v1/archive", timeout=120, params={
        "latitude": lat, "longitude": lon, "daily": "temperature_2m_mean,precipitation_sum",
        "start_date": start, "end_date": end}).json()
    if "daily" not in w:
        return pd.DataFrame()
    wdf = pd.DataFrame({"date": pd.to_datetime(w["daily"]["time"]),
                        "temp": w["daily"]["temperature_2m_mean"],
                        "precip": w["daily"]["precipitation_sum"]})
    return qdf.merge(wdf, on="date").dropna().sort_values("date").reset_index(drop=True)

def make_features(df):
    df = df.copy()
    df["q_lag1"] = df["discharge"].shift(1)
    df["q_lag2"] = df["discharge"].shift(2)
    df["precip_3d"] = df["precip"].rolling(3).sum()
    df["temp_3d"] = df["temp"].rolling(3).mean()
    df["month"] = df["date"].dt.month
    df["target_q"] = df["discharge"].shift(-1)
    return df.dropna().reset_index(drop=True)

features = ["discharge", "q_lag1", "q_lag2", "temp", "precip", "precip_3d", "temp_3d", "month"]

rows = []
for _, ev in events.iterrows():
    start = "2000-01-01"
    end = (ev["date"] + pd.Timedelta(days=7)).strftime("%Y-%m-%d")
    df = get_data(ev["lat"], ev["lon"], start, end)
    if df.empty:
        rows.append({"event": ev["name"], "result": "NO DATA from API"})
        continue
    df = make_features(df)
    cut = ev["date"] - pd.Timedelta(days=365)
    train, test = df[df["date"] < cut], df[df["date"] >= cut]
    if len(train) < 365 or test.empty:
        rows.append({"event": ev["name"], "result": "not enough data to train"})
        continue
    thr = train["target_q"].quantile(0.90)
    y_train = (train["target_q"] > thr).astype(int)
    if y_train.sum() == 0:
        rows.append({"event": ev["name"], "result": "no flood labels in training data"})
        continue
    clf = RandomForestClassifier(n_estimators=300, min_samples_leaf=5,
                                 class_weight="balanced", random_state=42, n_jobs=-1)
    clf.fit(train[features], y_train)
    test = test.copy()
    test["pred_flood"] = clf.predict(test[features])
    win = test[(test["date"] >= ev["date"] - pd.Timedelta(days=3)) &
               (test["date"] <= ev["date"] + pd.Timedelta(days=1))]
    rows.append({
        "event": ev["name"],
        "flood_threshold_m3s": round(thr, 1),
        "max_discharge_in_window": round(win["discharge"].max(), 1) if not win.empty else None,
        "model_flagged_flood_in_window": bool(win["pred_flood"].any()) if not win.empty else None,
        "result": "ok",
    })

out = pd.DataFrame(rows)
print(out.to_string(index=False))
out.to_csv("event_test_results.csv", index=False)
print("\nSaved event_test_results.csv")
