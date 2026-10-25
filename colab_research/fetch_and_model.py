# Himalayan flood prediction - run in Google Colab with: !python fetch_and_model.py
# Downloads real data from Open-Meteo (no API key needed).

import requests
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import (mean_absolute_error, mean_squared_error,
                             precision_score, recall_score, f1_score)

LAT, LON = 27.90, 86.92          # Imja Lake area - check on a map
START_YEAR, END_YEAR = 2000, 2020
SPLIT_DATE = "2015-01-01"        # train before this date, test from this date on


def fetch_in_chunks(url, params_fn, parse_fn):
    """Download in 5-year chunks to avoid API size limits."""
    frames = []
    for y0 in range(START_YEAR, END_YEAR + 1, 5):
        y1 = min(y0 + 4, END_YEAR)
        r = requests.get(url, params=params_fn(f"{y0}-01-01", f"{y1}-12-31"), timeout=120)
        r.raise_for_status()
        frames.append(parse_fn(r.json()))
    return pd.concat(frames).drop_duplicates("date").sort_values("date")


def fetch_discharge():
    def params(s, e):
        return {"latitude": LAT, "longitude": LON, "daily": "river_discharge",
                "start_date": s, "end_date": e}
    def parse(j):
        d = j["daily"]
        return pd.DataFrame({"date": pd.to_datetime(d["time"]),
                             "discharge": d["river_discharge"]})
    return fetch_in_chunks("https://flood-api.open-meteo.com/v1/flood", params, parse)


def fetch_weather():
    def params(s, e):
        return {"latitude": LAT, "longitude": LON,
                "daily": "temperature_2m_mean,precipitation_sum",
                "start_date": s, "end_date": e}
    def parse(j):
        d = j["daily"]
        return pd.DataFrame({"date": pd.to_datetime(d["time"]),
                             "temp": d["temperature_2m_mean"],
                             "precip": d["precipitation_sum"]})
    return fetch_in_chunks("https://archive-api.open-meteo.com/v1/archive", params, parse)


# ---- 1. Download ----
print("Downloading discharge...")
q = fetch_discharge()
print("Downloading weather...")
w = fetch_weather()

df = q.merge(w, on="date", how="inner").sort_values("date").reset_index(drop=True)
df = df.dropna().reset_index(drop=True)
print(f"Rows after merge: {len(df)}  ({df['date'].min().date()} to {df['date'].max().date()})")

# ---- 2. Features (past data only) ----
df["q_lag1"] = df["discharge"].shift(1)
df["q_lag2"] = df["discharge"].shift(2)
df["precip_3d"] = df["precip"].rolling(3).sum()
df["temp_3d"] = df["temp"].rolling(3).mean()
df["month"] = df["date"].dt.month
df["target_q"] = df["discharge"].shift(-1)        # tomorrow's discharge
df = df.dropna().reset_index(drop=True)

features = ["discharge", "q_lag1", "q_lag2", "temp", "precip",
            "precip_3d", "temp_3d", "month"]

train_mask = df["date"] < SPLIT_DATE
train, test = df[train_mask], df[~train_mask]

# ---- 3. Flood label: tomorrow's discharge above 90th percentile of TRAINING data ----
threshold = train["target_q"].quantile(0.90)
df["flood_tomorrow"] = (df["target_q"] > threshold).astype(int)
train, test = df[train_mask], df[~train_mask]
print(f"Flood threshold (90th pct of training): {threshold:.1f} m3/s")
print(f"Test floods: {test['flood_tomorrow'].sum()} of {len(test)} days")

if test["flood_tomorrow"].sum() == 0:
    print("WARNING: no flood days in test period. Try a lower threshold or different years.")

X_train, X_test = train[features], test[features]
y_train_q, y_test_q = train["target_q"], test["target_q"]
y_train_f, y_test_f = train["flood_tomorrow"], test["flood_tomorrow"]

# ---- 4. Baseline: persistence (tomorrow = today) ----
base_pred_q = test["discharge"].values
base_pred_f = (test["discharge"] > threshold).astype(int).values

# ---- 5. Models ----
reg = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, random_state=42, n_jobs=-1)
reg.fit(X_train, y_train_q)
pred_q = reg.predict(X_test)

clf = RandomForestClassifier(n_estimators=300, min_samples_leaf=5,
                             class_weight="balanced", random_state=42, n_jobs=-1)
clf.fit(X_train, y_train_f)
pred_f = clf.predict(X_test)

# ---- 6. Results ----
def reg_row(name, p):
    mae = mean_absolute_error(y_test_q, p)
    rmse = np.sqrt(mean_squared_error(y_test_q, p))
    print(f"{name:28s} MAE={mae:8.1f}  RMSE={rmse:8.1f} m3/s")

def cls_row(name, p):
    pr = precision_score(y_test_f, p, zero_division=0)
    rc = recall_score(y_test_f, p, zero_division=0)
    f1 = f1_score(y_test_f, p, zero_division=0)
    print(f"{name:28s} precision={pr:.3f}  recall={rc:.3f}  F1={f1:.3f}")

print("\n=== Discharge forecast (tomorrow) ===")
reg_row("Persistence baseline", base_pred_q)
reg_row("Random Forest regressor", pred_q)

print("\n=== Flood warning (tomorrow) ===")
cls_row("Persistence baseline", base_pred_f)
cls_row("Random Forest classifier", pred_f)

# ---- 7. Plot ----
plt.figure(figsize=(14, 5))
plt.plot(test["date"], y_test_q, label="Actual tomorrow discharge", linewidth=1)
plt.plot(test["date"], pred_q, label="Random Forest prediction", linewidth=1, alpha=0.8)
plt.axhline(threshold, color="red", linestyle="--", label="Flood threshold")
plt.ylabel("Discharge (m3/s)")
plt.title("Test period: actual vs predicted river discharge (Imja area)")
plt.legend()
plt.tight_layout()
plt.savefig("flood_forecast.png", dpi=150)
print("\nSaved flood_forecast.png")
