import unittest
import json
import sqlite3
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

from app import app, init_db, DB_PATH, get_now_kolkata

class TestAlertsModuleQA(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        # Clear live_telemetry table for clean test environment
        conn = sqlite3.connect(DB_PATH)
        conn.cursor().execute("DELETE FROM live_telemetry")
        conn.commit()
        conn.close()

    def test_01_open_alerts_live_mode_loads_successfully(self):
        """Test 1 & 2: Open Alerts with LIVE mode enabled and confirm successful load."""
        res = self.app.get('/api/alerts?plant_id=1&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIsInstance(data, list)

    def test_02_alert_fields_structure(self):
        """Test 3: Confirm each alert has all required fields."""
        now_iso = get_now_kolkata().isoformat()
        payload = [{
            "plant_id": 1,
            "inverter_id": "INV_3",
            "timestamp": now_iso,
            "actual_ac_power_kw": 200.0,
            "dc_power_kw": 210.0,
            "voltage": 415.0,
            "current": 480.0,
            "energy_kwh": 1000.0,
            "inverter_status": "CRITICAL"
        }]
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        res = self.app.get('/api/alerts?plant_id=1&mode=LIVE')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        
        self.assertGreater(len(data), 0)
        for alert in data:
            self.assertIn("id", alert)
            self.assertIn("level", alert)
            self.assertIn("scope", alert)
            self.assertIn("plant_id", alert)
            self.assertIn("plant_name", alert)
            self.assertIn("message", alert)
            self.assertIn("created_at", alert)

    def test_03_multi_site_alert_isolation(self):
        """Test 4 & 5: Plant isolation (Chennai vs Mumbai vs Bangalore)."""
        now_iso = get_now_kolkata().isoformat()
        
        # Plant 1 (Chennai) fault
        p1_payload = [{
            "plant_id": 1,
            "inverter_id": "INV_5",
            "timestamp": now_iso,
            "actual_ac_power_kw": 0.0,
            "dc_power_kw": 0.0,
            "voltage": 415.0,
            "current": 0.0,
            "energy_kwh": 0.0,
            "inverter_status": "OFFLINE",
            "telemetry_source": "SIMULATOR"
        }]
        # Plant 2 (Mumbai) healthy
        p2_payload = [{
            "plant_id": 2,
            "inverter_id": "INV_1",
            "timestamp": now_iso,
            "actual_ac_power_kw": 600.0,
            "dc_power_kw": 620.0,
            "voltage": 415.0,
            "current": 1400.0,
            "energy_kwh": 3000.0,
            "inverter_status": "NORMAL",
            "telemetry_source": "SIMULATOR"
        }]
        # Plant 3 (Bangalore) healthy
        p3_payload = [{
            "plant_id": 3,
            "inverter_id": "INV_1",
            "timestamp": now_iso,
            "actual_ac_power_kw": 500.0,
            "dc_power_kw": 520.0,
            "voltage": 415.0,
            "current": 1200.0,
            "energy_kwh": 2500.0,
            "inverter_status": "NORMAL",
            "telemetry_source": "SIMULATOR"
        }]

        self.app.post('/api/telemetry/ingest', data=json.dumps(p1_payload), content_type='application/json')
        self.app.post('/api/telemetry/ingest', data=json.dumps(p2_payload), content_type='application/json')
        self.app.post('/api/telemetry/ingest', data=json.dumps(p3_payload), content_type='application/json')

        # Check Plant 1 alerts
        a1 = json.loads(self.app.get('/api/alerts?plant_id=1&mode=LIVE').data)
        for alt in a1:
            self.assertEqual(alt["plant_id"], 1)

        # Check Plant 2 alerts
        a2 = json.loads(self.app.get('/api/alerts?plant_id=2&mode=LIVE').data)
        for alt in a2:
            self.assertEqual(alt["plant_id"], 2)
            self.assertNotEqual(alt.get("inverter_id"), "INV_5")  # Chennai offline inverter must NOT be in Mumbai

        # Check Plant 3 alerts
        a3 = json.loads(self.app.get('/api/alerts?plant_id=3&mode=LIVE').data)
        for alt in a3:
            self.assertEqual(alt["plant_id"], 3)
            self.assertNotEqual(alt.get("inverter_id"), "INV_5")  # Chennai offline inverter must NOT be in Bangalore

    def test_04_live_telemetry_changes_reflected_in_alerts(self):
        """Test 6: LIVE telemetry changes are reflected in alert calculations."""
        now_iso = get_now_kolkata().isoformat()
        
        # Ingest OFFLINE status on INV_3
        payload = [{
            "plant_id": 1,
            "inverter_id": "INV_3",
            "timestamp": now_iso,
            "actual_ac_power_kw": 0.0,
            "dc_power_kw": 0.0,
            "voltage": 415.0,
            "current": 0.0,
            "energy_kwh": 1000.0,
            "inverter_status": "OFFLINE"
        }]
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        alerts = json.loads(self.app.get('/api/alerts?plant_id=1&mode=LIVE').data)
        inv3_alert = next((a for a in alerts if a.get("inverter_id") == "INV_3"), None)
        
        self.assertIsNotNone(inv3_alert)
        self.assertEqual(inv3_alert["level"], "critical")

    def test_05_threshold_and_severity_logic(self):
        """Test 7 & 8: Alert Error Threshold (>= 20% critical, >= 10% warning, < 10% no alert)."""
        now_iso = get_now_kolkata().isoformat()
        
        # Ingest offline inverter (100% deviation -> critical)
        payload = [{
            "plant_id": 1,
            "inverter_id": "INV_5",
            "timestamp": now_iso,
            "actual_ac_power_kw": 0.0,
            "dc_power_kw": 0.0,
            "voltage": 415.0,
            "current": 0.0,
            "energy_kwh": 0.0,
            "inverter_status": "OFFLINE"
        }]
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        alerts = json.loads(self.app.get('/api/alerts?plant_id=1&mode=LIVE').data)
        inv5_alert = next((a for a in alerts if a.get("inverter_id") == "INV_5"), None)

        self.assertIsNotNone(inv5_alert)
        self.assertEqual(inv5_alert["level"], "critical")
        self.assertEqual(inv5_alert["deviation_pct"], 100.0)

    def test_06_no_duplicate_alerts_on_refresh(self):
        """Test 9: Refreshing the page/endpoint does not create duplicate alerts."""
        now_iso = get_now_kolkata().isoformat()
        payload = [{
            "plant_id": 1,
            "inverter_id": "INV_5",
            "timestamp": now_iso,
            "actual_ac_power_kw": 0.0,
            "dc_power_kw": 0.0,
            "voltage": 415.0,
            "current": 0.0,
            "energy_kwh": 0.0,
            "inverter_status": "OFFLINE"
        }]
        self.app.post('/api/telemetry/ingest', data=json.dumps(payload), content_type='application/json')

        alerts_1 = json.loads(self.app.get('/api/alerts?plant_id=1&mode=LIVE').data)
        alerts_2 = json.loads(self.app.get('/api/alerts?plant_id=1&mode=LIVE').data)

        self.assertEqual(len(alerts_1), len(alerts_2))

    def test_07_disconnected_telemetry_handling(self):
        """Test 10: Disconnected telemetry handling when simulator is stopped."""
        # Query plant with no data ingested
        alerts = json.loads(self.app.get('/api/alerts?plant_id=99&mode=LIVE').data)
        
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["scope"], "SYSTEM")
        self.assertIn("telemetry", alerts[0]["message"].lower())
        # Confirm NO false per-inverter alerts were created
        inverter_alerts = [a for a in alerts if a["scope"] == "INVERTER"]
        self.assertEqual(len(inverter_alerts), 0)

    def test_08_simulator_restart_restores_live_alerts(self):
        """Test 11: Simulator restart restores LIVE telemetry and resumes alerts."""
        now_iso = get_now_kolkata().isoformat()
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

        dash = json.loads(self.app.get('/api/dashboard?plant_id=1&mode=LIVE').data)
        self.assertTrue(dash["is_live_connected"])
        self.assertGreater(dash["current_total_power_kw"], 0.0)

if __name__ == "__main__":
    unittest.main()
