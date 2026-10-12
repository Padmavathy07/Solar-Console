import unittest
import json
import sqlite3
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

from app import app, DB_PATH

class TestWeatherModuleQA(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_01_live_weather_source_loads_successfully(self):
        """Test 1: LIVE weather source loads successfully from Open-Meteo with required metadata."""
        res = self.app.get('/api/weather?plant_id=1&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["mode"], "LIVE")
        self.assertTrue(data["is_real_data"])
        self.assertIn("Open-Meteo", data["data_source_label"])

    def test_02_plant_isolation_coordinates_and_names(self):
        """Test 2: Plant isolation across Chennai (#1), Mumbai (#2), and Bangalore (#3)."""
        # Plant 1 (Chennai)
        r1 = json.loads(self.app.get('/api/weather?plant_id=1&mode=LIVE').data)
        self.assertIn("Chennai", r1["plant_name"])
        self.assertAlmostEqual(r1["latitude"], 13.0827, places=3)
        self.assertAlmostEqual(r1["longitude"], 80.2707, places=3)

        # Plant 2 (Mumbai)
        r2 = json.loads(self.app.get('/api/weather?plant_id=2&mode=LIVE').data)
        self.assertIn("Mumbai", r2["plant_name"])
        self.assertAlmostEqual(r2["latitude"], 19.0760, places=3)
        self.assertAlmostEqual(r2["longitude"], 72.8777, places=3)

        # Plant 3 (Bangalore)
        r3 = json.loads(self.app.get('/api/weather?plant_id=3&mode=LIVE').data)
        self.assertIn("Bangalore", r3["plant_name"])
        self.assertAlmostEqual(r3["latitude"], 12.9716, places=3)
        self.assertAlmostEqual(r3["longitude"], 77.5946, places=3)

        # Confirm distinct locations
        self.assertNotEqual(r1["latitude"], r2["latitude"])
        self.assertNotEqual(r2["latitude"], r3["latitude"])

    def test_03_weather_fields_populated(self):
        """Test 3: Verify all expected weather fields are populated in current and history."""
        res = self.app.get('/api/weather?plant_id=1&mode=LIVE')
        data = json.loads(res.data)
        curr = data.get("current", {})
        
        self.assertIn("irradiation", curr)
        self.assertIn("ambient_temperature", curr)
        self.assertIn("module_temperature", curr)
        self.assertIn("relative_humidity", curr)
        self.assertIn("wind_speed", curr)
        self.assertIn("cloud_cover", curr)
        self.assertIn("updated_at", curr)

        history = data.get("history", [])
        self.assertGreater(len(history), 0)
        for h in history:
            self.assertIn("datetime", h)
            self.assertIn("irradiation", h)
            self.assertIn("ambient_temperature", h)

    def test_04_scada_independence(self):
        """Test 5: Weather remains fully operational when SCADA/inverter telemetry is empty/disconnected."""
        # Clear telemetry DB
        conn = sqlite3.connect(DB_PATH)
        conn.cursor().execute("DELETE FROM live_telemetry")
        conn.commit()
        conn.close()

        # Query Weather in LIVE mode when SCADA has no data
        res = self.app.get('/api/weather?plant_id=1&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["mode"], "LIVE")
        self.assertIn("Open-Meteo", data["data_source_label"])
        self.assertIsNotNone(data["current"])

    def test_05_scada_recovery_and_weather(self):
        """Test 6: Weather continues working normally when SCADA telemetry is restored."""
        now_iso = datetime.now().isoformat()
        payload = [{
            "plant_id": 1,
            "inverter_id": "INV_1",
            "timestamp": now_iso,
            "actual_ac_power_kw": 800.0,
            "dc_power_kw": 830.0,
            "voltage": 415.0,
            "current": 1800.0,
            "energy_kwh": 4000.0,
            "inverter_status": "NORMAL"
        }]
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        res = self.app.get('/api/weather?plant_id=1&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["mode"], "LIVE")

    def test_06_demo_mode_weather(self):
        """Test 7: DEMO mode weather returns deterministic historical model."""
        res = self.app.get('/api/weather?plant_id=1&mode=DEMO')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["mode"], "DEMO")
        self.assertFalse(data["is_real_data"])

if __name__ == "__main__":
    unittest.main()
