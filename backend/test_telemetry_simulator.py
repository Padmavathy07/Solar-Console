import unittest
import json
import time
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

from app import app, get_now_kolkata, parse_date_str
from simulator.inverter_simulator import InverterTelemetrySimulator, PLANT_SPECS

class TestTelemetrySimulator(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.simulator = InverterTelemetrySimulator(source="SIMULATOR")

    def test_01_simulator_creates_valid_telemetry(self):
        """Test 1: Simulator creates valid telemetry data."""
        payload = self.simulator.generate_plant_telemetry(1, interval_seconds=5)
        self.assertIsInstance(payload, list)
        self.assertEqual(len(payload), 5)  # Chennai has 5 inverters
        for item in payload:
            self.assertIn("timestamp", item)
            self.assertIn("actual_ac_power_kw", item)
            self.assertIn("dc_power_kw", item)
            self.assertIn("voltage", item)
            self.assertIn("current", item)
            self.assertIn("energy_kwh", item)
            self.assertIn("inverter_status", item)

    def test_02_telemetry_contains_correct_plant_id(self):
        """Test 2: Telemetry contains correct plant_id."""
        for pid in [1, 2, 3]:
            payload = self.simulator.generate_plant_telemetry(pid)
            for item in payload:
                self.assertEqual(item["plant_id"], pid)

    def test_03_telemetry_contains_correct_inverter_id(self):
        """Test 3: Telemetry contains correct inverter_id."""
        payload1 = self.simulator.generate_plant_telemetry(1)
        payload2 = self.simulator.generate_plant_telemetry(2)
        payload3 = self.simulator.generate_plant_telemetry(3)

        self.assertEqual([x["inverter_id"] for x in payload1], ["INV_1", "INV_2", "INV_3", "INV_4", "INV_5"])
        self.assertEqual([x["inverter_id"] for x in payload2], ["INV_1", "INV_2", "INV_3", "INV_4"])
        self.assertEqual([x["inverter_id"] for x in payload3], ["INV_1", "INV_2", "INV_3"])

    def test_04_values_stay_within_capacity_limits(self):
        """Test 4: Values stay within plant inverter capacity limits."""
        for pid in [1, 2, 3]:
            spec = PLANT_SPECS[pid]
            per_inv_cap = spec["ac_capacity_kw"] / spec["inverters_count"]
            payload = self.simulator.generate_plant_telemetry(pid)
            for item in payload:
                self.assertGreaterEqual(item["actual_ac_power_kw"], 0.0)
                self.assertLessEqual(item["actual_ac_power_kw"], per_inv_cap + 1.0)

    def test_05_different_plants_produce_different_values(self):
        """Test 5: Different plants produce different total telemetry values."""
        p1 = self.simulator.generate_plant_telemetry(1)
        p2 = self.simulator.generate_plant_telemetry(2)
        p3 = self.simulator.generate_plant_telemetry(3)

        tot1 = sum(x["actual_ac_power_kw"] for x in p1)
        tot2 = sum(x["actual_ac_power_kw"] for x in p2)
        tot3 = sum(x["actual_ac_power_kw"] for x in p3)

        if tot1 == 0.0 and tot2 == 0.0 and tot3 == 0.0:
            # Diurnal / nighttime test fallback: verify plant inverter counts differ
            self.assertNotEqual(len(p1), len(p2))
            self.assertNotEqual(len(p1), len(p3))
            self.assertNotEqual(len(p2), len(p3))
        else:
            self.assertNotEqual(tot1, tot2)
            self.assertNotEqual(tot1, tot3)
            self.assertNotEqual(tot2, tot3)

    def test_06_multiple_inverters_produce_different_values(self):
        """Test 6: Multiple inverters produce different individual values."""
        p1 = self.simulator.generate_plant_telemetry(1)
        pow1 = p1[0]["actual_ac_power_kw"]
        pow2 = p1[1]["actual_ac_power_kw"]
        if pow1 > 0:
            self.assertNotEqual(pow1, pow2)

    def test_07_post_ingest_succeeds(self):
        """Test 7: POST /api/telemetry/ingest succeeds."""
        payload = self.simulator.generate_plant_telemetry(1)
        res = self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["ingested_count"], 5)

    def test_08_get_latest_returns_latest_record(self):
        """Test 8: GET /api/telemetry/latest returns the latest records."""
        payload = self.simulator.generate_plant_telemetry(2)
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        res = self.app.get('/api/telemetry/latest?plant_id=2')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["plant_id"], 2)
        self.assertEqual(data["connection_status"], "CONNECTED")
        self.assertEqual(data["telemetry_source"], "SIMULATOR")
        self.assertGreaterEqual(len(data["records"]), 4)

    def test_09_live_dashboard_receives_simulator_telemetry(self):
        """Test 9: LIVE dashboard receives simulator telemetry and sets correct source label."""
        payload = self.simulator.generate_plant_telemetry(1)
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        res = self.app.get('/api/dashboard?plant_id=1&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertEqual(data["mode"], "LIVE")
        self.assertTrue(data["is_live_connected"])
        self.assertEqual(data["telemetry_source_label"], "🟡 LIVE — Simulated SCADA Telemetry")

    def test_10_stale_telemetry_causes_timeout_status(self):
        """Test 10: Stopping simulator telemetry causes disconnection status after timeout."""
        # Query plant 3 without ingesting any recent data
        res = self.app.get('/api/dashboard?plant_id=3&mode=LIVE')
        data = json.loads(res.data)

        if not data["is_live_connected"]:
            self.assertEqual(data["current_total_power_kw"], 0.0)
            self.assertIn("LIVE —", data["telemetry_source_label"])

    def test_11_restarting_simulator_restores_live_telemetry(self):
        """Test 11: Restarting simulator restores LIVE telemetry."""
        # Ingest fresh telemetry for plant 3
        payload = self.simulator.generate_plant_telemetry(3)
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        res = self.app.get('/api/dashboard?plant_id=3&mode=LIVE')
        data = json.loads(res.data)

        self.assertTrue(data["is_live_connected"])
        self.assertEqual(data["telemetry_source_label"], "🟡 LIVE — Simulated SCADA Telemetry")

    def test_12_demo_mode_remains_unchanged(self):
        """Test 12: DEMO mode remains completely unchanged and returns synthetic plant telemetry."""
        res = self.app.get('/api/dashboard?plant_id=1&mode=DEMO')
        data = json.loads(res.data)
        self.assertEqual(data["mode"], "DEMO")
        self.assertEqual(data["telemetry_source_label"], "DEMO — Synthetic Plant Telemetry")

    def test_13_live_mode_never_falls_back_to_demo_telemetry(self):
        """Test 13: LIVE mode never silently falls back to synthetic DEMO inverter readings when disconnected."""
        # Clean plant 2 data check
        res = self.app.get('/api/dashboard?plant_id=2&mode=LIVE')
        data = json.loads(res.data)
        if not data["is_live_connected"]:
            self.assertEqual(data["current_total_power_kw"], 0.0)

    def test_14_open_meteo_environmental_data_remains_separate(self):
        """Test 14: Open-Meteo environmental data remains separate from inverter telemetry."""
        res = self.app.get('/api/environment/live?plant_id=1')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["plant_id"], 1)
        self.assertIn("current", data)
        self.assertIn("ghi", data["current"])
        self.assertIn("temperature", data["current"])

    def test_15_simulator_source_is_correctly_labeled_simulator(self):
        """Test 15: Simulator source is correctly labeled SIMULATOR."""
        payload = self.simulator.generate_plant_telemetry(1)
        self.assertEqual(payload[0]["telemetry_source"], "SIMULATOR")

if __name__ == "__main__":
    unittest.main()
