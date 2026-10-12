import os
import sys
import time
import math
import random
import argparse
import requests
from datetime import datetime
from zoneinfo import ZoneInfo

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")

PLANT_SPECS = {
    1: {
        "plant_id": 1,
        "name": "Chennai Solar Farm",
        "lat": 13.0827,
        "lon": 80.2707,
        "capacity_kwp": 5000,
        "ac_capacity_kw": 4500,
        "inverters_count": 5
    },
    2: {
        "plant_id": 2,
        "name": "Mumbai Plant",
        "lat": 19.0760,
        "lon": 72.8777,
        "capacity_kwp": 3000,
        "ac_capacity_kw": 2700,
        "inverters_count": 4
    },
    3: {
        "plant_id": 3,
        "name": "Bangalore Site",
        "lat": 12.9716,
        "lon": 77.5946,
        "capacity_kwp": 2000,
        "ac_capacity_kw": 1800,
        "inverters_count": 3
    }
}

INVERTER_EFFICIENCIES = {
    "INV_1": 0.975,
    "INV_2": 0.965,
    "INV_3": 0.980,
    "INV_4": 0.970,
    "INV_5": 0.960
}

class InverterTelemetrySimulator:
    def __init__(self, api_url="http://localhost:5000/api/telemetry/ingest", source="SIMULATOR"):
        self.api_url = api_url
        self.source = source
        self.energy_accumulator = {}

    def fetch_live_environmental_data(self, plant):
        """Fetch live Open-Meteo environmental data or generate realistic fallback diurnal curve."""
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={plant['lat']}&longitude={plant['lon']}&current=shortwave_radiation,temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                return {
                    "ghi": float(current.get("shortwave_radiation", 0.0)),
                    "temperature": float(current.get("temperature_2m", 28.0)),
                    "relative_humidity": float(current.get("relative_humidity_2m", 55.0)),
                    "wind_speed": float(current.get("wind_speed_10m", 3.5)),
                    "cloud_cover": float(current.get("cloud_cover", 10.0)),
                    "is_live_open_meteo": True
                }
        except Exception:
            pass

        # Realistic Diurnal Fallback Curve based on current local hour
        now_dt = datetime.now(KOLKATA_TZ)
        hour_float = now_dt.hour + now_dt.minute / 60.0 + now_dt.second / 3600.0
        
        if 6.0 <= hour_float <= 18.0:
            sin_val = math.sin((hour_float - 6.0) / 12.0 * math.pi)
            ghi = max(0.0, sin_val * 850.0 + random.uniform(-15.0, 15.0))
            temp = 24.0 + sin_val * 10.0 + random.uniform(-0.5, 0.5)
            cloud = max(0.0, min(100.0, 15.0 + random.uniform(-10.0, 10.0)))
        else:
            ghi = 0.0
            temp = 22.0 + random.uniform(-0.5, 0.5)
            cloud = 5.0

        return {
            "ghi": round(ghi, 1),
            "temperature": round(temp, 1),
            "relative_humidity": 55.0,
            "wind_speed": 3.0,
            "cloud_cover": round(cloud, 1),
            "is_live_open_meteo": False
        }

    def generate_plant_telemetry(self, plant_id, interval_seconds=5, fault_spec=None):
        """Generate physically realistic telemetry for a single solar plant."""
        plant = PLANT_SPECS.get(plant_id)
        if not plant:
            raise ValueError(f"Invalid plant_id {plant_id}")

        env = self.fetch_live_environmental_data(plant)
        ghi = env["ghi"]
        amb_temp = env["temperature"]
        cloud = env["cloud_cover"]
        
        mod_temp = amb_temp + (ghi / 800.0) * 25.0 + random.uniform(-0.5, 0.5) if ghi > 0 else amb_temp

        inverters_count = plant["inverters_count"]
        per_inv_capacity = float(plant["ac_capacity_kw"] / inverters_count)
        now_iso = datetime.now(KOLKATA_TZ).isoformat()

        if plant_id not in self.energy_accumulator:
            self.energy_accumulator[plant_id] = {f"INV_{i}": 0.0 for i in range(1, inverters_count + 1)}

        cloud_attenuation = max(0.2, 1.0 - (cloud / 100.0) * 0.35)
        base_efficiency = min(1.0, ghi / 1000.0) * cloud_attenuation

        telemetry_payload = []

        for i in range(1, inverters_count + 1):
            inv_id = f"INV_{i}"
            inv_eff = INVERTER_EFFICIENCIES.get(inv_id, 0.97)
            noise_factor = random.uniform(0.985, 1.015)

            if ghi <= 5.0:
                actual_ac = 0.0
                dc_power = 0.0
                voltage = round(random.uniform(410.0, 420.0), 1)
                current = 0.0
                status = "NIGHT"
            else:
                raw_power = per_inv_capacity * base_efficiency * inv_eff * noise_factor
                actual_ac = min(per_inv_capacity, max(0.0, raw_power))
                
                # Temperature derating coefficient (-0.4%/°C above 25°C)
                if mod_temp > 25.0:
                    derate = 1.0 - (mod_temp - 25.0) * 0.004
                    actual_ac *= max(0.80, derate)

                dc_power = min(per_inv_capacity * 1.06, actual_ac * 1.04)
                voltage = round(415.0 + random.normalvariate(0, 2.0), 1)
                current = round((actual_ac * 1000.0) / (max(1.0, voltage) * 1.732 * 0.95), 1)
                status = "NORMAL"

            # Check fault injection
            if fault_spec and ":" in fault_spec:
                target_inv, fault_type = fault_spec.split(":", 1)
                if target_inv.strip().upper() == inv_id.upper():
                    fault_type_upper = fault_type.strip().upper()
                    if fault_type_upper == "OFFLINE":
                        actual_ac = 0.0
                        dc_power = 0.0
                        current = 0.0
                        status = "OFFLINE"
                        print(f"   ⚠️ [SIMULATOR TEST FAULT] {inv_id} forced OFFLINE")
                    elif fault_type_upper in ("UNDERPERFORMANCE", "CRITICAL"):
                        actual_ac *= 0.75
                        status = "CRITICAL"
                        print(f"   ⚠️ [SIMULATOR TEST FAULT] {inv_id} underperforming by 25%")
                    elif fault_type_upper in ("THERMAL_DERATING", "WARNING"):
                        actual_ac *= 0.85
                        status = "WARNING"
                        print(f"   ⚠️ [SIMULATOR TEST FAULT] {inv_id} thermal derating active")

            # Accumulate energy continuously
            energy_increment = actual_ac * (interval_seconds / 3600.0)
            self.energy_accumulator[plant_id][inv_id] += energy_increment
            total_kwh = self.energy_accumulator[plant_id][inv_id]

            rec = {
                "plant_id": plant_id,
                "inverter_id": inv_id,
                "timestamp": now_iso,
                "actual_ac_power_kw": round(actual_ac, 2),
                "dc_power_kw": round(dc_power, 2),
                "voltage": voltage,
                "current": current,
                "energy_kwh": round(total_kwh, 3),
                "inverter_status": status,
                "ghi": round(ghi, 1),
                "module_temperature": round(mod_temp, 1),
                "ambient_temperature": round(amb_temp, 1),
                "telemetry_source": self.source
            }
            telemetry_payload.append(rec)

        return telemetry_payload

    def transmit(self, payload):
        """Send telemetry array to backend ingestion API."""
        try:
            resp = requests.post(self.api_url, json=payload, timeout=5)
            if resp.status_code == 200:
                return True, resp.json()
            return False, f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            return False, str(e)

def run_simulation(plant_arg="all", interval=5, fault=None, api_url="http://localhost:5000/api/telemetry/ingest", source="SIMULATOR"):
    simulator = InverterTelemetrySimulator(api_url=api_url, source=source)
    
    if str(plant_arg).lower() == "all":
        plants_to_run = [1, 2, 3]
    else:
        plants_to_run = [int(plant_arg)]

    print("=" * 75)
    print(f"🚀 SOLAR CONSOLE REAL-TIME TELEMETRY SIMULATOR RUNNING")
    print(f"   Target Plants: {plants_to_run}")
    print(f"   Ingestion URL: {api_url}")
    print(f"   Interval: {interval} seconds")
    print(f"   Telemetry Source Label: {source}")
    if fault:
        print(f"   Active Test Fault: {fault} (SIMULATOR TEST FAULT)")
    print("=" * 75)

    try:
        while True:
            for pid in plants_to_run:
                plant = PLANT_SPECS[pid]
                payload = simulator.generate_plant_telemetry(pid, interval_seconds=interval, fault_spec=fault)
                success, res = simulator.transmit(payload)

                total_ac = sum(r["actual_ac_power_kw"] for r in payload)
                ghi = payload[0]["ghi"] if payload else 0.0

                if success:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] [SIMULATOR] Plant: {plant['name']} (#{pid}) | Total Power: {round(total_ac, 1)} kW | GHI: {ghi} W/m² | Inverters: {len(payload)} | Source: {source} | Sent OK ✅")
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] [SIMULATOR] Plant: {plant['name']} (#{pid}) | Transmission Failed: {res} ❌")

            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n🛑 Telemetry Simulator stopped by user.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real-Time SCADA Solar Inverter Telemetry Simulator")
    parser.add_argument("--plant", type=str, default="all", help="Plant ID (1, 2, 3) or 'all' (default: all)")
    parser.add_argument("--all", action="store_true", help="Run telemetry generation for all plants")
    parser.add_argument("--interval", type=int, default=5, help="Simulation loop interval in seconds (default: 5)")
    parser.add_argument("--fault", type=str, default=None, help="Fault injection spec, e.g. 'INV_3:UNDERPERFORMANCE' or 'INV_5:OFFLINE'")
    parser.add_argument("--api-url", type=str, default="http://localhost:5000/api/telemetry/ingest", help="Backend ingestion API endpoint")
    parser.add_argument("--source", type=str, default="SIMULATOR", help="Telemetry source tag (default: SIMULATOR)")

    args = parser.parse_args()
    target_plant = "all" if args.all else args.plant

    run_simulation(
        plant_arg=target_plant,
        interval=args.interval,
        fault=args.fault,
        api_url=args.api_url,
        source=args.source
    )
