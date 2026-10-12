import unittest
import json
import os
import sqlite3
from app import app, DB_PATH, DB_LOCK, init_db

class TestImportExplorerFeature(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        init_db()

    def tearDown(self):
        with DB_LOCK:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM imported_telemetry")
            conn.commit()
            conn.close()

    def test_01_valid_csv_import(self):
        payload = {
            "plant_id": 1,
            "records": [
                {
                    "MODE": "DEMO",
                    "DATETIME": "2026-08-27T10:00:00",
                    "INVERTER": "INV_01",
                    "ACTUAL AC POWER (KW)": "150.5",
                    "EXPECTED AC POWER (KW)": "152.0",
                    "DC POWER (KW)": "158.2",
                    "GHI (W/M²)": "820.0",
                    "MODULE TEMP (°C)": "44.5",
                    "AMBIENT TEMP (°C)": "30.1",
                    "STATUS": "NORMAL"
                },
                {
                    "MODE": "DEMO",
                    "DATETIME": "2026-08-27T10:15:00",
                    "INVERTER": "INV_02",
                    "ACTUAL AC POWER (KW)": "148.0",
                    "EXPECTED AC POWER (KW)": "150.0",
                    "DC POWER (KW)": "155.0",
                    "GHI (W/M²)": "825.0",
                    "MODULE TEMP (°C)": "45.0",
                    "AMBIENT TEMP (°C)": "30.2",
                    "STATUS": "NORMAL"
                }
            ]
        }
        res = self.app.post("/api/explorer/import", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["valid_count"], 2)
        self.assertEqual(data["rejected_count"], 0)

    def test_02_missing_column_rejection(self):
        payload = {
            "plant_id": 1,
            "records": [
                {
                    "MODE": "DEMO",
                    "DATETIME": "2026-08-27T10:00:00",
                    "INVERTER": "INV_01",
                    "ACTUAL AC POWER (KW)": "150.5"
                    # Missing GHI, MODULE TEMP, etc.
                }
            ]
        }
        res = self.app.post("/api/explorer/import", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertIn("Missing required columns", data["error"])
        self.assertIn("missing_columns", data)

    def test_03_invalid_numeric_handling(self):
        payload = {
            "plant_id": 1,
            "records": [
                {
                    "MODE": "DEMO",
                    "DATETIME": "2026-08-27T10:30:00",
                    "INVERTER": "INV_03",
                    "ACTUAL AC POWER (KW)": "INVALID_NUMBER",
                    "EXPECTED AC POWER (KW)": "150.0",
                    "DC POWER (KW)": "155.0",
                    "GHI (W/M²)": "825.0",
                    "MODULE TEMP (°C)": "45.0",
                    "AMBIENT TEMP (°C)": "30.2",
                    "STATUS": "NORMAL"
                }
            ]
        }
        res = self.app.post("/api/explorer/import", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertIn("No valid telemetry rows", data["error"])

    def test_04_get_records_endpoint(self):
        res = self.app.get("/api/records?plant_id=1&limit=10")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["plant_id"], 1)
        self.assertIn("records", data)

    def test_05_plant_isolation(self):
        payload = {
            "plant_id": 2,
            "records": [
                {
                    "MODE": "DEMO",
                    "DATETIME": "2026-08-27T11:00:00",
                    "INVERTER": "INV_MUMBAI_01",
                    "ACTUAL AC POWER (KW)": "500.0",
                    "EXPECTED AC POWER (KW)": "510.0",
                    "DC POWER (KW)": "520.0",
                    "GHI (W/M²)": "900.0",
                    "MODULE TEMP (°C)": "48.0",
                    "AMBIENT TEMP (°C)": "32.0",
                    "STATUS": "NORMAL"
                }
            ]
        }
        res = self.app.post("/api/explorer/import", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)

        res_p2 = self.app.get("/api/records?plant_id=2&limit=5")
        data_p2 = json.loads(res_p2.data)
        self.assertEqual(data_p2["plant_id"], 2)
        inv_ids_p2 = [r["inverter_id"] for r in data_p2["records"]]
        self.assertIn("INV_MUMBAI_01", inv_ids_p2)

        res_p1 = self.app.get("/api/records?plant_id=1&limit=5")
        data_p1 = json.loads(res_p1.data)
        inv_ids_p1 = [r["inverter_id"] for r in data_p1["records"]]
        self.assertNotIn("INV_MUMBAI_01", inv_ids_p1)

    def test_06_ai_copilot_imported_data_awareness(self):
        payload = {"query": "How many records were imported for this plant?", "plant_id": 1}
        res = self.app.post("/api/ai/assistant", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("answer", data)

if __name__ == "__main__":
    unittest.main()
