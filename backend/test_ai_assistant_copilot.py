import unittest
import json
import warnings
warnings.filterwarnings('ignore')

from app import app, get_now_kolkata

class TestSolarPlantCopilot(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.date_str = "2026-08-27"

    def test_01_current_plant_power(self):
        """Query 1: What is the current plant power?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "What is the current plant power?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("plant_name", data)
        self.assertEqual(data["plant_name"], "Chennai Solar Farm")
        self.assertTrue(any(unit in data["answer"].lower() for unit in ["kw", "mw", "power"]))

    def test_02_forecast_after_3_hours(self):
        """Query 2: What will the plant power be after 3 hours?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "What will the plant power be after 3 hours?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(len(data["answer"]) > 10)

    def test_03_forecast_next_6_hours(self):
        """Query 3: What is the forecast for the next 6 hours?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "What is the forecast for the next 6 hours?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(len(data["answer"]) > 10)

    def test_04_inverter_offline(self):
        """Query 4: Which inverter is offline?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "Which inverter is offline?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("inv_5", data["answer"].lower())

    def test_05_inverter_underperforming(self):
        """Query 5: Which inverter is underperforming?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "Which inverter is underperforming?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue("inv" in data["answer"].lower())

    def test_06_critical_alerts(self):
        """Query 6: Are there any critical alerts?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "Are there any critical alerts?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(len(data["answer"]) > 5)

    def test_07_weather_affecting_generation(self):
        """Query 7: How is the weather affecting generation?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "How is the weather affecting generation?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(any(term in data["answer"].lower() for term in ["weather", "irradiance", "ghi", "temp", "cloud", "generation"]))

    def test_08_today_energy_generated(self):
        """Query 8: How much energy has been generated today?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "How much energy has been generated today?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(any(unit in data["answer"].lower() for unit in ["kwh", "mwh", "energy", "today"]))

    def test_09_peak_generation_expected(self):
        """Query 9: When is peak generation expected?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "When is peak generation expected?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("peak", data["answer"].lower())

    def test_10_plant_summary(self):
        """Query 10: Give me a summary of the plant."""
        res = self.app.post('/api/ai/assistant', json={
            "query": "Give me a summary of the plant.",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["plant_name"], "Chennai Solar Farm")

    def test_11_compare_chennai_and_mumbai(self):
        """Query 11: Compare Chennai and Mumbai."""
        res = self.app.post('/api/ai/assistant', json={
            "query": "Compare Chennai and Mumbai.",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        ans_lower = data["answer"].lower()
        self.assertTrue("chennai" in ans_lower or "mumbai" in ans_lower)

    def test_12_what_should_i_check_right_now(self):
        """Query 12: What should I check right now?"""
        res = self.app.post('/api/ai/assistant', json={
            "query": "What should I check right now?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(len(data["answer"]) > 10)

    def test_13_multi_site_isolation(self):
        """Test multi-site isolation: Plant 2 (Mumbai) context should be isolated from Plant 1 (Chennai)."""
        res_mumbai = self.app.post('/api/ai/assistant', json={
            "query": "What is the current plant power?",
            "plant_id": 2,
            "mode": "DEMO"
        })
        data = json.loads(res_mumbai.data)
        self.assertEqual(data["plant_id"], 2)
        self.assertEqual(data["plant_name"], "Mumbai Plant")

    def test_14_live_and_demo_modes(self):
        """Test mode awareness: DEMO vs LIVE flags are accurately passed."""
        res_demo = self.app.post('/api/ai/assistant', json={
            "query": "What is the current power?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        data_demo = json.loads(res_demo.data)
        self.assertTrue(data_demo["is_demo_mode"])

        res_live = self.app.post('/api/ai/assistant', json={
            "query": "What is the current power?",
            "plant_id": 1,
            "mode": "LIVE"
        })
        data_live = json.loads(res_live.data)
        self.assertFalse(data_live["is_demo_mode"])

    def test_15_multi_turn_forecast_followup(self):
        """Multi-turn Turn 1: 'What is current power?' -> Turn 2: 'What about after 3 hours?'"""
        turn1_res = self.app.post('/api/ai/assistant', json={
            "query": "What is the current plant power?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        t1_data = json.loads(turn1_res.data)

        history = [
            {"sender": "user", "text": "What is the current plant power?"},
            {"sender": "assistant", "text": t1_data["answer"]}
        ]

        turn2_res = self.app.post('/api/ai/assistant', json={
            "query": "What about after 3 hours?",
            "plant_id": 1,
            "mode": "DEMO",
            "history": history
        })
        self.assertEqual(turn2_res.status_code, 200)
        t2_data = json.loads(turn2_res.data)
        self.assertIn("chennai", t2_data["plant_name"].lower())
        self.assertTrue(any(term in t2_data["answer"].lower() for term in ["forecast", "range", "kw", "mw"]))

    def test_16_multi_turn_inverter_pronoun(self):
        """Multi-turn Turn 1: 'Which inverter has an issue?' -> Turn 2: 'How much power is it producing?'"""
        turn1_res = self.app.post('/api/ai/assistant', json={
            "query": "Which inverter is underperforming?",
            "plant_id": 1,
            "mode": "DEMO"
        })
        t1_data = json.loads(turn1_res.data)

        history = [
            {"sender": "user", "text": "Which inverter is underperforming?"},
            {"sender": "assistant", "text": t1_data["answer"]}
        ]

        turn2_res = self.app.post('/api/ai/assistant', json={
            "query": "How much power is it producing?",
            "plant_id": 1,
            "mode": "DEMO",
            "history": history
        })
        self.assertEqual(turn2_res.status_code, 200)
        t2_data = json.loads(turn2_res.data)
        self.assertTrue("inv" in t2_data["answer"].lower())

    def test_17_multi_turn_plant_retention(self):
        """Multi-turn Turn 1: 'Tell me about Mumbai' -> Turn 2: 'What is the forecast after 6 hours?'"""
        turn1_res = self.app.post('/api/ai/assistant', json={
            "query": "Tell me about Mumbai.",
            "plant_id": 2,
            "mode": "DEMO"
        })
        t1_data = json.loads(turn1_res.data)

        history = [
            {"sender": "user", "text": "Tell me about Mumbai."},
            {"sender": "assistant", "text": t1_data["answer"]}
        ]

        turn2_res = self.app.post('/api/ai/assistant', json={
            "query": "What is the forecast after 6 hours?",
            "plant_id": 2,
            "mode": "DEMO",
            "history": history
        })
        self.assertEqual(turn2_res.status_code, 200)
        t2_data = json.loads(turn2_res.data)
        self.assertEqual(t2_data["plant_name"], "Mumbai Plant")

    def test_18_multi_turn_comparison_continuation(self):
        """Multi-turn Turn 1: 'Compare Chennai and Mumbai' -> Turn 2: 'Which one is generating more?'"""
        turn1_res = self.app.post('/api/ai/assistant', json={
            "query": "Compare Chennai and Mumbai.",
            "plant_id": 1,
            "mode": "DEMO"
        })
        t1_data = json.loads(turn1_res.data)

        history = [
            {"sender": "user", "text": "Compare Chennai and Mumbai."},
            {"sender": "assistant", "text": t1_data["answer"]}
        ]

        turn2_res = self.app.post('/api/ai/assistant', json={
            "query": "Which one is generating more?",
            "plant_id": 1,
            "mode": "DEMO",
            "history": history
        })
        self.assertEqual(turn2_res.status_code, 200)
        t2_data = json.loads(turn2_res.data)
        self.assertTrue(len(t2_data["answer"]) > 10)

if __name__ == "__main__":
    unittest.main()
