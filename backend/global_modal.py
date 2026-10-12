import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
import joblib


# =========================================================
# 1. CONFIG
# =========================================================

# NASA POWER endpoint (hourly data)
NASA_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"

# Variables we’ll fetch from NASA POWER
NASA_PARAMS = [
    "ALLSKY_SFC_SW_DWN",   # GHI (W/m2)
    "T2M",                 # air temperature at 2m (°C)
    "RH2M",                # relative humidity (%)
    "WS10M",               # wind speed at 10m (m/s)
    "CLRSKY_SFC_SW_DWN",   # clear-sky irradiance
]

MODEL_PATH = "global_rf_model.pkl"


# =========================================================
# 2. NASA POWER DATA FETCH
# =========================================================

def fetch_nasa_power_hourly(lat, lon, start, end):
    """
    Fetch hourly NASA POWER data for a given lat, lon, and date range.

    Args:
        lat (float): latitude
        lon (float): longitude
        start (str): YYYYMMDD
        end   (str): YYYYMMDD

    Returns:
        pd.DataFrame with datetime index and feature columns
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start": start,
        "end": end,
        "parameters": ",".join(NASA_PARAMS),
        "community": "RE",           # Renewable Energy community
        "format": "JSON",
        "time-standard": "UTC"
    }

    resp = requests.get(NASA_URL, params=params)
    resp.raise_for_status()
    data = resp.json()

    # NASA POWER returns "properties" → "parameter" → dict of arrays keyed by variable name
    param_data = data["properties"]["parameter"]

    # Each variable is a dict: { "YYYYMMDDHH": value, ... }
    # We’ll build a DataFrame with index as datetime and columns as variables
    records = {}
    for var_name, series in param_data.items():
        for tstamp_str, value in series.items():
            # timestamp is e.g. "2020010100" (YYYYMMDDHH)
            dt = datetime.strptime(tstamp_str, "%Y%m%d%H")
            records.setdefault(dt, {})[var_name] = value

    df = pd.DataFrame.from_dict(records, orient="index")
    df.index.name = "datetime"
    df.sort_index(inplace=True)

    # Rename to nicer column names
    rename_map = {
        "ALLSKY_SFC_SW_DWN": "GHI",
        "CLRSKY_SFC_SW_DWN": "GHI_CLEAR",
        "T2M": "TEMP",
        "RH2M": "RH",
        "WS10M": "WIND"
    }
    df.rename(columns=rename_map, inplace=True)

    return df


# =========================================================
# 3. SYNTHETIC TARGET: POWER PER KWP
# =========================================================

def synthetic_power_per_kwp(df, pr=0.8):
    """
    Create a synthetic target: power_per_kwp (kW per kWp)
    using a simple PV formula:

        power_per_kwp ≈ PR * GHI / 1000

    This is a simplification used only to build a global model
    pipeline when you don't have real plant output yet.
    """
    df = df.copy()
    # GHI in W/m²; dividing by 1000 approximates kW/kWp
    df["power_per_kwp"] = pr * (df["GHI"] / 1000.0)
    # Clip at some max (e.g., 1.2 kW/kWp) to avoid unrealistic spikes
    df["power_per_kwp"] = df["power_per_kwp"].clip(lower=0, upper=1.2)
    return df


# =========================================================
# 4. BUILD TRAINING DATA FOR MULTIPLE LOCATIONS
# =========================================================

def build_training_data(locations, start, end, pr=0.8):
    """
    Build a training DataFrame using NASA data + synthetic target
    for a list of locations.

    locations: list of dicts like:
        [{"name": "Chennai", "lat": 13.0827, "lon": 80.2707}, ...]

    start, end: strings YYYYMMDD

    Returns:
        pd.DataFrame with features + target
    """
    all_rows = []

    for loc in locations:
        print(f"Fetching NASA data for {loc['name']} ({loc['lat']}, {loc['lon']})...")
        df = fetch_nasa_power_hourly(loc["lat"], loc["lon"], start, end)
        df = synthetic_power_per_kwp(df, pr=pr)

        # Add location features
        df["lat"] = loc["lat"]
        df["lon"] = loc["lon"]
        df["site"] = loc["name"]

        # Time features
        df["hour"] = df.index.hour
        df["day_of_year"] = df.index.dayofyear

        all_rows.append(df)

    data = pd.concat(all_rows).reset_index()
    return data


# =========================================================
# 5. TRAIN GLOBAL RANDOM FOREST
# =========================================================

def train_global_model(data):
    """
    Train a RandomForestRegressor to predict power_per_kwp
    from weather + time + location features.
    """
    feature_cols = [
        "GHI", "GHI_CLEAR", "TEMP", "RH", "WIND",
        "lat", "lon", "hour", "day_of_year"
    ]
    target_col = "power_per_kwp"

    data = data.dropna(subset=feature_cols + [target_col])

    X = data[feature_cols]
    y = data[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=True, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("=== Global Model Performance (synthetic target) ===")
    print(f"MAE (kW/kWp): {mae:.4f}")
    print(f"R²: {r2:.4f}")

    return model


# =========================================================
# 6A. HOURLY PREDICTION FOR ANY NEW PLANT (BASE)
# =========================================================

def predict_for_plant_hourly(global_model, lat, lon, capacity_kwp, pr, start, end):
    """
    Use the global model to predict plant power (kW) HOURLY for a given
    location, capacity, and PR over a date range.
    """
    # 1. Fetch NASA data for this location and period
    df = fetch_nasa_power_hourly(lat, lon, start, end)

    # 2. Build feature matrix
    df["lat"] = lat
    df["lon"] = lon
    df["hour"] = df.index.hour
    df["day_of_year"] = df.index.dayofyear

    feature_cols = [
        "GHI", "GHI_CLEAR", "TEMP", "RH", "WIND",
        "lat", "lon", "hour", "day_of_year"
    ]
    df = df.dropna(subset=feature_cols)
    X_new = df[feature_cols]

    # 3. Predict normalized power_per_kwp
    power_per_kwp_pred = global_model.predict(X_new)

    # 4. Convert to plant power (kW)
    plant_power_kw = power_per_kwp_pred * capacity_kwp * pr

    result = df.copy()
    result["power_per_kwp_pred"] = power_per_kwp_pred
    result["plant_power_kw_pred"] = plant_power_kw

    return result


# =========================================================
# 6B. 15-MIN PREDICTION (INTERPOLATED FROM HOURLY)
# =========================================================

def predict_for_plant_15min(global_model, lat, lon, capacity_kwp, pr, start, end):
    """
    Predict plant power (kW) at 15-minute resolution.
    Steps:
      1) Get hourly predictions from the global model
      2) Create a 15-min time index
      3) Interpolate the hourly predictions to 15-min steps
    """
    # Step 1: get hourly predictions
    hourly_df = predict_for_plant_hourly(
        global_model, lat, lon, capacity_kwp, pr, start, end
    )

    # Series of hourly predictions
    hourly_series = hourly_df["plant_power_kw_pred"].sort_index()

    if hourly_series.empty:
        return pd.DataFrame(columns=["plant_power_kw_pred"])

    # Step 2: create 15-min time index from min to max timestamp
    idx_15min = pd.date_range(
        start=hourly_series.index.min(),
        end=hourly_series.index.max(),
        freq="15T"
    )

    # Step 3: reindex and interpolate
    power_15min = (
        hourly_series
        .reindex(idx_15min)
        .interpolate(method="time")
        .clip(lower=0)
    )

    result_15min = pd.DataFrame(index=idx_15min)
    result_15min.index.name = "datetime"
    result_15min["plant_power_kw_pred"] = power_15min

    return result_15min


# =========================================================
# 7. MAIN: EXAMPLE USAGE
# =========================================================

if __name__ == "__main__":
    # 1) Define more training locations for larger dataset
    locations = [
        {"name": "Chennai",   "lat": 13.0827,  "lon": 80.2707},
        {"name": "Delhi",     "lat": 28.6139,  "lon": 77.2090},
        {"name": "Mumbai",    "lat": 19.0760,  "lon": 72.8777},
        {"name": "Bangalore", "lat": 12.9716,  "lon": 77.5946},
        {"name": "Hyderabad", "lat": 17.3850,  "lon": 78.4867},
        {"name": "Berlin",    "lat": 52.5200,  "lon": 13.4050},
        {"name": "Paris",     "lat": 48.8566,  "lon": 2.3522},
        {"name": "London",    "lat": 51.5074,  "lon": -0.1278},
        {"name": "NewYork",   "lat": 40.7128,  "lon": -74.0060},
        {"name": "Sydney",    "lat": -33.8688, "lon": 151.2093},
    ]

    # 2) Training period – full year to have more data
    train_start = "20200101"
    train_end   = "20201231"

    print("Building training dataset...")
    data = build_training_data(locations, train_start, train_end, pr=0.8)

    print(f"Training data shape: {data.shape}")
    global_model = train_global_model(data)

    # Save the trained model
    joblib.dump(global_model, MODEL_PATH)
    print(f"Saved global model to {MODEL_PATH}")

    # 3) Predict for a new plant (example: 1 MW in Chennai) at 15-min resolution
    plant_lat = 13.0827    # Chennai
    plant_lon = 80.2707
    capacity_kwp = 1000.0  # 1 MW plant
    plant_pr = 0.8

    # Forecast period (just 1–2 days as example)
    forecast_start = "20210201"
    forecast_end   = "20210202"

    print("\nPredicting 15-min forecast for new plant in Chennai...")
    forecast_df_15 = predict_for_plant_15min(
        global_model,
        plant_lat,
        plant_lon,
        capacity_kwp,
        plant_pr,
        forecast_start,
        forecast_end,
    )

    print(forecast_df_15.head())
    # You can save to CSV for your frontend / dashboard
    forecast_df_15.to_csv("global_forecast_chennai_15min.csv")
    print("Saved 15-min forecast to global_forecast_chennai_15min.csv")
