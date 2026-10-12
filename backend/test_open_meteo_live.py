import unittest
import json
import warnings
warnings.filterwarnings('ignore')

from app import app, get_now_kolkata

class TestOpenMeteoLiveIntegration(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_01_environment_live_endpoint(self):
        """Test GET /api/environment/live returns genuine Open-Meteo data."""
        response = self.app.get('/api/environment/live?plant_id=1')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertEqual(data["source"], "Open-Meteo")
        self.assertEqual(data["status"], "LIVE")
        self.assertEqual(data["plant_id"], 1)
        self.assertIn("current", data)

        curr = data["current"]
        self.assertIn("ghi", curr)
        self.assertIn("temperature", curr)
        self.assertIn("relative_humidity", curr)
        self.assertIn("wind_speed", curr)
        self.assertIn("cloud_cover", curr)

        self.assertGreaterEqual(curr["ghi"], 0.0)
        self.assertGreater(curr["temperature"], -10.0)

    def test_02_live_mode_open_meteo_dashboard(self):
        """Test LIVE mode dashboard uses Open-Meteo environmental data and RF predictions."""
        response = self.app.get('/api/dashboard?plant_id=1&mode=LIVE')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertEqual(data["mode"], "LIVE")
        self.assertIn("Open-Meteo", data["data_source_label"])
        self.assertIn("LIVE —", data["telemetry_source_label"])
        self.assertGreaterEqual(data["predicted_total_power_3h_kw"], 0.0)

        # Inverter telemetry should be 0.0 kW when not connected
        self.assertGreaterEqual(data["current_total_power_kw"], 0.0)

    def test_03_demo_mode_preservation(self):
        """Test DEMO mode preserves synthetic inverter telemetry and controlled anomalies."""
        response = self.app.get('/api/dashboard?plant_id=1&date=2026-08-26&mode=DEMO')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertEqual(data["mode"], "DEMO")
        self.assertEqual(data["telemetry_source_label"], "DEMO — Synthetic Plant Telemetry")
        self.assertGreater(data["current_total_power_kw"], 0.0)

        # Check controlled anomalies in DEMO mode
        inv_res = self.app.get('/api/inverters?plant_id=1&date=2026-08-26&mode=DEMO')
        inverters = json.loads(inv_res.data)
        inv_map = {inv["inverter_id"]: inv for inv in inverters}
        self.assertEqual(inv_map["INV_5"]["status"], "offline")
        self.assertEqual(inv_map["INV_3"]["status"], "critical")

    def test_04_telemetry_ingestion_and_live_mode(self):
        """Test POST /api/telemetry/ingest updates LIVE dashboard without modifying environmental data."""
        now_iso = get_now_kolkata().isoformat()
        sample_payload = [
            {
                "plant_id": 1,
                "inverter_id": "INV_1",
                "timestamp": now_iso,
                "actual_ac_power_kw": 550.0,
                "dc_power_kw": 570.0,
                "voltage": 415.0,
                "current": 1300.0,
                "energy_kwh": 4400.0,
                "inverter_status": "NORMAL"
            }
        ]

        ingest_res = self.app.post('/api/telemetry/ingest',
                                  data=json.dumps(sample_payload),
                                  content_type='application/json')
        self.assertEqual(ingest_res.status_code, 200)

        dash_res = self.app.get('/api/dashboard?plant_id=1&mode=LIVE')
        dash_data = json.loads(dash_res.data)
        self.assertTrue(dash_data["is_live_connected"])
        self.assertGreater(dash_data["current_total_power_kw"], 0.0)
        self.assertIn("Open-Meteo", dash_data["data_source_label"])

    def test_05_ai_assistant_live_explanations(self):
        """Test AI Assistant correctly explains Open-Meteo environmental data and telemetry separation."""
        req_payload = {
            "query": "Is this real-time data?",
            "plant_id": 1,
            "mode": "LIVE"
        }
        res = self.app.post('/api/ai/assistant',
                            data=json.dumps(req_payload),
                            content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("Open-Meteo", data["answer"])

    def test_06_nasa_power_not_in_live_mode(self):
        """Verify NASA POWER is NOT displayed as the environmental source in LIVE mode."""
        res = self.app.get('/api/dashboard?plant_id=2&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertEqual(data["mode"], "LIVE")
        self.assertIn("Open-Meteo", data["data_source_label"])
        self.assertNotIn("NASA POWER", data["data_source_label"])

if __name__ == "__main__":
    unittest.main()
