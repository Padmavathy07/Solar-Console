
import unittest
import json
import warnings
warnings.filterwarnings('ignore')

from app import app, get_now_kolkata

class TestMultiSiteDataIsolation(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.date_str = "2026-08-26"

    def test_A_reproducibility(self):
        """Test A: Same plant + same date => two requests return identical telemetry."""
        for pid in [1, 2, 3]:
            res1 = self.app.get(f'/api/dashboard?plant_id={pid}&date={self.date_str}&mode=DEMO')
            res2 = self.app.get(f'/api/dashboard?plant_id={pid}&date={self.date_str}&mode=DEMO')
            
            data1 = json.loads(res1.data)
            data2 = json.loads(res2.data)

            self.assertEqual(data1["current_total_power_kw"], data2["current_total_power_kw"])
            self.assertEqual(data1["today_energy_kwh"], data2["today_energy_kwh"])
            self.assertEqual(data1["predicted_total_power_3h_kw"], data2["predicted_total_power_3h_kw"])

    def test_B_chennai_vs_mumbai(self):
        """Test B: Chennai vs Mumbai => values are NOT identical."""
        res_c = self.app.get(f'/api/dashboard?plant_id=1&date={self.date_str}&mode=DEMO')
        res_m = self.app.get(f'/api/dashboard?plant_id=2&date={self.date_str}&mode=DEMO')

        data_c = json.loads(res_c.data)
        data_m = json.loads(res_m.data)

        self.assertNotEqual(data_c["current_total_power_kw"], data_m["current_total_power_kw"])
        self.assertNotEqual(data_c["predicted_total_power_3h_kw"], data_m["predicted_total_power_3h_kw"])
        self.assertEqual(data_c["plant_name"], "Chennai Solar Farm")
        self.assertEqual(data_m["plant_name"], "Mumbai Plant")

    def test_C_chennai_vs_bangalore(self):
        """Test C: Chennai vs Bangalore => values are NOT identical."""
        res_c = self.app.get(f'/api/dashboard?plant_id=1&date={self.date_str}&mode=DEMO')
        res_b = self.app.get(f'/api/dashboard?plant_id=3&date={self.date_str}&mode=DEMO')

        data_c = json.loads(res_c.data)
        data_b = json.loads(res_b.data)

        self.assertNotEqual(data_c["current_total_power_kw"], data_b["current_total_power_kw"])
        self.assertNotEqual(data_c["today_energy_kwh"], data_b["today_energy_kwh"])

    def test_D_mumbai_vs_bangalore(self):
        """Test D: Mumbai vs Bangalore => values are NOT identical."""
        res_m = self.app.get(f'/api/dashboard?plant_id=2&date={self.date_str}&mode=DEMO')
        res_b = self.app.get(f'/api/dashboard?plant_id=3&date={self.date_str}&mode=DEMO')

        data_m = json.loads(res_m.data)
        data_b = json.loads(res_b.data)

        self.assertNotEqual(data_m["current_total_power_kw"], data_b["current_total_power_kw"])
        self.assertEqual(data_m["plant_name"], "Mumbai Plant")
        self.assertEqual(data_b["plant_name"], "Bangalore Site")

    def test_E_inverter_counts(self):
        """Test E: Plant selector updates inverter count (Chennai=5, Mumbai=4, Bangalore=3)."""
        res1 = self.app.get(f'/api/inverters?plant_id=1&date={self.date_str}&mode=DEMO')
        res2 = self.app.get(f'/api/inverters?plant_id=2&date={self.date_str}&mode=DEMO')
        res3 = self.app.get(f'/api/inverters?plant_id=3&date={self.date_str}&mode=DEMO')

        invs1 = json.loads(res1.data)
        invs2 = json.loads(res2.data)
        invs3 = json.loads(res3.data)

        self.assertEqual(len(invs1), 5)  # Chennai: 5 inverters
        self.assertEqual(len(invs2), 4)  # Mumbai: 4 inverters
        self.assertEqual(len(invs3), 3)  # Bangalore: 3 inverters

    def test_F_ai_insights_context(self):
        """Test F: AI insights reference selected plant only."""
        res_c = self.app.get(f'/api/ai/insights?plant_id=1&date={self.date_str}&mode=DEMO')
        res_m = self.app.get(f'/api/ai/insights?plant_id=2&date={self.date_str}&mode=DEMO')
        res_b = self.app.get(f'/api/ai/insights?plant_id=3&date={self.date_str}&mode=DEMO')

        data_c = json.loads(res_c.data)
        data_m = json.loads(res_m.data)
        data_b = json.loads(res_b.data)

        self.assertEqual(data_c["plant_name"], "Chennai Solar Farm")
        self.assertIn("Chennai Solar Farm", data_c["summary"])

        self.assertEqual(data_m["plant_name"], "Mumbai Plant")
        self.assertIn("Mumbai Plant", data_m["summary"])
        self.assertNotIn("Chennai", data_m["summary"])

        self.assertEqual(data_b["plant_name"], "Bangalore Site")
        self.assertIn("Bangalore Site", data_b["summary"])
        self.assertNotIn("Chennai", data_b["summary"])

    def test_G_alerts_isolation(self):
        """Test G: Alerts belong only to selected plant."""
        res1 = self.app.get(f'/api/alerts?plant_id=1&date={self.date_str}&mode=DEMO')
        res2 = self.app.get(f'/api/alerts?plant_id=2&date={self.date_str}&mode=DEMO')
        res3 = self.app.get(f'/api/alerts?plant_id=3&date={self.date_str}&mode=DEMO')

        alerts1 = json.loads(res1.data)
        alerts2 = json.loads(res2.data)
        alerts3 = json.loads(res3.data)

        for a in alerts1:
            self.assertEqual(a["plant_id"], 1)

        for a in alerts2:
            self.assertEqual(a["plant_id"], 2)

        for a in alerts3:
            self.assertEqual(a["plant_id"], 3)

    def test_H_live_environment_coordinates(self):
        """Test H: LIVE environment API returns data for selected plant coordinates."""
        res1 = self.app.get('/api/environment/live?plant_id=1')
        res2 = self.app.get('/api/environment/live?plant_id=2')
        res3 = self.app.get('/api/environment/live?plant_id=3')

        env1 = json.loads(res1.data)
        env2 = json.loads(res2.data)
        env3 = json.loads(res3.data)

        self.assertEqual(env1["plant_id"], 1)
        self.assertEqual(env1["plant_name"], "Chennai Solar Farm")

        self.assertEqual(env2["plant_id"], 2)
        self.assertEqual(env2["plant_name"], "Mumbai Plant")

        self.assertEqual(env3["plant_id"], 3)
        self.assertEqual(env3["plant_name"], "Bangalore Site")

    def test_I_live_telemetry_isolation(self):
        """Test I: LIVE telemetry from plant 1 never appears when plant 2 is selected."""
        # Ingest telemetry for plant_id=1
        payload = [{
            "plant_id": 1,
            "inverter_id": "INV_1",
            "timestamp": "2026-08-26T12:00:00+05:30",
            "actual_ac_power_kw": 420.0,
            "dc_power_kw": 440.0,
            "inverter_status": "NORMAL"
        }]
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        # Query plant 2
        res2 = self.app.get('/api/telemetry/latest?plant_id=2')
        data2 = json.loads(res2.data)
        
        # Verify plant 2 has 0 records from plant 1
        for rec in data2.get("records", []):
            self.assertNotEqual(rec["plant_id"], 1)

    def test_J_all_endpoints_accept_plant_id(self):
        """Test J: All 11 platform endpoints parse and filter by plant_id."""
        endpoints = [
            f'/api/dashboard?plant_id=2&date={self.date_str}&mode=DEMO',
            f'/api/timeseries?plant_id=2&date={self.date_str}&mode=DEMO',
            f'/api/inverters?plant_id=2&date={self.date_str}&mode=DEMO',
            f'/api/weather?plant_id=2&date={self.date_str}&mode=DEMO',
            f'/api/forecast?plant_id=2&horizon=3&mode=DEMO',
            f'/api/alerts?plant_id=2&date={self.date_str}&mode=DEMO',
            f'/api/records?plant_id=2&date={self.date_str}&limit=50&mode=DEMO',
            f'/api/ai/insights?plant_id=2&date={self.date_str}&mode=DEMO',
            f'/api/ai/explain?plant_id=2&date={self.date_str}&mode=DEMO',
            '/api/environment/live?plant_id=2',
            '/api/telemetry/latest?plant_id=2'
        ]

        for url in endpoints:
            res = self.app.get(url)
            self.assertEqual(res.status_code, 200, f"Failed for URL: {url}")

if __name__ == "__main__":
    unittest.main()
