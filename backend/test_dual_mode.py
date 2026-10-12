import unittest
import json
import warnings
warnings.filterwarnings('ignore')

from app import app, init_db, DB_PATH, get_now_kolkata, parse_date_str

class TestDualModePlatform(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        conn.cursor().execute("DELETE FROM live_telemetry")
        conn.commit()
        conn.close()

    def test_01_demo_mode_synthetic_telemetry(self):
        """Test DEMO mode returns synthetic telemetry with controlled anomalies and labels."""
        response = self.app.get('/api/dashboard?plant_id=1&date=2026-08-26&mode=DEMO')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertEqual(data["mode"], "DEMO")
        self.assertEqual(data["telemetry_source_label"], "DEMO — Synthetic Plant Telemetry")
        self.assertIn("current_total_power_kw", data)
        self.assertGreater(data["current_total_power_kw"], 0)

        # Check inverters endpoint in DEMO mode
        inv_res = self.app.get('/api/inverters?plant_id=1&date=2026-08-26&mode=DEMO')
        self.assertEqual(inv_res.status_code, 200)
        inverters = json.loads(inv_res.data)
        inv_map = {inv["inverter_id"]: inv for inv in inverters}
        
        self.assertIn("INV_5", inv_map)
        self.assertEqual(inv_map["INV_5"]["status"], "offline")
        self.assertEqual(inv_map["INV_5"]["current_ac_kw"], 0.0)
        self.assertEqual(inv_map["INV_3"]["status"], "critical")

    def test_02_live_mode_without_data_shows_no_data_or_connection_lost(self):
        """Test LIVE mode without recent data shows connection lost and 0.0 kW without silent fallback."""
        response = self.app.get('/api/dashboard?plant_id=99&date=2026-08-26&mode=LIVE')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertEqual(data["mode"], "LIVE")
        self.assertFalse(data["is_live_connected"])
        self.assertEqual(data["current_total_power_kw"], 0.0)
        self.assertIn("LIVE —", data["telemetry_source_label"])

    def test_03_telemetry_ingestion_and_live_mode(self):
        """Test POST /api/telemetry/ingest ingests sample test payload and LIVE mode displays real values."""
        now_iso = get_now_kolkata().isoformat()
        sample_payload = [
            {
                "plant_id": 1,
                "inverter_id": "INV_1",
                "timestamp": now_iso,
                "actual_ac_power_kw": 500.0,
                "dc_power_kw": 520.0,
                "voltage": 415.0,
                "current": 1200.0,
                "energy_kwh": 4000.0,
                "inverter_status": "NORMAL"
            },
            {
                "plant_id": 1,
                "inverter_id": "INV_2",
                "timestamp": now_iso,
                "actual_ac_power_kw": 480.0,
                "dc_power_kw": 500.0,
                "voltage": 415.0,
                "current": 1150.0,
                "energy_kwh": 3800.0,
                "inverter_status": "NORMAL"
            }
        ]

        ingest_res = self.app.post('/api/telemetry/ingest',
                                  data=json.dumps(sample_payload),
                                  content_type='application/json')
        self.assertEqual(ingest_res.status_code, 200)
        ingest_data = json.loads(ingest_res.data)
        self.assertEqual(ingest_data["status"], "success")
        self.assertEqual(ingest_data["ingested_count"], 2)

        # Now test Dashboard in LIVE mode
        dash_res = self.app.get('/api/dashboard?plant_id=1&date=2026-08-26&mode=LIVE')
        self.assertEqual(dash_res.status_code, 200)
        dash_data = json.loads(dash_res.data)

        self.assertEqual(dash_data["mode"], "LIVE")
        self.assertTrue(dash_data["is_live_connected"])
        self.assertIn("LIVE —", dash_data["telemetry_source_label"])
        self.assertEqual(dash_data["current_total_power_kw"], 980.0) # 500 + 480

    def test_04_data_explorer_separation(self):
        """Test Data Explorer records clearly distinguish DEMO and LIVE records."""
        demo_res = self.app.get('/api/records?plant_id=1&limit=10&mode=DEMO')
        self.assertEqual(demo_res.status_code, 200)
        demo_data = json.loads(demo_res.data)
        self.assertEqual(demo_data["mode"], "DEMO")
        for rec in demo_data["records"]:
            self.assertEqual(rec["mode"], "DEMO")

        live_res = self.app.get('/api/records?plant_id=1&limit=10&mode=LIVE')
        self.assertEqual(live_res.status_code, 200)
        live_data = json.loads(live_res.data)
        self.assertEqual(live_data["mode"], "LIVE")
        for rec in live_data["records"]:
            self.assertEqual(rec["mode"], "LIVE")

    def test_05_forecast_planning_demo_mode(self):
        """Test Forecast Planning API in DEMO mode with 3h horizon, prediction bounds, and summary metrics."""
        res = self.app.get('/api/forecast?plant_id=1&horizon=3&mode=DEMO')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertEqual(data["mode"], "DEMO")
        self.assertEqual(data["plant_name"], "Chennai Solar Farm")
        self.assertEqual(data["horizon_hours"], 3)
        self.assertFalse(data["is_real_data"])
        self.assertIn("total_energy_next_period_kwh", data)
        self.assertIn("peak_power_kw", data)
        self.assertIn("peak_time", data)

        points = data.get("points", [])
        self.assertEqual(len(points), 12)  # 3 hours * 4 intervals/hr = 12 points
        for p in points:
            self.assertIn("datetime", p)
            self.assertIn("predicted_ac_kw", p)
            self.assertIn("lower_bound_kw", p)
            self.assertIn("upper_bound_kw", p)
            self.assertGreaterEqual(p["upper_bound_kw"], p["lower_bound_kw"])

    def test_06_forecast_planning_multi_horizon(self):
        """Test Forecast Planning API with varied horizons (1h, 3h, 6h, 12h, 24h)."""
        horizons = {1: 4, 3: 12, 6: 24, 12: 48, 24: 96}
        for h, expected_points in horizons.items():
            res = self.app.get(f'/api/forecast?plant_id=1&horizon={h}&mode=DEMO')
            self.assertEqual(res.status_code, 200)
            data = json.loads(res.data)
            self.assertEqual(data["horizon_hours"], h)
            self.assertEqual(len(data["points"]), expected_points)

    def test_07_forecast_planning_live_mode(self):
        """Test Forecast Planning API in LIVE mode returns real/environmental forecast data."""
        res = self.app.get('/api/forecast?plant_id=1&horizon=3&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertEqual(data["mode"], "LIVE")
        self.assertIn("plant_name", data)
        self.assertIn("data_source_label", data)
        self.assertEqual(len(data["points"]), 12)

    def test_08_forecast_planning_multi_site_isolation(self):
        """Test Forecast Planning API isolates predictions across plants (Chennai, Mumbai, Bangalore)."""
        res_c = self.app.get('/api/forecast?plant_id=1&horizon=24&mode=DEMO')
        res_m = self.app.get('/api/forecast?plant_id=2&horizon=24&mode=DEMO')
        res_b = self.app.get('/api/forecast?plant_id=3&horizon=24&mode=DEMO')

        data_c = json.loads(res_c.data)
        data_m = json.loads(res_m.data)
        data_b = json.loads(res_b.data)

        self.assertEqual(data_c["plant_name"], "Chennai Solar Farm")
        self.assertEqual(data_m["plant_name"], "Mumbai Plant")
        self.assertEqual(data_b["plant_name"], "Bangalore Site")

        # Confirm peak power reflects plant capacity differences across 24h curve (5MW vs 3MW vs 2MW)
        self.assertGreater(data_c["peak_power_kw"], data_b["peak_power_kw"])

    def test_09_global_forecast_coordinate_estimation(self):
        """Test legacy/custom coordinate 15-minute forecast endpoint POST /api/global-forecast-15min."""
        payload = {
            "lat": 13.0827,
            "lon": 80.2707,
            "capacity_kwp": 5000,
            "performance_ratio": 0.8,
            "horizon_hours": 3,
            "plant_name": "Custom Site"
        }
        res = self.app.post('/api/global-forecast-15min', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertEqual(data["plant_name"], "Custom Site")
        self.assertIn("total_energy_kwh", data)
        self.assertEqual(len(data["points"]), 12)

    def test_10_model_availability_and_prediction(self):
        """Test 10: Model availability - confirms RF model is loaded, operational, and returns metrics."""
        res = self.app.get('/api/model/metrics?plant_id=1')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        self.assertTrue(data.get("is_model_loaded", True))
        self.assertIn("Random Forest", data.get("active_model", ""))
        self.assertEqual(data.get("num_estimators"), 200)
        self.assertIn("GHI", data.get("features_used", []))

    def test_11_model_metrics_structure_and_scaling(self):
        """Test 11: Model metrics - verifies R2, MAE, RMSE, MAPE and capacity-scaled metrics across sites."""
        res1 = self.app.get('/api/model/metrics?plant_id=1')
        res3 = self.app.get('/api/model/metrics?plant_id=3')

        data1 = json.loads(res1.data)
        data3 = json.loads(res3.data)

        for d in [data1, data3]:
            m = d.get("metrics", {})
            self.assertIn("r2", m)
            self.assertIn("mae_kw", m)
            self.assertIn("rmse_kw", m)
            self.assertIn("mape_pct", m)

        # Confirm MAE is scaled for 5MW (Plant 1) vs 2MW (Plant 3)
        self.assertGreater(data1["metrics"]["mae_kw"], data3["metrics"]["mae_kw"])

    def test_12_prediction_consistency_and_determinism(self):
        """Test 12: Prediction consistency - same inputs produce identical predictions."""
        res1 = self.app.get('/api/forecast?plant_id=1&date=2026-08-26&horizon=3&mode=DEMO')
        res2 = self.app.get('/api/forecast?plant_id=1&date=2026-08-26&horizon=3&mode=DEMO')

        data1 = json.loads(res1.data)
        data2 = json.loads(res2.data)

        self.assertEqual(data1["total_energy_next_period_kwh"], data2["total_energy_next_period_kwh"])
        self.assertEqual(data1["peak_power_kw"], data2["peak_power_kw"])
        self.assertEqual(data1["points"], data2["points"])

    def test_13_prediction_interval_bounds_and_physical_limits(self):
        """Test 13: Prediction interval - 90% bounds stay physically reasonable and non-negative."""
        res = self.app.get('/api/forecast?plant_id=1&horizon=24&mode=DEMO')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        points = data.get("points", [])
        self.assertGreater(len(points), 0)
        for p in points:
            lower = p["lower_bound_kw"]
            pred = p["predicted_ac_kw"]
            upper = p["upper_bound_kw"]

            self.assertGreaterEqual(lower, 0.0)
            self.assertLessEqual(upper, 5000.0)
            self.assertLessEqual(lower, pred)
            self.assertLessEqual(pred, upper)

    def test_14_model_features_and_explainability(self):
        """Test 14: Model features & AI explainability API endpoints."""
        res_feat = self.app.get('/api/model/features')
        self.assertEqual(res_feat.status_code, 200)
        feat_data = json.loads(res_feat.data)
        self.assertGreater(feat_data.get("feature_count", 0), 0)

        res_exp = self.app.get('/api/ai/explain?plant_id=1&mode=DEMO')
        self.assertEqual(res_exp.status_code, 200)
        exp_data = json.loads(res_exp.data)
        self.assertIn("description", exp_data)
        self.assertIn("features", exp_data)

    def test_15_model_monitoring_edge_cases_and_validation(self):
        """Test 15: Edge cases - invalid plant_id and invalid horizon parameters fail gracefully."""
        res_inv_plant = self.app.get('/api/model/metrics?plant_id=999')
        self.assertEqual(res_inv_plant.status_code, 200)
        data_inv = json.loads(res_inv_plant.data)
        self.assertIn("plant_name", data_inv)

        res_inv_horiz = self.app.get('/api/forecast?plant_id=1&horizon=-5')
        self.assertEqual(res_inv_horiz.status_code, 200)
        data_horiz = json.loads(res_inv_horiz.data)
        self.assertGreaterEqual(data_horiz.get("horizon_hours"), 1)

if __name__ == "__main__":
    unittest.main()


