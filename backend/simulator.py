"""
Himalayan Flood Prediction - Interactive What-If Climate & Glacial Simulator
Simulates extreme warming spikes (heatwaves triggering rapid glacier/snow ablation)
combined with intense monsoon cloudbursts to evaluate flood surge scenarios.
"""

from typing import Dict, Any
import numpy as np

def simulate_cryospheric_surge(
    base_discharge: float,
    temp_anomaly: float,
    cloudburst_rain_mm: float,
    current_temp: float = 12.0,
    antecedent_rain_3d: float = 20.0,
    threshold_90: float = 85.0
) -> Dict[str, Any]:
    """
    Simulates river discharge response under varied climate forcing:
    - temp_anomaly: change in temperature (+C) causing heightened degree-day ice melt
    - cloudburst_rain_mm: sudden intense 24h precipitation (mm)
    - antecedent_rain_3d: existing basin moisture
    """
    simulated_temp = current_temp + temp_anomaly
    
    # Degree-day melt contribution: each degree above 0C increases melt runoff
    # Standard Himalayan glacier melt degree-day factor (DDF): ~6-9 mm water equivalent / degree C / day
    melt_factor = max(0.0, simulated_temp) * 0.045
    
    # Soil saturation runoff coefficient (higher antecedent rain = higher runoff ratio)
    saturation_ratio = min(0.92, 0.35 + (antecedent_rain_3d / 180.0) * 0.5)
    
    # Direct rainfall runoff surge (m3/s scaled to representative catchment)
    direct_rain_surge = (cloudburst_rain_mm * saturation_ratio) * 0.85
    
    # Cryospheric melt surge (amplified by warming anomaly)
    melt_surge = (base_discharge * melt_factor) if simulated_temp > 0 else 0.0
    
    # Non-linear coupling: warm rain on snow/glacier causes accelerated thermal erosion
    rain_on_snow_coupling = (cloudburst_rain_mm * max(0.0, simulated_temp) * 0.012) if simulated_temp > 2.0 else 0.0
    
    total_surge = direct_rain_surge + melt_surge + rain_on_snow_coupling
    simulated_discharge_24h = base_discharge + total_surge
    simulated_discharge_48h = base_discharge + (total_surge * 0.72)  # hydrograph recession
    
    pct_increase = ((simulated_discharge_24h - base_discharge) / max(0.1, base_discharge)) * 100
    
    # Determine alert tier relative to threshold
    critical_threshold = threshold_90 * 1.35
    watch_threshold = threshold_90 * 0.80
    
    if simulated_discharge_24h >= critical_threshold:
        tier = "CRITICAL / EMERGENCY"
        color = "#E63946"
        action = "Issue immediate downstream evacuation alerts. Hydro dam floodgates must be opened."
    elif simulated_discharge_24h >= threshold_90:
        tier = "WARNING"
        color = "#F4A261"
        action = "High flood probability. Glacial melt & cloudburst runoff exceeding dangerous levels."
    elif simulated_discharge_24h >= watch_threshold:
        tier = "WATCH"
        color = "#E9C46A"
        action = "Elevated river stage. Tributaries may swell rapidly."
    else:
        tier = "SAFE / NORMAL"
        color = "#2A9D8F"
        action = "Discharge remains within manageable hydrological bounds."
        
    # Source partitioning estimate
    total_added = max(0.01, total_surge)
    rain_pct = round((direct_rain_surge / total_added) * 100, 1)
    melt_pct = round((melt_surge / total_added) * 100, 1)
    coupling_pct = round((rain_on_snow_coupling / total_added) * 100, 1)
    
    return {
        "base_discharge_m3s": round(base_discharge, 2),
        "temp_anomaly_c": round(temp_anomaly, 1),
        "cloudburst_rain_mm": round(cloudburst_rain_mm, 1),
        "simulated_temp_c": round(simulated_temp, 1),
        "predicted_discharge_24h_m3s": round(simulated_discharge_24h, 2),
        "predicted_discharge_48h_m3s": round(simulated_discharge_48h, 2),
        "surge_magnitude_m3s": round(total_surge, 2),
        "percentage_increase": round(pct_increase, 1),
        "threshold_m3s": round(threshold_90, 2),
        "alert_tier": tier,
        "alert_color": color,
        "recommended_action": action,
        "runoff_breakdown": {
            "direct_rainfall_pct": rain_pct,
            "glacier_snowmelt_pct": melt_pct,
            "rain_on_snow_thermal_coupling_pct": coupling_pct
        }
    }
