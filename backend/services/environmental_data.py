import os
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timezone
import threading
from zoneinfo import ZoneInfo

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")

ENVIRONMENT_PROVIDER = os.getenv("ENVIRONMENT_PROVIDER", "OPEN_METEO")
OPEN_METEO_URL = os.getenv("OPEN_METEO_URL", "https://api.open-meteo.com/v1/forecast")
ENVIRONMENT_REFRESH_SECONDS = int(os.getenv("ENVIRONMENT_REFRESH_SECONDS", "300"))
ENVIRONMENT_TIMEOUT_SECONDS = int(os.getenv("ENVIRONMENT_TIMEOUT_SECONDS", "10"))

ENV_CACHE = {}
ENV_CACHE_LOCK = threading.Lock()

def get_now_kolkata():
    return datetime.now(KOLKATA_TZ)

def fetch_open_meteo_live(lat, lon, force_refresh=False):
    """
    Retrieves live environmental/weather conditions from Open-Meteo API.
    Caches responses for ENVIRONMENT_REFRESH_SECONDS (default 300s).
    Returns structured live environmental data and a 24h DataFrame for Random Forest predictions.
    """
    key = (round(float(lat), 4), round(float(lon), 4))
    now = datetime.now(timezone.utc)

    with ENV_CACHE_LOCK:
        cached = ENV_CACHE.get(key)
        if cached and not force_refresh:
            age_seconds = (now - cached["fetched_at"]).total_seconds()
            if age_seconds < ENVIRONMENT_REFRESH_SECONDS:
                result = dict(cached["data"])
                result["data_age_seconds"] = int(age_seconds)
                return result

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover",
        "hourly": "shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover",
        "timezone": "Asia/Kolkata",
        "forecast_days": 2
    }

    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=ENVIRONMENT_TIMEOUT_SECONDS)
        if resp.status_code == 200:
            payload = resp.json()
            curr = payload.get("current", {})
            hourly = payload.get("hourly", {})

            ghi = float(curr.get("shortwave_radiation", 0.0) or 0.0)
            direct_rad = float(curr.get("direct_normal_irradiance", 0.0) or 0.0)
            diffuse_rad = float(curr.get("diffuse_radiation", 0.0) or 0.0)
            temp = float(curr.get("temperature_2m", 25.0) or 25.0)
            rh = float(curr.get("relative_humidity_2m", 50.0) or 50.0)
            wind = float(curr.get("wind_speed_10m", 3.0) or 3.0)
            cloud = float(curr.get("cloud_cover", 0.0) or 0.0)

            # Scientific Clear-Sky GHI estimation based on cloud cover attenuation
            cloud_factor = max(0.1, 1.0 - (cloud / 100.0) * 0.75)
            ghi_clear = float(max(ghi, ghi / cloud_factor if cloud_factor > 0 else ghi))

            # Build 24-hour Dataframe for Random Forest Model prediction
            times = hourly.get("time", [])
            ghis = hourly.get("shortwave_radiation", [])
            temps = hourly.get("temperature_2m", [])
            rhs = hourly.get("relative_humidity_2m", [])
            winds = hourly.get("wind_speed_10m", [])
            clouds = hourly.get("cloud_cover", [])

            df_rows = []
            now_kolkata = get_now_kolkata()
            today_start = now_kolkata.replace(hour=0, minute=0, second=0, microsecond=0)

            for i in range(min(24, len(times))):
                t_str = times[i]
                try:
                    dt = datetime.fromisoformat(t_str).replace(tzinfo=KOLKATA_TZ)
                except Exception:
                    dt = today_start + pd.Timedelta(hours=i)

                h_ghi = float(ghis[i] if i < len(ghis) and ghis[i] is not None else 0.0)
                h_temp = float(temps[i] if i < len(temps) and temps[i] is not None else 25.0)
                h_rh = float(rhs[i] if i < len(rhs) and rhs[i] is not None else 50.0)
                h_wind = float(winds[i] if i < len(winds) and winds[i] is not None else 3.0)
                h_cloud = float(clouds[i] if i < len(clouds) and clouds[i] is not None else 0.0)
                h_cloud_factor = max(0.1, 1.0 - (h_cloud / 100.0) * 0.75)
                h_ghi_clear = float(max(h_ghi, h_ghi / h_cloud_factor))

                df_rows.append({
                    "datetime": dt,
                    "GHI": h_ghi,
                    "GHI_CLEAR": h_ghi_clear,
                    "TEMP": h_temp,
                    "RH": h_rh,
                    "WIND": h_wind,
                    "cloud_cover": h_cloud,
                    "lat": lat,
                    "lon": lon,
                    "hour": dt.hour,
                    "day_of_year": dt.timetuple().tm_yday
                })

            df_weather = pd.DataFrame(df_rows)
            df_weather.set_index("datetime", inplace=True)

            res_data = {
                "status": "LIVE",
                "source": "Open-Meteo",
                "provider": ENVIRONMENT_PROVIDER,
                "latitude": lat,
                "longitude": lon,
                "fetched_at": get_now_kolkata().isoformat(),
                "data_age_seconds": 0,
                "current": {
                    "ghi": ghi,
                    "ghi_clear": round(ghi_clear, 1),
                    "direct_normal_irradiance": direct_rad,
                    "diffuse_radiation": diffuse_rad,
                    "temperature": temp,
                    "relative_humidity": rh,
                    "wind_speed": wind,
                    "cloud_cover": cloud,
                    "is_daytime": (ghi > 10.0)
                },
                "data_source_label": "🟢 LIVE — Open-Meteo Environmental Data",
                "df_weather": df_weather
            }

            with ENV_CACHE_LOCK:
                ENV_CACHE[key] = {
                    "fetched_at": now,
                    "data": res_data
                }

            return res_data

    except Exception as e:
        print(f"Open-Meteo API Error/Timeout ({e}) for ({lat}, {lon}). Checking cache...")

    with ENV_CACHE_LOCK:
        cached = ENV_CACHE.get(key)
        if cached:
            age_seconds = (now - cached["fetched_at"]).total_seconds()
            result = dict(cached["data"])
            result["status"] = "STALE_CACHE"
            result["data_source_label"] = f"⚠️ LIVE — Open-Meteo (Stale Data, {int(age_seconds)}s old)"
            result["data_age_seconds"] = int(age_seconds)
            return result

    # Fallback if no Open-Meteo connection and no cache
    return {
        "status": "UNAVAILABLE",
        "source": "Open-Meteo (Unavailable)",
        "provider": ENVIRONMENT_PROVIDER,
        "latitude": lat,
        "longitude": lon,
        "fetched_at": None,
        "data_age_seconds": None,
        "current": {
            "ghi": 0.0,
            "ghi_clear": 0.0,
            "direct_normal_irradiance": 0.0,
            "diffuse_radiation": 0.0,
            "temperature": 25.0,
            "relative_humidity": 50.0,
            "wind_speed": 0.0,
            "cloud_cover": 0.0,
            "is_daytime": False
        },
        "data_source_label": "🔴 LIVE — Open-Meteo Environmental Data Unavailable",
        "df_weather": None
    }
