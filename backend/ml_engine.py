"""
Himalayan Flood Prediction - Machine Learning Engine
Specialized in cryospheric hydrology, lag features, degree-day glacier ablation,
and multi-tier flood warning classification.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    precision_score, recall_score, f1_score, confusion_matrix
)


def build_cryospheric_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs time-series features incorporating river memory, antecedent rainfall,
    and temperature-driven glacier/snow ablation.
    """
    data = df.copy().sort_values("date").reset_index(drop=True)
    
    # 1. Hydrological river inertia (Lags)
    data["q_lag1"] = data["discharge"].shift(1)
    data["q_lag2"] = data["discharge"].shift(2)
    data["q_lag3"] = data["discharge"].shift(3)
    
    # 2. Antecedent precipitation (Soil moisture saturation)
    data["precip_3d"] = data["precip"].rolling(3, min_periods=1).sum()
    data["precip_7d"] = data["precip"].rolling(7, min_periods=1).sum()
    
    # Rain vs Snow fraction (liquid rain triggers rapid runoff)
    if "rain" in data.columns:
        data["rain_3d"] = data["rain"].rolling(3, min_periods=1).sum()
    else:
        data["rain_3d"] = data["precip_3d"]
        
    # 3. Cryosphere thermal features (Glacier melt indices)
    data["temp_3d"] = data["temp_mean"].rolling(3, min_periods=1).mean()
    data["temp_7d"] = data["temp_mean"].rolling(7, min_periods=1).mean()
    
    # Degree-day melt energy (Positive temperatures above 0°C directly cause ice/snow ablation)
    data["degree_day_melt"] = data["temp_mean"].apply(lambda t: max(0.0, float(t)))
    data["degree_day_melt_3d"] = data["degree_day_melt"].rolling(3, min_periods=1).sum()
    
    # Heatwave / sudden warming anomaly (Difference from 30-day baseline)
    data["temp_baseline_30d"] = data["temp_mean"].rolling(30, min_periods=5).mean()
    data["temp_warming_anomaly"] = data["temp_mean"] - data["temp_baseline_30d"]
    
    # 4. Seasonal Monsoon harmonics
    data["month"] = data["date"].dt.month
    data["day_of_year"] = data["date"].dt.dayofyear
    data["season_sin"] = np.sin(2 * np.pi * data["day_of_year"] / 365.25)
    data["season_cos"] = np.cos(2 * np.pi * data["day_of_year"] / 365.25)
    data["is_monsoon"] = data["month"].isin([6, 7, 8, 9]).astype(int)
    
    # 5. Future target: tomorrow's river discharge
    data["target_q"] = data["discharge"].shift(-1)
    
    # Drop rows with NaN from lags
    clean_data = data.dropna().reset_index(drop=True)
    return clean_data


FEATURE_COLUMNS = [
    "discharge", "q_lag1", "q_lag2", "q_lag3",
    "precip", "precip_3d", "precip_7d", "rain_3d",
    "temp_mean", "temp_3d", "degree_day_melt", "degree_day_melt_3d",
    "temp_warming_anomaly", "month", "season_sin", "season_cos", "is_monsoon"
]


def train_and_evaluate_pipeline(
    df: pd.DataFrame,
    split_date: str = "2018-01-01",
    percentile_threshold: float = 0.90,
    rf_trees: int = 250
) -> Dict[str, Any]:
    """
    Executes full time-series split, builds models, evaluates against persistence baseline,
    and returns comprehensive statistics.
    """
    featured_df = build_cryospheric_features(df)
    
    if len(featured_df) < 100:
        raise ValueError(f"Insufficient data points after feature engineering: {len(featured_df)}")
        
    train_mask = featured_df["date"] < split_date
    train = featured_df[train_mask].copy()
    test = featured_df[~train_mask].copy()
    
    # Fallback if split_date gives empty set
    if len(train) < 50 or len(test) < 20:
        split_idx = int(len(featured_df) * 0.75)
        train = featured_df.iloc[:split_idx].copy()
        test = featured_df.iloc[split_idx:].copy()
        split_date = train["date"].max().strftime("%Y-%m-%d")
        
    # Strictly define flood threshold from TRAINING set only
    threshold = float(train["target_q"].quantile(percentile_threshold))
    threshold_watch = float(train["target_q"].quantile(max(0.75, percentile_threshold - 0.10)))
    threshold_critical = float(train["target_q"].quantile(min(0.98, percentile_threshold + 0.05)))
    
    train["flood_tomorrow"] = (train["target_q"] > threshold).astype(int)
    test["flood_tomorrow"] = (test["target_q"] > threshold).astype(int)
    
    X_train = train[FEATURE_COLUMNS]
    y_train_q = train["target_q"]
    y_train_f = train["flood_tomorrow"]
    
    X_test = test[FEATURE_COLUMNS]
    y_test_q = test["target_q"]
    y_test_f = test["flood_tomorrow"]
    
    # 1. Baseline: Persistence (Tomorrow is identical to Today)
    base_pred_q = test["discharge"].values
    base_pred_f = (test["discharge"] > threshold).astype(int).values
    
    # 2. Random Forest Regressor
    rf_reg = RandomForestRegressor(
        n_estimators=rf_trees,
        min_samples_leaf=4,
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )
    rf_reg.fit(X_train, y_train_q)
    pred_q_rf = rf_reg.predict(X_test)
    
    # 3. Random Forest Classifier (with balanced weighting for rare flood events)
    rf_clf = RandomForestClassifier(
        n_estimators=rf_trees,
        min_samples_leaf=4,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf_clf.fit(X_train, y_train_f)
    pred_f_rf = rf_clf.predict(X_test)
    
    # Safe probability extraction
    proba_matrix = rf_clf.predict_proba(X_test)
    if 1 in rf_clf.classes_:
        class_1_idx = list(rf_clf.classes_).index(1)
        pred_f_proba = proba_matrix[:, class_1_idx]
    else:
        pred_f_proba = np.zeros(len(X_test))
    
    # 4. Gradient Boosting Regressor (benchmark)
    gb_reg = GradientBoostingRegressor(n_estimators=150, max_depth=4, random_state=42)
    gb_reg.fit(X_train, y_train_q)
    pred_q_gb = gb_reg.predict(X_test)
    
    # Metrics Calculation
    def calc_reg_metrics(y_true, y_pred):
        mae = float(mean_absolute_error(y_true, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        r2 = float(r2_score(y_true, y_pred))
        if len(y_true) > 1 and np.std(y_true) > 1e-6 and np.std(y_pred) > 1e-6:
            corr = float(np.corrcoef(y_true, y_pred)[0, 1])
        else:
            corr = 0.0
        return {"mae": round(mae, 2), "rmse": round(rmse, 2), "r2": round(r2, 3), "pearson_r": round(corr, 3)}
        
    def calc_cls_metrics(y_true, y_pred):
        pr = float(precision_score(y_true, y_pred, zero_division=0))
        rc = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        cm = confusion_matrix(y_true, y_pred)
        tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (int(cm[0, 0]), 0, 0, 0)
        far = float(fp / (tp + fp)) if (tp + fp) > 0 else 0.0
        csi = float(tp / (tp + fn + fp)) if (tp + fn + fp) > 0 else 0.0
        return {
            "precision": round(pr, 3),
            "recall": round(rc, 3),
            "f1": round(f1, 3),
            "false_alarm_ratio": round(far, 3),
            "critical_success_index": round(csi, 3),
            "confusion_matrix": {"tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn)}
        }
        
    metrics = {
        "regression": {
            "persistence": calc_reg_metrics(y_test_q, base_pred_q),
            "random_forest": calc_reg_metrics(y_test_q, pred_q_rf),
            "gradient_boosting": calc_reg_metrics(y_test_q, pred_q_gb),
            "improvement_pct_over_baseline": round(((calc_reg_metrics(y_test_q, base_pred_q)["rmse"] - calc_reg_metrics(y_test_q, pred_q_rf)["rmse"]) / max(1e-3, calc_reg_metrics(y_test_q, base_pred_q)["rmse"])) * 100, 1)
        },
        "classification": {
            "persistence": calc_cls_metrics(y_test_f, base_pred_f),
            "random_forest": calc_cls_metrics(y_test_f, pred_f_rf),
        }
    }
    
    # Feature importances
    importances = rf_reg.feature_importances_
    feat_imp = sorted([
        {"feature": feat, "importance": round(float(imp), 4), "readable": feat.replace("_", " ").title()}
        for feat, imp in zip(FEATURE_COLUMNS, importances)
    ], key=lambda x: x["importance"], reverse=True)
    
    # Build timeline series for frontend visualization (downsampled if very large)
    test_timeline = []
    for idx, row in test.iterrows():
        test_timeline.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "actual_q": round(float(row["target_q"]), 2),
            "predicted_q": round(float(pred_q_rf[len(test_timeline)]), 2),
            "predicted_gb_q": round(float(pred_q_gb[len(test_timeline)]), 2),
            "precip": round(float(row["precip"]), 1),
            "temp": round(float(row["temp_mean"]), 1),
            "flood_actual": int(row["flood_tomorrow"]),
            "flood_predicted": int(pred_f_rf[len(test_timeline)]),
            "flood_prob": round(float(pred_f_proba[len(test_timeline)]), 3)
        })
        
    # Get latest conditions & tomorrow's forecast
    latest_row = featured_df.iloc[-1]
    latest_features = featured_df[FEATURE_COLUMNS].iloc[[-1]]
    tomorrow_q_pred = float(rf_reg.predict(latest_features)[0])
    latest_proba = rf_clf.predict_proba(latest_features)[0]
    tomorrow_flood_prob = float(latest_proba[list(rf_clf.classes_).index(1)]) if 1 in rf_clf.classes_ else 0.0
    
    # Determine alert tier
    if tomorrow_q_pred > threshold_critical or tomorrow_flood_prob >= 0.75:
        alert_tier = "CRITICAL / EMERGENCY"
        alert_color = "#E63946"
        alert_desc = "Extreme river discharge surge likely tomorrow. High risk of glacial breach or flash flooding."
    elif tomorrow_q_pred > threshold or tomorrow_flood_prob >= 0.50:
        alert_tier = "WARNING"
        alert_color = "#F4A261"
        alert_desc = "Discharge exceeds 90th percentile threshold. Glacial melt & runoff warning in effect."
    elif tomorrow_q_pred > threshold_watch or tomorrow_flood_prob >= 0.30:
        alert_tier = "WATCH"
        alert_color = "#E9C46A"
        alert_desc = "Elevated river stage. Monitoring upstream tributary conditions."
    else:
        alert_tier = "SAFE / NORMAL"
        alert_color = "#2A9D8F"
        alert_desc = "Flow levels within typical seasonal variance."
        
    current_status = {
        "latest_date": latest_row["date"].strftime("%Y-%m-%d"),
        "current_discharge_m3s": round(float(latest_row["discharge"]), 2),
        "forecast_tomorrow_m3s": round(tomorrow_q_pred, 2),
        "flood_probability_pct": round(tomorrow_flood_prob * 100, 1),
        "flood_threshold_m3s": round(threshold, 2),
        "threshold_watch_m3s": round(threshold_watch, 2),
        "threshold_critical_m3s": round(threshold_critical, 2),
        "alert_tier": alert_tier,
        "alert_color": alert_color,
        "alert_desc": alert_desc,
        "temp_c": round(float(latest_row["temp_mean"]), 1),
        "precip_mm": round(float(latest_row["precip"]), 1),
        "degree_day_melt": round(float(latest_row["degree_day_melt"]), 1)
    }
    
    return {
        "split_date": split_date,
        "train_rows": len(train),
        "test_rows": len(test),
        "threshold_m3s": round(threshold, 2),
        "metrics": metrics,
        "feature_importances": feat_imp,
        "current_status": current_status,
        "timeline": test_timeline[-365:] if len(test_timeline) > 365 else test_timeline,  # last 365 days for snappiness
        "rf_model": rf_reg,
        "clf_model": rf_clf
    }
