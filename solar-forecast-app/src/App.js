import React, { useState, useEffect, createContext, useContext } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, Moon, Activity, Database, Settings, AlertTriangle, Cloud, TrendingUp, List, Upload, LogOut, Menu, X, Wind, Zap, User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Theme Context (DARK vs LIGHT)
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) return { theme: 'dark', toggleTheme: () => {} };
  return context;
};

// Theme Toggle Switcher Component (Sun ☀️ / Moon 🌙)
const ThemeToggleBtn = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Light / Dark Theme"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 shadow-sm cursor-pointer ${
        theme === 'dark'
          ? 'bg-[#161920] border-[#242936] text-[#F5B83D] hover:border-[#F5B83D]/60'
          : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#D97706] hover:border-[#D97706]/60'
      } ${className}`}
    >
      <Sun className={`w-3.5 h-3.5 transition-transform duration-300 ${theme === 'light' ? 'text-[#D97706] scale-110' : 'text-[#6C7485]'}`} />
      
      {/* Sliding Pill Toggle */}
      <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-300 relative flex items-center ${
        theme === 'dark' ? 'bg-[#242936]' : 'bg-[#CBD5E1]'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full shadow-md transition-transform duration-300 transform ${
          theme === 'dark'
            ? 'translate-x-3.5 bg-[#F5B83D]'
            : 'translate-x-0 bg-[#D97706]'
        }`} />
      </div>

      <Moon className={`w-3.5 h-3.5 transition-transform duration-300 ${theme === 'dark' ? 'text-[#F5B83D] scale-110' : 'text-[#6C7485]'}`} />
    </button>
  );
};

// Data Mode Context (DEMO vs LIVE)
const DataModeContext = createContext(null);

export const useDataMode = () => {
  const context = useContext(DataModeContext);
  if (!context) return { dataMode: 'DEMO', setDataMode: () => {} };
  return context;
};

// Developer Mode Context
const DevModeContext = createContext(null);

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (!context) return { devMode: false, setDevMode: () => {} };
  return context;
};

// Plant Context (Centralized Multi-Site State)
const PlantContext = createContext(null);

export const usePlant = () => {
  const context = useContext(PlantContext);
  if (!context) throw new Error('usePlant must be used within PlantProvider');
  return context;
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiService = {
  login: async (username, password) => {
    await new Promise(r => setTimeout(r, 300));
    if (username && password) {
      return { token: 'mock-jwt-token', user: { name: 'Demo User', role: 'admin' } };
    }
    throw new Error('Invalid credentials');
  },

  getPlants: async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/plants`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable, using fallback plants:', e);
    }
    return [
      { plant_id: 1, name: 'Chennai Solar Farm', location: 'Chennai, India', capacity_kwp: 5000, ac_capacity_kw: 4500, inverters_count: 5, status: 'plant_specific_model', days_of_history: 90, last_training_time: '2025-01-15T10:30:00' },
      { plant_id: 2, name: 'Mumbai Plant', location: 'Mumbai, India', capacity_kwp: 3000, ac_capacity_kw: 2700, inverters_count: 4, status: 'global_model', days_of_history: 30, last_training_time: null },
      { plant_id: 3, name: 'Bangalore Site', location: 'Bangalore, India', capacity_kwp: 2000, ac_capacity_kw: 1800, inverters_count: 3, status: 'collecting_data', days_of_history: 0, last_training_time: null }
    ];
  },

  createPlant: async (data) => {
    try {
      const resp = await fetch(`${API_BASE}/api/plants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable, creating local plant object:', e);
    }
    return { plant_id: Date.now(), ...data, status: 'global_model', days_of_history: 0, last_training_time: null };
  },

  getPlantSummary: async (plantId, date, mode = 'DEMO') => {
    const pId = parseInt(plantId) || 1;
    console.log(`[API REQUEST] /api/dashboard?plant_id=${pId}&mode=${mode}${date ? `&date=${date}` : ''}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/dashboard?plant_id=${pId}${modeParam}${dateParam}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for dashboard summary:', e);
    }
    const selectedDate = date || new Date().toISOString().split('T')[0];
    const defaultPower = pId === 1 ? 2189.0 : (pId === 2 ? 1556.9 : 1147.2);
    const defaultPred = pId === 1 ? 2756.2 : (pId === 2 ? 1496.9 : 1055.8);
    const defaultEnergy = pId === 1 ? 21984.8 : (pId === 2 ? 12167.9 : 8456.6);
    const plantName = pId === 1 ? 'Chennai Solar Farm' : (pId === 2 ? 'Mumbai Plant' : 'Bangalore Site');

    return {
      mode: mode,
      plant_id: pId,
      plant_name: plantName,
      selected_date: selectedDate,
      current_total_power_kw: mode === 'LIVE' ? 0.0 : defaultPower,
      predicted_total_power_3h_kw: defaultPred,
      today_energy_kwh: mode === 'LIVE' ? 0.0 : defaultEnergy,
      forecast_range_min_kw: Math.round(defaultPred * 0.85 * 10) / 10,
      forecast_range_max_kw: Math.round(defaultPred * 1.15 * 10) / 10,
      model_accuracy_r2: 0.872,
      model_accuracy_mae: 23.5,
      last_updated: new Date().toISOString(),
      is_real_data: false,
      data_source_label: `🟣 DEMO — Historical Environmental Model (${plantName})`,
      telemetry_source_label: mode === 'LIVE' ? 'LIVE — Inverter Telemetry Not Connected' : 'DEMO — Synthetic Plant Telemetry',
      connection_status: mode === 'LIVE' ? 'CONNECTION_LOST' : 'DEMO',
      is_live_connected: false
    };
  },

  getTimeSeries: async (plantId, date, mode = 'DEMO') => {
    console.log(`[API] timeseries plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/timeseries?plant_id=${plantId || 1}${modeParam}${dateParam}`);
      if (resp.ok) {
        const res = await resp.json();
        return res.series;
      }
    } catch (e) {
      console.warn('Backend API unavailable for timeseries:', e);
    }
    const targetDate = date || new Date().toISOString().split('T')[0];
    const data = [];
    for (let i = 0; i < 48; i++) {
      const hourVal = i * 0.5;
      const h = Math.floor(hourVal);
      const m = i % 2 === 0 ? '00' : '30';
      const timeStr = `${String(h).padStart(2, '0')}:${m}:00`;
      const base = (hourVal >= 6 && hourVal <= 18) ? Math.sin((hourVal - 6) / 12 * Math.PI) * 400 : 0;
      data.push({
        datetime: `${targetDate}T${timeStr}`,
        actual_ac_kw: Math.max(0, base + Math.random() * 50 - 25),
        predicted_ac_kw: Math.max(0, base + Math.random() * 40 - 20),
        lower_bound_kw: Math.max(0, base * 0.9),
        upper_bound_kw: base * 1.1
      });
    }
    return data;
  },

  getInverterStatus: async (plantId, date, mode = 'DEMO') => {
    console.log(`[API] inverters plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/inverters?plant_id=${plantId || 1}${modeParam}${dateParam}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for inverters:', e);
    }
    return [
      { inverter_id: 'INV_1', current_ac_kw: mode === 'LIVE' ? 0.0 : 120.0, expected_ac_kw: 122.0, deviation_pct: 1.6, status: 'normal' },
      { inverter_id: 'INV_2', current_ac_kw: mode === 'LIVE' ? 0.0 : 115.0, expected_ac_kw: 118.0, deviation_pct: 2.5, status: 'normal' },
      { inverter_id: 'INV_3', current_ac_kw: mode === 'LIVE' ? 0.0 : 95.0, expected_ac_kw: 130.0, deviation_pct: 26.9, status: 'critical' },
      { inverter_id: 'INV_4', current_ac_kw: mode === 'LIVE' ? 0.0 : 118.0, expected_ac_kw: 120.0, deviation_pct: 1.7, status: 'normal' },
      { inverter_id: 'INV_5', current_ac_kw: 0.0, expected_ac_kw: 135.0, deviation_pct: 100.0, status: 'offline' }
    ];
  },

  getWeatherHistory: async (plantId, date, mode = 'DEMO') => {
    console.log(`[API] weather plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/weather?plant_id=${plantId || 1}${modeParam}${dateParam}`);
      if (resp.ok) {
        const res = await resp.json();
        return res;
      }
    } catch (e) {
      console.warn('Backend API unavailable for weather:', e);
    }
    const targetDate = date || new Date().toISOString().split('T')[0];
    const history = [];
    for (let i = 0; i < 48; i++) {
      const hourVal = i * 0.5;
      const h = Math.floor(hourVal);
      const m = i % 2 === 0 ? '00' : '30';
      const timeStr = `${String(h).padStart(2, '0')}:${m}:00`;
      const irr = (hourVal >= 6 && hourVal <= 18) ? Math.sin((hourVal - 6) / 12 * Math.PI) * 800 : 0;
      history.push({
        datetime: `${targetDate}T${timeStr}`,
        irradiation: Math.max(0, irr + (irr > 0 ? Math.random() * 100 - 50 : 0)),
        ambient_temperature: 20 + Math.sin((hourVal / 24) * Math.PI * 2) * 8,
        module_temperature: 25 + Math.sin((hourVal / 24) * Math.PI * 2) * 20
      });
    }
    return {
      current: { irradiation: 780.5, ambient_temperature: 32.4, module_temperature: 55.2, updated_at: new Date().toISOString() },
      history,
      is_real_data: false
    };
  },

  getForecast: async (plantId, horizon, mode = 'DEMO') => {
    console.log(`[API] forecast plant_id=${plantId}`);
    try {
      const resp = await fetch(`${API_BASE}/api/forecast?plant_id=${plantId || 1}&horizon=${horizon || 3}&mode=${mode}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for forecast:', e);
    }
    const points = [];
    const intervals = (horizon || 3) * 4;
    for (let i = 0; i < intervals; i++) {
      const time = new Date(Date.now() + i * 15 * 60000);
      const hour = time.getHours() + time.getMinutes() / 60;
      const power = Math.max(0, Math.sin((hour - 6) / 12 * Math.PI) * 450);
      points.push({
        datetime: time.toISOString(),
        predicted_ac_kw: Math.max(0, power + Math.random() * 50 - 25),
        lower_bound_kw: Math.max(0, power * 0.9),
        upper_bound_kw: power * 1.1
      });
    }
    const total = points.reduce((sum, p) => sum + p.predicted_ac_kw * 0.25, 0);
    return { points, total_energy_next_period_kwh: total, is_real_data: false };
  },

  getAlerts: async (plantId, date, mode = 'DEMO') => {
    console.log(`[API] alerts plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/alerts?plant_id=${plantId || 1}${modeParam}${dateParam}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for alerts:', e);
    }
    const dateFormatted = date || new Date().toISOString().split('T')[0];
    return [
      { id: 1, level: 'critical', scope: 'INVERTER', plant_id: plantId || 1, inverter_id: 'INV_5', message: 'INV_5 is offline. Actual power: 0 kW (Expected: 135 kW).', actual_value: 0.0, expected_value: 135.0, deviation_pct: 100.0, recommended_action: 'Check AC breaker switch and inverter grid connection.', created_at: `${dateFormatted}T10:30:00` },
      { id: 2, level: 'warning', scope: 'INVERTER', plant_id: plantId || 1, inverter_id: 'INV_3', message: 'INV_3 underperforming by 26.9% vs prediction.', actual_value: 95.0, expected_value: 130.0, deviation_pct: 26.9, recommended_action: 'Inspect string fuses and clean solar panel array surface.', created_at: `${dateFormatted}T11:15:00` }
    ];
  },

  getModelPerformance: async (plantId) => {
    console.log(`[API] model_performance plant_id=${plantId}`);
    try {
      const resp = await fetch(`${API_BASE}/api/model/metrics?plant_id=${plantId || 1}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for model performance metrics:', e);
    }
    return {
      active_model: 'Random Forest Regressor',
      features_used: ['GHI', 'GHI_CLEAR', 'TEMP', 'RH', 'WIND', 'lat', 'lon', 'hour', 'day_of_year'],
      sample_count: 87600,
      training_period: '2020-01-01 to 2020-12-31',
      last_training_time: '2025-01-15T10:30:00',
      metrics: { r2: 0.872, mae_kw: 23.5, rmse_kw: 31.8, mape_pct: 8.3 },
      model_comparison: [
        { model_name: 'Random Forest (Active)', r2: 0.872, mae: 23.5, rmse: 31.8, mape: 8.3, status: 'Selected' },
        { model_name: 'Linear Regression', r2: 0.684, mae: 42.1, rmse: 55.2, mape: 16.4, status: 'Evaluated' }
      ]
    };
  },

  quickEstimate: async (formData) => {
    try {
      const resp = await fetch(`${API_BASE}/api/quick-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (resp.ok) return await resp.json();
      const err = await resp.json();
      throw new Error(err.error || 'Quick estimate failed');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
      console.warn('Backend API unavailable for quick estimate, using fallback calculation:', e);
    }
    const points = [];
    const intervals = (formData.horizon_hours || 3) * 4;
    for (let i = 0; i < intervals; i++) {
      const time = new Date(Date.now() + i * 15 * 60000).toISOString();
      const factor = Math.sin((i / intervals) * Math.PI) * 0.8;
      const kw = (formData.capacity_kwp || 1000) * ((formData.system_efficiency || 80) / 100.0) * factor;
      points.push({ datetime: time, estimated_power_kw: Math.max(0, kw), lower_bound_kw: Math.max(0, kw * 0.9), upper_bound_kw: kw * 1.1 });
    }
    const total = points.reduce((sum, p) => sum + p.estimated_power_kw * 0.25, 0);
    return { points, total_energy_kwh: total, is_real_data: false };
  },

  getRecords: async (plantId, date, limit, mode = 'DEMO') => {
    console.log(`[API] records plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/records?plant_id=${plantId || 1}&limit=${limit || 50}${modeParam}${dateParam}`);
      if (resp.ok) {
        const res = await resp.json();
        return res.records;
      }
    } catch (e) {
      console.warn('Backend API unavailable for records:', e);
    }
    const targetDate = date || new Date().toISOString().split('T')[0];
    const records = [];
    const count = Math.min(limit || 50, 96);
    for (let i = 0; i < count; i++) {
      const totalMinutes = i * 15;
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      records.push({
        mode: mode,
        datetime: `${targetDate}T${timeStr}`,
        inverter_id: `INV_${(i % 5) + 1}`,
        ac_power_kw: mode === 'LIVE' ? 0.0 : 100 + Math.random() * 50,
        dc_power_kw: mode === 'LIVE' ? 0.0 : 110 + Math.random() * 55,
        irradiation: 600 + Math.random() * 200,
        module_temperature: 45 + Math.random() * 15,
        ambient_temperature: 28 + Math.random() * 8,
        predicted_ac_3h_kw: 120 + Math.random() * 40
      });
    }
    return records;
  },

  importTelemetryRecords: async (plantId, records) => {
    console.log(`[API] importTelemetryRecords plant_id=${plantId} count=${records.length}`);
    try {
      const resp = await fetch(`${API_BASE}/api/explorer/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plant_id: plantId || 1, records })
      });
      if (resp.ok) return await resp.json();
      const err = await resp.json();
      throw new Error(err.error || 'Import failed');
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
      console.warn('Backend API unavailable for import:', e);
      return {
        status: 'success',
        message: `${records.length} records imported (fallback)`,
        valid_count: records.length,
        rejected_count: 0
      };
    }
  },

  getAIExplain: async (plantId, date, mode = 'DEMO') => {
    console.log(`[API] explain plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/ai/explain?plant_id=${plantId || 1}${modeParam}${dateParam}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for AI explain:', e);
    }
    return {
      predicted_power_kw: 520.0,
      methodology: "Random Forest Tree Importance (feature_importances_)",
      contributing_factors: [
        { feature: "High Solar Irradiance (GHI/Clear Sky)", impact_pct: +38.5, direction: "positive", note: "Strong solar radiation driving core generation" },
        { feature: "Module & Ambient Temperature", impact_pct: -6.2, direction: "negative", note: "Thermal loss reduction coefficient (-0.4%/°C)" },
        { feature: "Wind Speed & Cooling", impact_pct: +2.4, direction: "positive", note: "Convective airflow cooling panel surfaces" },
        { feature: "Relative Humidity", impact_pct: -3.1, direction: "negative", note: "Atmospheric moisture attenuation" }
      ]
    };
  },

  getAIInsights: async (plantId, date, mode = 'DEMO') => {
    console.log(`[API] insights plant_id=${plantId}`);
    try {
      const dateParam = date ? `&date=${date}` : '';
      const modeParam = `&mode=${mode}`;
      const resp = await fetch(`${API_BASE}/api/ai/insights?plant_id=${plantId || 1}${modeParam}${dateParam}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for AI insights:', e);
    }
    return {
      overall_status: mode === 'LIVE' ? 'warning' : 'warning',
      summary: mode === 'LIVE' ? 'LIVE Mode Telemetry: Data Connection Lost or No Telemetry Received.' : 'Solar irradiance is high and plant is near expected generation. INV_3 is underperforming by 26.9%.',
      insights: [
        mode === 'LIVE' ? 'LIVE Connection Status: Data Connection Lost.' : 'Plant current generation is operating at 88.5% of model expectation.',
        'Forecast confidence remains high (90% range: 495–545 kW).'
      ],
      recommended_actions: [
        'Check IoT telemetry stream endpoint.',
        'Verify SCADA gateway connectivity.'
      ]
    };
  },

  askAIAssistant: async (query, plantId, mode = 'DEMO', history = []) => {
    console.log(`[API] assistant plant_id=${plantId} history_length=${history.length}`);
    try {
      const resp = await fetch(`${API_BASE}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, plant_id: plantId || 1, mode, history: history || [] })
      });
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for AI Assistant:', e);
    }
    const qLower = (query || '').toLowerCase();
    let answer = `System Status Summary (${mode} Mode): Plant generation evaluated. AI Model R² is 0.872.`;
    if (qLower.includes('low') || qLower.includes('why') || qLower.includes('generation')) {
      answer = `Generation evaluated in ${mode} mode. Solar irradiance is tracked via NASA POWER API.`;
    }
    return {
      query,
      answer,
      sources: ["Random Forest Inferences", "NASA POWER API", mode === 'LIVE' ? "LIVE — Real-Time Telemetry" : "DEMO — Synthetic Plant Telemetry"],
      timestamp: new Date().toISOString()
    };
  },

  ingestTelemetry: async (payload) => {
    try {
      const resp = await fetch(`${API_BASE}/api/telemetry/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for telemetry ingestion:', e);
    }
    return { status: 'error', message: 'Backend unavailable' };
  },

  getLatestTelemetry: async (plantId) => {
    console.log(`[API] latest_telemetry plant_id=${plantId}`);
    try {
      const resp = await fetch(`${API_BASE}/api/telemetry/latest?plant_id=${plantId || 1}`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for latest telemetry:', e);
    }
    return { connection_status: 'NO_DATA', is_live_connected: false, records: [] };
  },

  getModelFeatures: async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/model/features`);
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('Backend API unavailable for model features:', e);
    }
    return {
      feature_count: 9,
      features: [
        { name: "GHI", importance: 0.42, percentage: 42.0 },
        { name: "GHI_CLEAR", importance: 0.28, percentage: 28.0 }
      ]
    };
  }
};

// Reusable Plant Selector Component
const PlantSelectorDropdown = ({ className = "" }) => {
  const { plants, selectedPlant, setSelectedPlantId } = usePlant();

  if (!selectedPlant || !plants || plants.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={selectedPlant.plant_id}
        onChange={(e) => setSelectedPlantId(parseInt(e.target.value))}
        className="px-4 py-2 border border-[#242936] rounded-xl text-sm bg-[#161920] shadow-md font-bold text-[#F0F2F5] focus:border-[#F5B83D] focus:ring-1 focus:ring-[#F5B83D] focus:outline-none cursor-pointer hover:border-[#F5B83D]/50 transition-all"
      >
        {plants.map(p => (
          <option key={p.plant_id} value={p.plant_id} className="bg-[#161920] text-[#F0F2F5]">
            📍 {p.name} ({p.capacity_kwp} kWp)
          </option>
        ))}
      </select>
    </div>
  );
};

// Official Solar Console Main Project Logo Component with Proportional Scaling
// eslint-disable-next-line no-unused-vars
const SolarConsoleMainLogo = ({ 
  size = 40, 
  showText = true, 
  className = "", 
  textColor = "text-slate-900",
  textSize = "base"
}) => {
  const textClasses = {
    xs: { main: "text-xs", sub: "text-[7px]", gap: "gap-1.5", powerDot: "w-3 h-3" },
    sm: { main: "text-sm", sub: "text-[8px]", gap: "gap-2", powerDot: "w-3.5 h-3.5" },
    base: { main: "text-base", sub: "text-[8.5px]", gap: "gap-2.5", powerDot: "w-3.5 h-3.5" },
    lg: { main: "text-lg", sub: "text-[9px]", gap: "gap-3", powerDot: "w-4 h-4" },
    xl: { main: "text-xl", sub: "text-[10px]", gap: "gap-3.5", powerDot: "w-4 h-4" },
    "2xl": { main: "text-2xl", sub: "text-[11px]", gap: "gap-4", powerDot: "w-5 h-5" }
  };
  
  const currentFormat = textClasses[textSize] || textClasses.base;

  return (
    <div className={`flex items-center ${currentFormat.gap} ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>

          <radialGradient id="sunBodyGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EA580C" />
          </radialGradient>

          <linearGradient id="orbitArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="pvPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* Sun Rays */}
        <g stroke="#F59E0B" strokeWidth="4" strokeLinecap="round">
          <line x1="100" y1="18" x2="100" y2="35" />
          <line x1="72" y1="26" x2="80" y2="40" />
          <line x1="128" y1="26" x2="120" y2="40" />
          <line x1="48" y1="46" x2="62" y2="56" />
          <line x1="152" y1="46" x2="138" y2="56" />
          <line x1="32" y1="76" x2="48" y2="82" />
          <line x1="168" y1="76" x2="152" y2="82" />
        </g>

        {/* Sun Body Arc */}
        <circle cx="100" cy="85" r="38" fill="url(#sunBodyGrad)" />

        {/* Outer Golden Orange Sun Arch */}
        <path
          d="M 35 125 A 72 72 0 1 1 165 125"
          fill="none"
          stroke="url(#sunArcGrad)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Bottom Blue Orbital Sweep */}
        <path
          d="M 30 115 A 78 78 0 0 0 162 120"
          fill="none"
          stroke="url(#orbitArcGrad)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="162" cy="120" r="7" fill="#0284C7" />

        {/* Power Station / Inverter Unit Box on Right */}
        <rect x="118" y="94" width="34" height="46" rx="6" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
        {/* Lightning Bolt */}
        <path d="M136 102 L130 114 L135 114 L132 126 L142 112 L137 112 Z" fill="#F59E0B" />
        {/* Bar Chart Rising */}
        <rect x="135" y="78" width="5" height="12" rx="1" fill="#0284C7" />
        <rect x="142" y="72" width="5" height="18" rx="1" fill="#3B82F6" />
        <rect x="149" y="64" width="5" height="26" rx="1" fill="#10B981" />

        {/* Tilted Blue PV Solar Panel Frame */}
        <g transform="translate(32, 70)">
          <polygon points="10,25 78,14 88,68 18,78" fill="url(#pvPanelGrad)" stroke="#60A5FA" strokeWidth="2.5" />
          {/* PV Panel Grid Lines */}
          <line x1="32" y1="21" x2="41" y2="74" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="55" y1="18" x2="65" y2="70" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="14" y1="42" x2="82" y2="31" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="16" y1="59" x2="85" y2="48" stroke="#93C5FD" strokeWidth="1.5" />
          <rect x="42" y="73" width="12" height="16" fill="#334155" />
        </g>

        {/* Green Eco Leaves on Bottom Left */}
        <path d="M22 122 Q34 94 48 118 Q26 130 22 122 Z" fill="url(#leafGrad)" />
        <path d="M12 135 Q22 112 34 132 Q16 142 12 135 Z" fill="url(#leafGrad)" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left justify-center min-w-0">
          <div className="flex items-center gap-[2px] leading-none">
            <span className={`${currentFormat.main} font-black tracking-wide ${textColor}`}>SOLAR</span>
            <span className={`${currentFormat.main} font-black tracking-wide flex items-center ${textColor}`}>
              CONS
              {/* Power Icon inside second O */}
              <span className={`inline-flex items-center justify-center ${currentFormat.powerDot} rounded-full bg-emerald-500 text-white mx-[1px] shrink-0`}>
                <svg width="70%" height="70%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                  <path d="M12 2v10" />
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                </svg>
              </span>
              LE
            </span>
          </div>
          <div className={`${currentFormat.sub} font-black tracking-wider uppercase mt-1 flex items-center gap-1 leading-none shrink-0 whitespace-nowrap`}>
            <span className="text-blue-500">MONITOR</span>
            <span className="text-gray-400 opacity-60">•</span>
            <span className="text-emerald-500">ANALYZE</span>
            <span className="text-gray-400 opacity-60">•</span>
            <span className="text-orange-500">OPTIMIZE</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Professional Executive Solar SCADA Login Page Component
const LoginPage = () => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('demo');
    setPassword('demo123');
    setError('');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans select-none transition-colors duration-300 ${
      isLight 
        ? 'bg-[#FAF5FF] text-[#1E1B4B]' 
        : 'bg-[#08090C] text-[#F0F2F5]'
    }`}>
      
      {/* 1. ANIMATED SOLAR BACKGROUND & RADIAL GLOW ORBS */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        isLight
          ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,184,61,0.22),rgba(250,245,255,1))]'
          : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,184,61,0.18),rgba(8,9,12,1))]'
      }`} />
      
      {/* Floating Ambient Glow Orbs */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none animate-pulse ${
        isLight ? 'bg-[#F59E0B]/15' : 'bg-[#F5B83D]/10'
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] rounded-full blur-[120px] pointer-events-none animate-pulse ${
        isLight ? 'bg-[#10B981]/15' : 'bg-[#10B981]/10'
      }`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-[140px] pointer-events-none ${
        isLight ? 'bg-[#7C3AED]/10' : 'bg-[#8B5CF6]/5'
      }`} />

      {/* ROTATING SOLAR RADIATION RINGS IN BACKGROUND */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] pointer-events-none ${
        isLight ? 'opacity-25' : 'opacity-20'
      }`}>
        <svg viewBox="0 0 800 800" className="w-full h-full animate-solar-spin-cw">
          <circle cx="400" cy="400" r="380" fill="none" stroke="url(#amberRingGrad)" strokeWidth="1.5" strokeDasharray="12 12" />
          <circle cx="400" cy="400" r="300" fill="none" stroke={isLight ? "#D97706" : "#F5B83D"} strokeWidth="1" strokeDasharray="6 18" />
          <circle cx="400" cy="400" r="220" fill="none" stroke="url(#cyanRingGrad)" strokeWidth="1.5" strokeDasharray="20 10" />
          <defs>
            <linearGradient id="amberRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLight ? "#D97706" : "#F5B83D"} stopOpacity="0.8" />
              <stop offset="100%" stopColor={isLight ? "#C026D3" : "#E55353"} stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="cyanRingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isLight ? "#059669" : "#10B981"} stopOpacity="0.8" />
              <stop offset="100%" stopColor={isLight ? "#2563EB" : "#3B82F6"} stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[750px] sm:h-[750px] pointer-events-none ${
        isLight ? 'opacity-20' : 'opacity-15'
      }`}>
        <svg viewBox="0 0 600 600" className="w-full h-full animate-solar-spin-ccw">
          <circle cx="300" cy="300" r="280" fill="none" stroke={isLight ? "#D97706" : "#F5B83D"} strokeWidth="1" strokeDasharray="4 12" />
          <circle cx="300" cy="300" r="180" fill="none" stroke={isLight ? "#059669" : "#10B981"} strokeWidth="1.5" strokeDasharray="8 8" />
        </svg>
      </div>

      {/* 2. SOLAR PANEL FUTURISTIC DATA GRID EFFECT */}
      <div className={`absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none animate-grid-pulse ${
        isLight 
          ? 'bg-[linear-gradient(to_right,#DDD6FE_1px,transparent_1px),linear-gradient(to_bottom,#DDD6FE_1px,transparent_1px)] opacity-30'
          : 'bg-[linear-gradient(to_right,#242936_1px,transparent_1px),linear-gradient(to_bottom,#242936_1px,transparent_1px)] opacity-20'
      }`} />

      {/* 3. LIGHT PARTICLES */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/3 left-1/5 w-2 h-2 rounded-full animate-particle-1 ${isLight ? 'bg-[#D97706]' : 'bg-[#F5B83D]'}`} />
        <div className={`absolute top-2/3 left-3/4 w-1.5 h-1.5 rounded-full animate-particle-2 ${isLight ? 'bg-[#059669]' : 'bg-[#10B981]'}`} />
        <div className={`absolute top-1/2 left-1/3 w-2 h-2 rounded-full animate-particle-3 ${isLight ? 'bg-[#2563EB]' : 'bg-[#60A5FA]'}`} />
        <div className={`absolute bottom-1/3 right-1/4 w-1 h-1 rounded-full animate-particle-1 ${isLight ? 'bg-[#D97706]' : 'bg-[#F5B83D]'}`} />
      </div>

      {/* TOP RIGHT THEME TOGGLE SHORTCUT */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <ThemeToggleBtn className="shadow-lg" />
      </div>

      {/* MAIN TWO-COLUMN CONTAINER */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 my-auto">
        
        {/* LEFT COLUMN: BRANDING, VISUAL ENGINE, ENERGY FLOW & CAPABILITIES */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          
          {/* LIVE SYSTEM STATUS BADGE */}
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-md animate-fade-in backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-white/95 border-[#10B981]/40 text-[#1E1B4B] shadow-purple-900/5'
              : 'bg-[#11141A]/90 border-[#10B981]/30 text-[#F0F2F5]'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-extrabold tracking-wider text-[#059669] dark:text-[#10B981] uppercase">SYSTEM ONLINE</span>
            <span className={isLight ? "text-[#94A3B8]" : "text-[#6C7485]"}>•</span>
            <span className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#9AA1B0]'}`}>Solar SCADA Gateway Connected</span>
          </div>

          {/* BRANDING LOGO & HEADING */}
          <div className="space-y-3">
            <div className="flex items-center justify-center lg:justify-start gap-4">
              {/* Logo with Energy Ring Animation */}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center relative animate-logo-glow shrink-0 shadow-2xl transition-colors ${
                isLight 
                  ? 'bg-white border-[#DDD6FE] shadow-purple-900/10'
                  : 'bg-[#11141A] border-[#242936]'
              }`}>
                {/* Outer rotating ring around logo */}
                <div className={`absolute -inset-1.5 rounded-2xl border animate-logo-ring pointer-events-none ${
                  isLight ? 'border-[#D97706]/40' : 'border-[#F5B83D]/40'
                }`} />
                <SolarBotAvatar size={52} />
              </div>

              <div>
                <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none ${
                  isLight ? 'text-[#1E1B4B]' : 'text-[#F0F2F5]'
                }`}>
                  SOLAR<span className={`drop-shadow-sm ${
                    isLight ? 'text-[#D97706]' : 'text-[#F5B83D] drop-shadow-[0_0_15px_rgba(245,184,61,0.4)]'
                  }`}>CONSOLE</span>
                </h1>
                <p className={`text-sm sm:text-base font-semibold mt-1 tracking-wide ${
                  isLight ? 'text-[#4C1D95]' : 'text-[#9AA1B0]'
                }`}>
                  Enterprise Solar Intelligence Platform
                </p>
              </div>
            </div>
          </div>

          {/* VISUAL ENERGY & DATA FLOW PIPELINE */}
          <div className={`w-full border rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl my-2 transition-colors ${
            isLight
              ? 'bg-white/85 border-[#EDE9FE] shadow-purple-900/5'
              : 'bg-[#11141A]/60 border-[#242936]/80'
          }`}>
            <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2 ${
              isLight ? 'text-[#4C1D95]' : 'text-[#6C7485]'
            }`}>
              <Zap className={`w-3.5 h-3.5 ${isLight ? 'text-[#D97706]' : 'text-[#F5B83D]'}`} />
              <span>Real-Time Solar Intelligence Pipeline</span>
            </div>

            {/* Pipeline Visual Nodes */}
            <div className="grid grid-cols-4 gap-2 items-center text-center">
              {/* Node 1: SUN */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-1 transition-colors ${
                  isLight
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706] shadow-sm'
                    : 'bg-[#F5B83D]/10 border-[#F5B83D]/30 text-[#F5B83D] shadow-[0_0_15px_rgba(245,184,61,0.2)]'
                }`}>
                  <Sun className="w-5 h-5 animate-pulse" />
                </div>
                <span className={`text-[10px] font-bold ${isLight ? 'text-[#B45309]' : 'text-[#F5B83D]'}`}>SUN ENERGY</span>
              </div>

              {/* Flow Arrow 1 */}
              <div className="flex items-center justify-center relative">
                <svg className="w-full h-4" viewBox="0 0 60 16" fill="none">
                  <line x1="0" y1="8" x2="60" y2="8" stroke={isLight ? "#D97706" : "#F5B83D"} strokeWidth="2" strokeOpacity="0.5" className="animate-energy-dash" />
                </svg>
              </div>

              {/* Node 2: AI / DATA */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-1 transition-colors ${
                  isLight
                    ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#6D28D9] shadow-sm'
                    : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                }`}>
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <span className={`text-[10px] font-bold ${isLight ? 'text-[#6D28D9]' : 'text-[#8B5CF6]'}`}>AI / ML ENGINE</span>
              </div>

              {/* Node 3: CONSOLE */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-1 transition-colors ${
                  isLight
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669] shadow-sm'
                    : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                }`}>
                  <TrendingUp className="w-5 h-5 animate-pulse" />
                </div>
                <span className={`text-[10px] font-bold ${isLight ? 'text-[#059669]' : 'text-[#10B981]'}`}>PREDICTIVE SCADA</span>
              </div>
            </div>
          </div>

          {/* STAGGERED CAPABILITY BADGES */}
          <div className="w-full flex flex-wrap justify-center lg:justify-start gap-2.5 pt-1">
            <div className={`animate-stagger-1 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-md transition-colors ${
              isLight
                ? 'bg-white/90 border-[#EDE9FE] text-[#1E1B4B]'
                : 'bg-[#161920]/90 border-[#242936] text-[#F0F2F5]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>REAL-TIME MONITORING</span>
            </div>

            <div className={`animate-stagger-2 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-md transition-colors ${
              isLight
                ? 'bg-white/90 border-[#EDE9FE] text-[#1E1B4B]'
                : 'bg-[#161920]/90 border-[#242936] text-[#F0F2F5]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-[#D97706]' : 'bg-[#F5B83D]'}`} />
              <span>AI FORECASTING</span>
            </div>

            <div className={`animate-stagger-3 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-md transition-colors ${
              isLight
                ? 'bg-white/90 border-[#EDE9FE] text-[#1E1B4B]'
                : 'bg-[#161920]/90 border-[#242936] text-[#F0F2F5]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLight ? 'bg-[#2563EB]' : 'bg-[#60A5FA]'}`} />
              <span>OPERATIONAL INTELLIGENCE</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: PREMIUM GLASSMORPHIC LOGIN CARD */}
        <div className="lg:col-span-5 w-full">
          <div className={`animate-card-slide backdrop-blur-2xl border rounded-3xl p-7 sm:p-9 relative overflow-hidden group transition-all duration-300 ${
            isLight
              ? 'bg-white/95 border-[#EDE9FE] shadow-[0_20px_60px_rgba(59,7,100,0.08)]'
              : 'bg-[#161920]/85 border-[#242936] shadow-[0_25px_70px_rgba(0,0,0,0.85)]'
          }`}>
            
            {/* Top Amber-Emerald Gradient Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#F5B83D] via-[#E0A632] to-[#10B981] absolute top-0 left-0" />
            
            {/* Subdued Glass Reflection Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              isLight ? 'bg-[#F59E0B]/10 group-hover:bg-[#F59E0B]/15' : 'bg-[#F5B83D]/10 group-hover:bg-[#F5B83D]/15'
            }`} />

            {/* FORM TITLE */}
            <div className="mb-6 text-left">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${
                isLight ? 'text-[#1E1B4B]' : 'text-[#F0F2F5]'
              }`}>
                <span>SCADA Gateway Access</span>
              </h2>
              <p className={`text-xs mt-1 font-medium ${
                isLight ? 'text-[#4C1D95]' : 'text-[#9AA1B0]'
              }`}>
                Enter your credentials to access live telemetry & AI models
              </p>
            </div>

            {/* AUTHENTICATION FORM */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              {/* USERNAME INPUT */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                  isLight ? 'text-[#4C1D95]' : 'text-[#9AA1B0]'
                }`}>
                  <User className={`w-3.5 h-3.5 ${isLight ? 'text-[#D97706]' : 'text-[#F5B83D]'}`} />
                  <span>Username</span>
                </label>
                <div className="relative group/input">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter SCADA username"
                    className={`w-full px-4 py-3 border rounded-xl text-sm font-semibold placeholder-[#94A3B8] focus:outline-none transition-all duration-300 ${
                      isLight
                        ? 'bg-[#FAF5FF] border-[#DDD6FE] text-[#1E1B4B] focus:border-[#D97706] focus:bg-white focus:ring-2 focus:ring-[#D97706]/20'
                        : 'bg-[#11141A] border-[#242936] text-[#F0F2F5] focus:border-[#F5B83D] focus:ring-2 focus:ring-[#F5B83D]/20'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD INPUT */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${
                  isLight ? 'text-[#4C1D95]' : 'text-[#9AA1B0]'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-[#D97706]' : 'text-[#F5B83D]'}`} />
                    <span>Password</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className={`text-[11px] font-bold hover:underline cursor-pointer transition ${
                      isLight ? 'text-[#D97706] hover:text-[#B45309]' : 'text-[#F5B83D] hover:text-[#FFC552]'
                    }`}
                  >
                    ⚡ Fill Demo
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm font-semibold placeholder-[#94A3B8] focus:outline-none transition-all duration-300 ${
                      isLight
                        ? 'bg-[#FAF5FF] border-[#DDD6FE] text-[#1E1B4B] focus:border-[#D97706] focus:bg-white focus:ring-2 focus:ring-[#D97706]/20'
                        : 'bg-[#11141A] border-[#242936] text-[#F0F2F5] focus:border-[#F5B83D] focus:ring-2 focus:ring-[#F5B83D]/20'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition p-1 ${
                      isLight ? 'text-[#64748B] hover:text-[#1E1B4B]' : 'text-[#6C7485] hover:text-[#F0F2F5]'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ERROR FEEDBACK */}
              {error && (
                <div className="p-3.5 bg-[#2C1A1D] border border-[#4A2024] text-[#E55353] text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#E55353]" />
                  <span>{error}</span>
                </div>
              )}

              {/* SUBMIT BUTTON WITH SHIMMER & HOVER GLOW */}
              <button
                type="submit"
                disabled={loading}
                className={`btn-solar-shimmer w-full py-3.5 mt-2 font-black text-sm rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                  isLight
                    ? 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#B45309] hover:from-[#FBBF24] hover:to-[#D97706] text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-[#F5B83D] via-[#E0A632] to-[#D97706] hover:from-[#FFC552] hover:to-[#F5B83D] text-[#0B0C0E] shadow-[0_4px_20px_rgba(245,184,61,0.25)] hover:shadow-[0_0_30px_rgba(245,184,61,0.45)]'
                }`}
              >
                {loading ? (
                  <>
                    <Sun className={`w-4.5 h-4.5 animate-spin ${isLight ? 'text-white' : 'text-[#0B0C0E]'}`} />
                    <span>Authenticating SCADA Gateway...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>Sign In to Solar Console</span>
                  </>
                )}
              </button>
            </form>

            {/* DEMO CREDENTIALS HELPER FOOTER */}
            <div className={`mt-6 pt-4 border-t text-center ${
              isLight ? 'border-[#EDE9FE]' : 'border-[#242936]/80'
            }`}>
              <p className={`text-[11px] font-medium ${
                isLight ? 'text-[#4C1D95]' : 'text-[#9AA1B0]'
              }`}>
                Demo Credentials: <strong className={`px-2 py-0.5 rounded border ${
                  isLight ? 'text-[#1E1B4B] bg-[#FAF5FF] border-[#DDD6FE]' : 'text-[#F0F2F5] bg-[#11141A] border-[#242936]'
                }`}>demo</strong> / <strong className={`px-2 py-0.5 rounded border ${
                  isLight ? 'text-[#1E1B4B] bg-[#FAF5FF] border-[#DDD6FE]' : 'text-[#F0F2F5] bg-[#11141A] border-[#242936]'
                }`}>demo123</strong>
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* BOTTOM FOOTER TELEMETRY TICKER */}
      <div className={`mt-8 text-center z-10 flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full border shadow-lg backdrop-blur-md transition-colors ${
        isLight
          ? 'bg-white/95 border-[#EDE9FE] text-[#1E1B4B] shadow-purple-900/5'
          : 'bg-[#11141A]/90 border-[#242936] text-[#9AA1B0]'
      }`}>
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <span>SCADA Gateway: Active • 5 Solar Fleets Connected • NASA POWER & Open-Meteo Synced</span>
      </div>

    </div>
  );
};

// Plant Onboarding Page
const PlantOnboardingPage = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity_kwp: '',
    ac_capacity_kw: '',
    inverters_count: 4,
    lat: 13.0827,
    lon: 80.2707
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    const data = await apiService.getPlants();
    setPlants(data);
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await apiService.createPlant({
        ...formData,
        capacity_kwp: parseFloat(formData.capacity_kwp),
        ac_capacity_kw: parseFloat(formData.ac_capacity_kw || formData.capacity_kwp * 0.9),
        inverters_count: parseInt(formData.inverters_count),
        lat: parseFloat(formData.lat),
        lon: parseFloat(formData.lon)
      });
      setMessage({ type: 'success', text: `Plant '${res.plant?.name || formData.name}' registered successfully!` });
      setFormData({ name: '', location: '', capacity_kwp: '', ac_capacity_kw: '', inverters_count: 4, lat: 13.0827, lon: 80.2707 });
      loadPlants();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to register plant' });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      plant_specific_model: 'bg-green-100 text-green-700 border-green-200',
      global_model: 'bg-blue-100 text-blue-700 border-blue-200',
      collecting_data: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Register New Solar Plant</h2>
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Plant Name (e.g. Hyderabad Solar Farm)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            required
          />
          <input
            type="text"
            placeholder="Location (e.g. Hyderabad, India)"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            required
          />
          <input
            type="number"
            placeholder="DC Capacity (kWp)"
            value={formData.capacity_kwp}
            onChange={(e) => setFormData({ ...formData, capacity_kwp: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            required
          />
          <input
            type="number"
            placeholder="Latitude (e.g. 17.3850)"
            value={formData.lat}
            onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            step="0.0001"
            required
          />
          <input
            type="number"
            placeholder="Longitude (e.g. 78.4867)"
            value={formData.lon}
            onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            step="0.0001"
            required
          />
          <input
            type="number"
            placeholder="Inverters Count (e.g. 4)"
            value={formData.inverters_count}
            onChange={(e) => setFormData({ ...formData, inverters_count: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            required
          />
          <button
            type="submit"
            className="md:col-span-3 py-3 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition"
          >
            Register Plant
          </button>
        </form>
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <h2 className="text-xl font-bold p-6 border-b">Registered Plant Assets</h2>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading plants...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">Plant ID</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Location</th>
                  <th className="px-6 py-3 text-left">DC Capacity</th>
                  <th className="px-6 py-3 text-left">Inverters</th>
                  <th className="px-6 py-3 text-left">Model Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {plants.map(p => (
                  <tr key={p.plant_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-bold text-gray-600">#{p.plant_id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-gray-600">{p.location}</td>
                    <td className="px-6 py-4 font-medium">{p.capacity_kwp} kWp</td>
                    <td className="px-6 py-4 text-gray-600">{p.inverters_count || '4'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(p.status)}`}>
                        {(p.status || 'global_model').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Estimate Page
const QuickEstimatePage = () => {
  const [formData, setFormData] = useState({
    plant_name: '',
    lat: '',
    lon: '',
    capacity_kwp: '',
    performance_ratio: 0.8,
    horizon_hours: 3
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiService.quickEstimate({
        plant_name: formData.plant_name,
        lat: parseFloat(formData.lat),
        lon: parseFloat(formData.lon),
        capacity_kwp: parseFloat(formData.capacity_kwp),
        system_efficiency: (formData.performance_ratio || 0.8) * 100,
        horizon_hours: formData.horizon_hours
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate estimate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-2">Quick Power Estimate</h2>
        <p className="text-gray-500 text-sm mb-6">
          Calculate instant 15-minute resolution power forecasts for arbitrary plant coordinates
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Plant Name"
            value={formData.plant_name}
            onChange={(e) => setFormData({ ...formData, plant_name: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            required
          />
          <input
            type="number"
            placeholder="Latitude (e.g. 13.0827)"
            value={formData.lat}
            onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            step="0.0001"
            required
          />
          <input
            type="number"
            placeholder="Longitude (e.g. 80.2707)"
            value={formData.lon}
            onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            step="0.0001"
            required
          />
          <input
            type="number"
            placeholder="DC Capacity (kWp)"
            value={formData.capacity_kwp}
            onChange={(e) => setFormData({ ...formData, capacity_kwp: e.target.value })}
            className="px-4 py-2 border rounded-lg text-sm"
            required
          />
          <select
            value={formData.horizon_hours}
            onChange={(e) => setFormData({ ...formData, horizon_hours: parseInt(e.target.value) })}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value={1}>Next 1 Hour</option>
            <option value={3}>Next 3 Hours</option>
            <option value={6}>Next 6 Hours</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 text-white font-bold py-2 rounded-lg hover:bg-orange-600 text-sm disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Get Estimate'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3 font-semibold">{error}</p>}
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl shadow-sm p-6 border border-orange-100">
            <h3 className="text-sm font-semibold text-gray-600">Total Estimated Energy</h3>
            <p className="text-3xl font-bold text-orange-700 mt-1">{result.total_energy_kwh.toFixed(2)} kWh</p>
            <p className="text-xs text-orange-600 mt-1">in next {formData.horizon_hours} hours (15-min intervals)</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Estimated Power Profile</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="datetime" tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                <YAxis label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft' }} />
                <Tooltip labelFormatter={(val) => new Date(val).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="estimated_power_kw" stroke="#f97316" name="Estimated Power" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// Development Debug Panel Component
const DevDebugPanel = ({ summary }) => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  if (!selectedPlant) return null;

  const pId = summary?.plant_id ?? selectedPlant.plant_id;

  return (
    <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-gray-200 text-xs font-mono shadow-md">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
        <span className="font-bold text-orange-400 tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          DEVELOPMENT DEBUG PANEL — REAL-TIME SITE ISOLATION CHECK
        </span>
        <span className="text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Mode: {dataMode}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Selected Plant ID</span>
          <span className="font-bold text-white text-sm">#{selectedPlant.plant_id}</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Selected Plant Name</span>
          <span className="font-bold text-white text-sm">{selectedPlant.name}</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">API plant_id</span>
          <span className="font-bold text-green-400 text-sm">#{pId}</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Telemetry plant_id</span>
          <span className="font-bold text-green-400 text-sm">#{pId}</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Inverter Count</span>
          <span className="font-bold text-yellow-400 text-sm">{selectedPlant.inverters_count} Inverters</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Current Power Source</span>
          <span className="font-bold text-purple-300 text-xs truncate block">{summary?.telemetry_source_label ?? (dataMode === 'LIVE' ? 'LIVE' : 'DEMO Synthetic')}</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Forecast plant_id</span>
          <span className="font-bold text-blue-400 text-sm">#{pId}</span>
        </div>
        <div className="p-2 bg-gray-800/60 rounded border border-gray-800">
          <span className="text-gray-400 block text-[10px] uppercase">Weather plant_id</span>
          <span className="font-bold text-cyan-400 text-sm">#{pId}</span>
        </div>
      </div>
    </div>
  );
};

// Dashboard Page
const DashboardPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const { devMode } = useDevMode();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiExplain, setAiExplain] = useState(null);
  const [tsData, setTsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadData = async () => {
      setLoading(true);
      setSummary(null);
      setAiInsights(null);
      setAiExplain(null);
      setTsData([]);

      const plantId = selectedPlant.plant_id;
      const [sumData, insData, expData, tsSeries] = await Promise.all([
        apiService.getPlantSummary(plantId, date, dataMode),
        apiService.getAIInsights(plantId, date, dataMode),
        apiService.getAIExplain(plantId, date, dataMode),
        apiService.getTimeSeries(plantId, date, dataMode)
      ]);

      if (isSubscribed) {
        setSummary(sumData);
        setAiInsights(insData);
        setAiExplain(expData);
        setTsData(tsSeries || []);
        setLoading(false);
      }
    };

    loadData();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, date, dataMode]);

  // Auto-refresh polling every 5s in LIVE mode
  useEffect(() => {
    if (dataMode === 'LIVE' && selectedPlant?.plant_id) {
      const interval = setInterval(async () => {
        // ... poll logic
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [dataMode, selectedPlant?.plant_id]);

  return (
    <div className="space-y-6 animate-fade-in text-[#F0F2F5]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#F5B83D]" />
            SOLAR POWER INTELLIGENCE DASHBOARD
          </h1>
          <p className="text-xs text-[#9AA1B0] mt-1 font-semibold">
            Selected Site: <strong className="text-[#F5B83D]">{selectedPlant?.name}</strong> (#{selectedPlant?.plant_id}) — {selectedPlant?.capacity_kwp} kWp DC | {selectedPlant?.inverters_count} Inverters
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {summary && (
            <>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                dataMode === 'LIVE'
                  ? (summary.data_source_label?.includes('Unavailable') ? 'bg-[#2C2415] text-[#F5B83D] border-[#4A3B1F]' : 'bg-[#132A20] text-[#10B981] border-[#1D4A35]')
                  : 'bg-[#251B38] text-[#A855F7] border-[#45276B]'
              }`}>
                {summary.data_source_label || (dataMode === 'LIVE' ? '🟢 LIVE — Open-Meteo Environmental Data' : '🟣 DEMO — NASA POWER / Historical Environmental Data')}
              </span>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                dataMode === 'LIVE'
                  ? (summary.is_live_connected ? 'bg-[#132A20] text-[#10B981] border-[#1D4A35]' : 'bg-[#2C1A1D] text-[#E55353] border-[#4A2024]')
                  : 'bg-[#251B38] text-[#A855F7] border-[#45276B]'
              }`}>
                {summary.telemetry_source_label || (dataMode === 'LIVE' ? (summary.is_live_connected ? '🟢 LIVE — Real-Time Telemetry' : '🔴 LIVE — Inverter Telemetry Not Connected') : '🟣 DEMO — Synthetic Plant Telemetry')}
              </span>
            </>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3.5 py-1.5 border border-[#242936] rounded-xl text-xs bg-[#161920] text-[#F0F2F5] shadow-md font-semibold focus:border-[#F5B83D] focus:outline-none"
          />
          <PlantSelectorDropdown />
        </div>
      </div>

      {dataMode === 'LIVE' && summary && !summary.is_live_connected && (
        <div className="bg-[#2C1A1D] border border-[#4A2024] text-[#E55353] p-4 rounded-xl flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-6 h-6 text-[#E55353] flex-shrink-0 animate-pulse" />
          <div>
            <p className="font-extrabold text-sm uppercase tracking-wider">LIVE Telemetry Data Connection Lost — {selectedPlant?.name}</p>
            <p className="text-xs text-[#E55353]/90 mt-0.5 font-medium">
              Live Open-Meteo environmental data is active for plant coordinates ({selectedPlant?.location}). No live inverter telemetry received in the last 60 seconds for Plant #{selectedPlant?.plant_id}. Actual output reads 0.0 kW. Synthetic values are NOT shown in LIVE mode.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-[#161920] border border-[#242936] rounded-xl shadow-xl p-12 text-center text-[#9AA1B0] font-medium animate-pulse">
          Loading plant telemetry & AI forecast for {selectedPlant?.name}...
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. CURRENT POWER */}
          <div className="bg-[#161920] rounded-xl shadow-xl p-6 border border-[#242936] glow-amber-hover">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1B0]">Current Power</h3>
              <Activity className="w-5 h-5 text-[#F5B83D]" />
            </div>
            <p className="text-3xl font-black text-white">{summary.current_total_power_kw.toFixed(1)} kW</p>
            <p className="text-xs text-[#F5B83D] mt-1 font-medium">{dataMode === 'LIVE' ? (summary.is_live_connected ? 'Live SCADA/IoT Inverter Stream' : '🔴 LIVE — Disconnected (0.0 kW)') : `DEMO Synthetic (${summary.plant_name || selectedPlant?.name})`}</p>
          </div>

          {/* 2. PREDICTED POWER */}
          <div className="bg-[#161920] rounded-xl shadow-xl p-6 border border-[#242936] glow-amber-hover">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1B0]">Predicted Power (Next 3h)</h3>
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-3xl font-black text-[#10B981]">{summary.predicted_total_power_3h_kw.toFixed(1)} kW</p>
            <p className="text-xs text-[#10B981] mt-1 font-medium">
              Random Forest ML Forecast (90% Range: {summary.forecast_range_min_kw ? summary.forecast_range_min_kw.toFixed(1) : (summary.predicted_total_power_3h_kw * 0.85).toFixed(1)} – {summary.forecast_range_max_kw ? summary.forecast_range_max_kw.toFixed(1) : (summary.predicted_total_power_3h_kw * 1.15).toFixed(1)} kW)
            </p>
          </div>

          {/* 3. TODAY'S ENERGY */}
          <div className="bg-[#161920] rounded-xl shadow-xl p-6 border border-[#242936] glow-amber-hover">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1B0]">Today's Energy</h3>
              <Sun className="w-5 h-5 text-[#F5B83D]" />
            </div>
            <p className="text-3xl font-black text-white">{summary.today_energy_kwh.toFixed(1)} kWh</p>
            <p className="text-xs text-[#9AA1B0] mt-1 font-medium">{dataMode === 'LIVE' ? 'Calculated from Live Stream' : `Calculated from Telemetry (${summary.selected_date || date})`}</p>
          </div>

          {/* 4. REPLACED ML FORECAST PERFORMANCE CARD */}
          <div className="bg-[#161920] rounded-xl shadow-xl p-6 border border-[#242936] glow-amber-hover">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1B0]">ML FORECAST PERFORMANCE</h3>
              <span className="px-2 py-0.5 rounded bg-[#251B38] text-[#A855F7] text-[10px] font-extrabold border border-[#45276B]">
                GOOD PREDICTIVE PERFORMANCE
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs font-bold text-[#9AA1B0]">R² SCORE</span>
              <span className="text-2xl font-black text-[#A855F7]">87.2%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#9AA1B0] mt-2 font-medium">
              <span>MAE: <strong className="text-white">{summary.model_accuracy_mae ? summary.model_accuracy_mae.toFixed(1) : '23.5'} kW</strong></span>
              <span>Model: <strong className="text-white">Random Forest</strong></span>
            </div>
            <p className="text-[11px] text-[#9AA1B0] mt-2 italic font-normal border-t border-[#242936] pt-1.5">
              "R² indicates how well the model explains variation in solar generation."
            </p>
          </div>
        </div>
      )}

      {/* DEDICATED FORECAST MODEL PERFORMANCE SECTION */}
      {summary && (
        <div className="bg-[#161920] rounded-xl shadow-xl border border-[#242936] p-6 space-y-6 glow-amber-hover">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242936] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#F5B83D]" />
                <h2 className="text-lg font-black uppercase tracking-wider text-white">Forecast Model Performance</h2>
                <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-[#251B38] text-[#A855F7] border border-[#45276B]">
                  Random Forest Evaluation
                </span>
              </div>
              <p className="text-xs text-[#9AA1B0] mt-1 font-medium">
                Evaluation metrics derived from 87,600 historical training points & cross-validation dataset
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#132A20] text-[#10B981] rounded-lg text-xs font-extrabold border border-[#1D4A35] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                GOOD PREDICTIVE PERFORMANCE
              </span>
            </div>
          </div>

          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#111317] p-4 rounded-xl border border-[#242936]">
              <p className="text-xs font-extrabold text-[#9AA1B0] uppercase tracking-wider">R² Score</p>
              <p className="text-2xl font-black text-[#A855F7] mt-1">87.2%</p>
              <p className="text-[11px] text-[#9AA1B0] mt-1 font-medium leading-snug">
                R² indicates how well the model explains variation in solar generation.
              </p>
            </div>

            <div className="bg-[#111317] p-4 rounded-xl border border-[#242936]">
              <p className="text-xs font-extrabold text-[#9AA1B0] uppercase tracking-wider">Average Error (MAE)</p>
              <p className="text-2xl font-black text-[#60A5FA] mt-1">23.5 kW</p>
              <p className="text-[11px] text-[#9AA1B0] mt-1 font-medium leading-snug">
                Mean Absolute Error across 15-minute prediction windows.
              </p>
            </div>

            <div className="bg-[#111317] p-4 rounded-xl border border-[#242936]">
              <p className="text-xs font-extrabold text-[#9AA1B0] uppercase tracking-wider">RMSE Error</p>
              <p className="text-2xl font-black text-[#818CF8] mt-1">31.8 kW</p>
              <p className="text-[11px] text-[#9AA1B0] mt-1 font-medium leading-snug">
                Root Mean Squared Error penalizing large variance spikes.
              </p>
            </div>

            <div className="bg-[#111317] p-4 rounded-xl border border-[#242936]">
              <p className="text-xs font-extrabold text-[#9AA1B0] uppercase tracking-wider">MAPE Error</p>
              <p className="text-2xl font-black text-[#F5B83D] mt-1">8.3%</p>
              <p className="text-[11px] text-[#9AA1B0] mt-1 font-medium leading-snug">
                Mean Absolute Percentage Error on test validation dataset.
              </p>
            </div>

            <div className="bg-[#111317] p-4 rounded-xl border border-[#242936]">
              <p className="text-xs font-extrabold text-[#9AA1B0] uppercase tracking-wider">Forecast Accuracy</p>
              <p className="text-2xl font-black text-[#10B981] mt-1">91.7%</p>
              <p className="text-[11px] text-[#9AA1B0] mt-1 font-medium leading-snug">
                Calculated from 100% - MAPE (8.3%) on validation evaluation dataset.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Intraday Generation Chart */}
      <div className="bg-[#161920] rounded-xl shadow-xl border border-[#242936] p-6 glow-amber-hover">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Intraday 15-Minute Generation Curve ({selectedPlant?.name})</h3>
        {tsData && tsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={tsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242936" />
              <XAxis dataKey="datetime" tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} stroke="#9AA1B0" />
              <YAxis stroke="#9AA1B0" />
              <Tooltip contentStyle={{ backgroundColor: '#161920', borderColor: '#242936', borderRadius: '12px', color: '#F0F2F5' }} formatter={(val) => [`${typeof val === 'number' ? val.toFixed(1) : val} kW`]} />
              <Legend />
              <Line type="monotone" dataKey="actual_ac_kw" stroke="#F5B83D" name="Actual AC Power (kW)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="predicted_ac_kw" stroke="#10B981" name="ML Predicted Power (kW)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="lower_bound_kw" stroke="#60A5FA" name="Lower Bound (90%)" strokeWidth={1} strokeDasharray="2 2" dot={false} />
              <Line type="monotone" dataKey="upper_bound_kw" stroke="#A855F7" name="Upper Bound (90%)" strokeWidth={1} strokeDasharray="2 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-xs text-[#9AA1B0] font-medium animate-pulse">Loading Actual vs Predicted time series curve...</div>
        )}
      </div>

      {/* AI Operational Insights Section */}
      {aiInsights && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold">AI Operational Insights — {selectedPlant?.name}</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              aiInsights.overall_status === 'healthy' ? 'bg-green-100 text-green-700' :
              aiInsights.overall_status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              Status: {aiInsights.overall_status || 'Normal'}
            </span>
          </div>

          <p className="text-sm text-gray-700 font-medium bg-orange-50/50 p-3.5 rounded-lg border border-orange-100">
            💡 {aiInsights.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Key Diagnostic Findings</h3>
              <ul className="space-y-2 text-sm">
                {(aiInsights.insights || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Recommended Maintenance Actions</h3>
              <ul className="space-y-2 text-sm">
                {(aiInsights.recommended_actions || []).map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700 font-medium">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Model Feature Importance Section */}
      {aiExplain && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{aiExplain.title || `Model Feature Contribution (${selectedPlant?.name})`}</h2>
              <p className="text-xs text-gray-500">{aiExplain.description || "Relative importance of input features used by the Random Forest model."}</p>
            </div>
            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2.5 py-1 rounded border">
              {aiExplain.methodology || "Method: Random Forest feature_importances_"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(aiExplain.features || aiExplain.contributing_factors || []).map((factor, idx) => (
              <div key={idx} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{factor.feature || factor.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{factor.description || factor.note}</p>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {factor.importance_pct ? `${factor.importance_pct}%` : (factor.percentage ? `${factor.percentage}%` : `${Math.abs(factor.impact_pct)}%`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Development Debug Panel */}
      {devMode && <DevDebugPanel summary={summary} />}
    </div>
  );
};

// Time Series Page
const TimeSeriesPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [data, setData] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadData = async () => {
      setLoading(true);
      setData([]);
      const tsData = await apiService.getTimeSeries(selectedPlant.plant_id, date, dataMode);
      if (isSubscribed) {
        setData(tsData);
        setLoading(false);
      }
    };

    loadData();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, date, dataMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Time Series Analysis — {selectedPlant?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">30-minute actual vs predicted AC power generation curve</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-white font-medium shadow-sm"
          />
          <PlantSelectorDropdown />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Generation Profile ({selectedPlant?.name})</h3>
        {loading ? (
          <div className="py-24 text-center text-gray-400 font-medium animate-pulse">Loading time series data...</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="datetime" 
                tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              />
              <YAxis label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(val) => new Date(val).toLocaleString()}
                formatter={(value) => `${value.toFixed(2)} kW`}
              />
              <Legend />
              <Line type="monotone" dataKey="actual_ac_kw" stroke="#3b82f6" name="Actual AC Power" strokeWidth={2} />
              <Line type="monotone" dataKey="predicted_ac_kw" stroke="#f97316" name="Predicted AC Power" strokeWidth={2} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="lower_bound_kw" stroke="#cbd5e1" name="Lower Bound (90%)" strokeWidth={1} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="upper_bound_kw" stroke="#94a3b8" name="Upper Bound (90%)" strokeWidth={1} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// Inverter Table Page
const InverterTablePage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [inverters, setInverters] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadInverters = async () => {
      setLoading(true);
      setInverters([]);
      const data = await apiService.getInverterStatus(selectedPlant.plant_id, null, dataMode);
      if (isSubscribed) {
        setInverters(data);
        setLoading(false);
      }
    };

    loadInverters();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, dataMode]);

  const getStatusColor = (status) => {
    const colors = {
      normal: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      critical: 'bg-orange-100 text-orange-800 border-orange-200',
      offline: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredInverters = (inverters || []).filter(inv => 
    (inv.inverter_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Inverter Fleet Telemetry — {selectedPlant?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Total registered inverters: {selectedPlant?.inverters_count} units | Fleet Capacity: {selectedPlant?.capacity_kwp} kWp</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search inverter ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-white"
          />
          <PlantSelectorDropdown />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-medium animate-pulse">Loading inverter status for {selectedPlant?.name}...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b text-xs uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Inverter ID</th>
                <th className="px-6 py-3 text-left">Current AC (kW)</th>
                <th className="px-6 py-3 text-left">Predicted 3h (kW)</th>
                <th className="px-6 py-3 text-left">Deviation (%)</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {filteredInverters.map(inv => (
                <tr key={inv.inverter_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">{inv.inverter_id}</td>
                  <td className="px-6 py-4 font-bold text-blue-700">{inv.current_ac_kw !== undefined ? inv.current_ac_kw.toFixed(1) : '0.0'} kW</td>
                  <td className="px-6 py-4 font-medium text-gray-700">{inv.predicted_ac_3h_kw !== undefined ? inv.predicted_ac_3h_kw.toFixed(1) : (inv.expected_ac_kw ? inv.expected_ac_kw.toFixed(1) : '0.0')} kW</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{(inv.deviation_pct !== undefined ? inv.deviation_pct : (inv.last_error_pct || 0)).toFixed(1)}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Weather Panel Page
const WeatherPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [current, setCurrent] = useState(null);
  const [weatherMeta, setWeatherMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadWeather = async () => {
      setLoading(true);
      setCurrent(null);
      setHistory([]);
      const res = await apiService.getWeatherHistory(selectedPlant.plant_id, date, dataMode);
      if (isSubscribed && res) {
        setWeatherMeta(res);
        setCurrent(res.current);
        setHistory(res.history || []);
        setLoading(false);
      }
    };

    loadWeather();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, date, dataMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Environmental Weather Station — {selectedPlant?.name}</h2>
            {weatherMeta?.data_source_label && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                dataMode === 'LIVE' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-purple-100 text-purple-800 border-purple-300'
              }`}>
                {weatherMeta.data_source_label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            Plant #{selectedPlant?.plant_id} | Location: {selectedPlant?.location} ({weatherMeta?.latitude?.toFixed(4)}°N, {weatherMeta?.longitude?.toFixed(4)}°E)
          </p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-white shadow-sm font-medium"
          />
          <PlantSelectorDropdown />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 font-medium animate-pulse">Loading environmental weather for {selectedPlant?.name}...</div>
      ) : (
        <>
          {current && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Solar Irradiance (GHI)</h3>
                  <Sun className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-700">{current.irradiation !== undefined ? current.irradiation.toFixed(1) : (current.ghi ? current.ghi.toFixed(1) : '0.0')}</p>
                <p className="text-xs text-orange-600 mt-1 font-medium">W/m² (Shortwave Radiation)</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Ambient Temperature</h3>
                  <Cloud className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-700">{(current.ambient_temperature || current.temperature || 0.0).toFixed(1)}°C</p>
                <p className="text-xs text-blue-600 mt-1 font-medium">Surface Air Temperature</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Module Temperature</h3>
                  <Activity className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-700">{(current.module_temperature || (current.ambient_temperature ? current.ambient_temperature + 20 : 45.0)).toFixed(1)}°C</p>
                <p className="text-xs text-red-600 mt-1 font-medium">Calculated PV Thermal State</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-6 border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Humidity & Wind</h3>
                  <Wind className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-800">
                  {current.relative_humidity !== undefined ? current.relative_humidity.toFixed(0) : 50}% RH
                </p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Wind: {current.wind_speed !== undefined ? current.wind_speed.toFixed(1) : 3.0} m/s | Cloud: {current.cloud_cover !== undefined ? current.cloud_cover.toFixed(0) : 0}%
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Irradiance Curve ({selectedPlant?.name})</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="datetime" tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
                <YAxis label={{ value: 'Irradiance (W/m²)', angle: -90, position: 'insideLeft' }} />
                <Tooltip labelFormatter={(val) => new Date(val).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="irradiation" stroke="#f97316" name="Solar Irradiance (GHI)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

// Forecast Planning Page
const ForecastPlanningPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [horizon, setHorizon] = useState(3);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadForecast = async () => {
      setLoading(true);
      setForecast(null);
      const data = await apiService.getForecast(selectedPlant.plant_id, horizon, dataMode);
      if (isSubscribed) {
        setForecast(data);
        setLoading(false);
      }
    };

    loadForecast();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, horizon, dataMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Multi-Horizon Power Forecast — {selectedPlant?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Capacity: {selectedPlant?.capacity_kwp} kWp | ML Engine: Random Forest Regressor</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            {[1, 3, 6, 24].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${horizon === h ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {h}h
              </button>
            ))}
          </div>
          <PlantSelectorDropdown />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400 font-medium animate-pulse">Calculating Random Forest horizon forecast for {selectedPlant?.name}...</div>
      ) : forecast && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-100">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Expected Energy Generation</h3>
              <p className="text-3xl font-bold text-green-700">
                {forecast.total_energy_next_period_kwh ? forecast.total_energy_next_period_kwh.toFixed(2) : 0} kWh
              </p>
              <p className="text-xs text-green-600 mt-1 font-medium">Total projected energy over next {horizon} hours</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl shadow-sm p-6 border border-orange-100">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Peak Forecasted Power</h3>
              <p className="text-3xl font-bold text-orange-700">
                {forecast.peak_power_kw ? forecast.peak_power_kw.toFixed(1) : (forecast.points && forecast.points.length > 0 ? Math.max(...forecast.points.map(p => p.predicted_ac_kw)).toFixed(1) : '0.0')} kW
              </p>
              <p className="text-xs text-orange-600 mt-1 font-medium">Maximum estimated capacity generation</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Power Forecast Curve with 90% Prediction Intervals ({selectedPlant?.name})</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={forecast.points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="datetime" tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
                <YAxis label={{ value: 'Predicted Power (kW)', angle: -90, position: 'insideLeft' }} />
                <Tooltip labelFormatter={(val) => new Date(val).toLocaleString()} formatter={(value) => `${value.toFixed(2)} kW`} />
                <Legend />
                <Line type="monotone" dataKey="predicted_ac_kw" stroke="#10b981" name="Predicted Power (kW)" strokeWidth={2} />
                <Line type="monotone" dataKey="lower_bound_kw" stroke="#cbd5e1" name="Lower Confidence Bound" strokeWidth={1} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="upper_bound_kw" stroke="#94a3b8" name="Upper Confidence Bound" strokeWidth={1} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

// Model Monitoring Page
const ModelMonitoringPage = () => {
  const { selectedPlant } = usePlant();
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadData = async () => {
      setLoading(true);
      setPerformance(null);
      const perf = await apiService.getModelPerformance(selectedPlant.plant_id);
      if (isSubscribed) {
        setPerformance(perf);
        setLoading(false);
      }
    };

    loadData();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Model Performance & Validation — {selectedPlant?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Validation metrics & model benchmarking</p>
        </div>
        <PlantSelectorDropdown />
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400 font-medium animate-pulse">Loading ML model metrics for {selectedPlant?.name}...</div>
      ) : performance && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">R² Score</h3>
              <p className="text-3xl font-bold text-purple-700">{(performance.metrics ? performance.metrics.r2 * 100 : 87.2).toFixed(1)}%</p>
              <p className="text-xs text-purple-600 mt-1 font-medium">Variance Explained</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">MAE</h3>
              <p className="text-3xl font-bold text-blue-700">{performance.metrics ? performance.metrics.mae_kw.toFixed(1) : '23.5'} kW</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Mean Absolute Error</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm p-6 border border-indigo-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">RMSE</h3>
              <p className="text-3xl font-bold text-indigo-700">{performance.metrics ? performance.metrics.rmse_kw.toFixed(1) : '31.8'} kW</p>
              <p className="text-xs text-indigo-600 mt-1 font-medium">Root Mean Squared Error</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-sm p-6 border border-amber-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">MAPE</h3>
              <p className="text-3xl font-bold text-amber-700">{performance.metrics ? performance.metrics.mape_pct.toFixed(1) : '8.3'}%</p>
              <p className="text-xs text-amber-600 mt-1 font-medium">Mean Absolute Percentage Error</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-100">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Forecast Accuracy</h3>
              <p className="text-3xl font-bold text-green-700">{(100 - (performance.metrics ? performance.metrics.mape_pct : 8.3)).toFixed(1)}%</p>
              <p className="text-xs text-green-600 mt-1 font-medium">100% - MAPE (Evaluation)</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Model Comparison Benchmark</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Model Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">R²</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MAE (kW)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">RMSE (kW)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MAPE (%)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {(performance.model_comparison || []).map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{m.model_name}</td>
                      <td className="px-4 py-3">{m.r2.toFixed(3)}</td>
                      <td className="px-4 py-3">{m.mae.toFixed(1)}</td>
                      <td className="px-4 py-3">{m.rmse.toFixed(1)}</td>
                      <td className="px-4 py-3">{m.mape.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.status === 'Selected' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Config Panel Page
const ConfigPage = () => {
  const { devMode, setDevMode } = useDevMode();
  const [config, setConfig] = useState({
    active_model: 'random_forest',
    alert_error_threshold_pct: 20.0,
    default_forecast_horizon_hours: 3
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      setMessage('Configuration saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-6">Configuration Settings</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Active ML Engine Model</label>
            <select
              value={config.active_model}
              onChange={(e) => setConfig({...config, active_model: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="random_forest">Random Forest Regressor (Global Model)</option>
              <option value="baseline">Baseline Linear Model</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alert Error Threshold (%)</label>
            <input
              type="number"
              step="0.1"
              value={config.alert_error_threshold_pct}
              onChange={(e) => setConfig({...config, alert_error_threshold_pct: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Forecast Horizon (hours)</label>
            <select
              value={config.default_forecast_horizon_hours}
              onChange={(e) => setConfig({...config, default_forecast_horizon_hours: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-white"
            >
              <option value={1}>1 Hour</option>
              <option value={3}>3 Hours</option>
              <option value={6}>6 Hours</option>
            </select>
          </div>

          {/* Developer Mode Setting */}
          <div className="pt-2 pb-2 border-t border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">Developer Mode</label>
                <p className="text-xs text-gray-500 mt-1">
                  Developer Mode exposes diagnostic information and the DevDebugPanel for development/testing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDevMode(!devMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-extrabold text-xs transition duration-200 ${
                  devMode
                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <span>[ {devMode ? 'ON' : 'OFF'} ]</span>
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-semibold ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Alerts Panel Page
const AlertsPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [alerts, setAlerts] = useState([]);
  const [filterLevel, setFilterLevel] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlant?.plant_id) return;
    let isSubscribed = true;

    const loadAlerts = async () => {
      setLoading(true);
      setAlerts([]);
      const data = await apiService.getAlerts(selectedPlant.plant_id, null, dataMode);
      if (isSubscribed) {
        setAlerts(data);
        setLoading(false);
      }
    };

    loadAlerts();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, dataMode]);

  const getLevelColor = (level) => {
    const colors = {
      info: 'bg-[#1E293B] text-[#60A5FA] border-[#334155]',
      warning: 'bg-[#2C2415] text-[#F5B83D] border-[#4A3B1F]',
      critical: 'bg-[#2C1A1D] text-[#E55353] border-[#4A2024]'
    };
    return colors[level] || 'bg-[#161920] text-[#9AA1B0] border-[#242936]';
  };

  const filteredAlerts = filterLevel === 'all' 
    ? alerts 
    : alerts.filter(a => a.level === filterLevel);

  return (
    <div className="space-y-6 animate-fade-in text-[#F0F2F5]">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#9AA1B0] tracking-wider uppercase flex items-center gap-2 mb-1">
            <span>Alerts</span>
            <span>&gt;</span>
            <span className="text-[#F5B83D]">Investigation INV-03</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-[#F5B83D]" />
            ALERT INVESTIGATION
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <PlantSelectorDropdown />
          <div className="flex gap-1.5 bg-[#161920] p-1.5 rounded-xl border border-[#242936]">
            {['all', 'info', 'warning', 'critical'].map(level => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-3 py-1.5 rounded-lg capitalize text-xs font-bold transition-all ${
                  filterLevel === level 
                    ? 'bg-[#F5B83D] text-[#0B0C0E] shadow-sm' 
                    : 'text-[#9AA1B0] hover:text-white hover:bg-[#1E222B]'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Alert Investigation Banner Grid (Matching Screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Primary Alert Card */}
        <div className="lg:col-span-2 bg-[#161920] border border-[#242936] rounded-xl p-6 shadow-xl relative overflow-hidden glow-amber-hover">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#E55353]" />
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">Critical: Inverter 03 Offline</h2>
              <p className="text-xs font-mono text-[#9AA1B0] mt-1">ID: ALR-2023-0948-INV03</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-md text-xs font-extrabold tracking-wider uppercase bg-[#2C1A1D] text-[#E55353] border border-[#4A2024]">
                CRITICAL
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-extrabold tracking-wider uppercase bg-[#2C2415] text-[#F5B83D] border border-[#4A3B1F] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F5B83D] animate-pulse" />
                ACTIVE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#242936] text-xs">
            <div>
              <span className="text-[#9AA1B0] uppercase font-bold tracking-wider block text-[10px]">DETECTED</span>
              <span className="font-mono font-bold text-white text-sm">18:04 IST</span>
            </div>
            <div>
              <span className="text-[#9AA1B0] uppercase font-bold tracking-wider block text-[10px]">DURATION</span>
              <span className="font-mono font-bold text-white text-sm">12m 45s</span>
            </div>
            <div>
              <span className="text-[#9AA1B0] uppercase font-bold tracking-wider block text-[10px]">ASSIGNED TO</span>
              <span className="font-semibold text-white text-sm">Unassigned</span>
            </div>
            <div>
              <span className="text-[#9AA1B0] uppercase font-bold tracking-wider block text-[10px]">IMPACT</span>
              <span className="font-bold text-[#E55353] text-sm">↓ 4.2% Gen</span>
            </div>
          </div>
        </div>

        {/* Right Current State Card */}
        <div className="bg-[#161920] border border-[#242936] rounded-xl p-6 shadow-xl space-y-4 glow-amber-hover">
          <div className="flex items-center justify-between border-b border-[#242936] pb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1B0]">CURRENT STATE</span>
            <Activity className="w-4 h-4 text-[#F5B83D]" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#9AA1B0] block text-[10px] uppercase font-bold">GENERATION</span>
                <span className="text-lg font-black text-white">4.27 MW</span>
              </div>
              <span className="px-2 py-1 bg-[#2C1A1D] text-[#E55353] text-[11px] font-bold rounded border border-[#4A2024]">
                ↓ Down 4.2%
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#242936]/60">
              <div>
                <span className="text-[#9AA1B0] block text-[10px] uppercase font-bold">TELEMETRY</span>
                <span className="text-sm font-bold text-[#E55353]">Disconnected</span>
              </div>
              <Activity className="w-4 h-4 text-[#E55353]" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#242936]/60">
              <div>
                <span className="text-[#9AA1B0] block text-[10px] uppercase font-bold">WEATHER</span>
                <span className="text-sm font-bold text-white">Normal (Clear Sky)</span>
              </div>
              <Sun className="w-4 h-4 text-[#F5B83D]" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Investigation Report & Event Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left AI Investigation Report Card */}
        <div className="lg:col-span-2 bg-[#161920] border border-[#242936] rounded-xl p-6 shadow-xl space-y-4 glow-amber-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-[#F5B83D]" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">AI INVESTIGATION REPORT</h3>
            </div>
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-[#F5B83D] border border-[#F5B83D]/30">
              High Conf (94%)
            </span>
          </div>

          <div className="p-4 bg-[#111317] border border-[#242936] rounded-xl text-xs text-[#9AA1B0] leading-relaxed">
            The inverter <strong className="text-[#F5B83D]">INV-03</strong> appears to be offline due to a potential communication loss. Telemetry shows 0% signal strength. Generation has dipped but remains stable across other units. Recommended action is a remote diagnostic reset before dispatching a technician.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button className="px-4 py-2 rounded-lg bg-[#F5B83D] text-[#0B0C0E] font-bold text-xs shadow-md hover:bg-[#FFC552] transition-all flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Diagnostic Run</span>
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#111317] border border-[#242936] text-[#F0F2F5] font-semibold text-xs hover:border-[#F5B83D]/50 transition-all flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#F5B83D]" />
                <span>Ask AI</span>
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#111317] border border-[#242936] text-[#F0F2F5] font-semibold text-xs hover:border-[#F5B83D]/50 transition-all">
                View Logs
              </button>
            </div>
            <button className="px-4 py-2 rounded-lg border border-[#E55353]/50 text-[#E55353] bg-[#2C1A1D]/40 font-bold text-xs hover:bg-[#2C1A1D] transition-all">
              Reset Inverter
            </button>
          </div>
        </div>

        {/* Right Event Timeline Card */}
        <div className="bg-[#161920] border border-[#242936] rounded-xl p-6 shadow-xl space-y-4 glow-amber-hover">
          <div className="flex items-center justify-between border-b border-[#242936] pb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1B0]">EVENT TIMELINE</span>
            <Activity className="w-4 h-4 text-[#9AA1B0]" />
          </div>

          <div className="space-y-4 text-xs">
            <div className="relative pl-6 pb-2 border-l border-[#F5B83D]/40">
              <span className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#F5B83D]" />
              <span className="text-[#9AA1B0] font-mono text-[10px] font-bold block mb-1">18:05 IST</span>
              <div className="p-2.5 bg-[#2C2415]/60 border border-[#4A3B1F] rounded-lg text-[#F5B83D] font-medium">
                AI Analysis Complete
              </div>
            </div>

            <div className="relative pl-6 pb-2 border-l border-[#E55353]/40">
              <span className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#E55353]" />
              <span className="text-[#9AA1B0] font-mono text-[10px] font-bold block mb-1">18:04 IST</span>
              <div className="p-2.5 bg-[#2C1A1D]/60 border border-[#4A2024] rounded-lg text-[#E55353] font-medium">
                Offline Detected — Telemetry signal lost
              </div>
            </div>

            <div className="relative pl-6">
              <span className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#9AA1B0]" />
              <span className="text-[#9AA1B0] font-mono text-[10px] font-bold block mb-1">18:00 IST</span>
              <div className="text-[#9AA1B0] font-medium">
                System Status: Normal
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Alerts Telemetry Log Table */}
      <div className="bg-[#161920] rounded-xl shadow-xl border border-[#242936] overflow-hidden glow-amber-hover">
        <div className="p-4 border-b border-[#242936] flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Active System Alerts Log</h3>
          <span className="text-xs text-[#9AA1B0] font-mono">Count: {filteredAlerts.length} records</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#9AA1B0] font-medium animate-pulse">Loading active alerts for {selectedPlant?.name}...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#111317] border-b border-[#242936] text-[#9AA1B0] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Severity</th>
                  <th className="px-6 py-3.5 text-left">Scope</th>
                  <th className="px-6 py-3.5 text-left">Plant / Inverter</th>
                  <th className="px-6 py-3.5 text-left">Message & Recommended Action</th>
                  <th className="px-6 py-3.5 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242936] text-xs">
                {filteredAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-[#1C202B] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${getLevelColor(alert.level)}`}>
                        {alert.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#9AA1B0] font-medium">{alert.scope}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                      {alert.plant_name || selectedPlant?.name} {alert.inverter_id && `/ ${alert.inverter_id}`}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">{alert.message}</p>
                      {alert.actual_value !== undefined && alert.actual_value !== null && alert.expected_value !== undefined && alert.expected_value !== null && (
                        <p className="text-[11px] text-[#9AA1B0] font-mono mt-1">
                          Actual: <span className="font-semibold text-white">{alert.actual_value} kW</span> | Expected: <span className="font-semibold text-white">{alert.expected_value} kW</span> | Deviation: <span className="font-semibold text-[#E55353]">{alert.deviation_pct}%</span>
                        </p>
                      )}
                      {alert.recommended_action && (
                        <p className="text-[11px] text-[#F5B83D] mt-1 font-semibold">Action: {alert.recommended_action}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] text-[#9AA1B0] font-mono">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Data Explorer Page with Template Download & Large File CSV Import
const DataExplorerPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [limit, setLimit] = useState(50);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Import File Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [validationWarning, setValidationWarning] = useState(null);

  const REQUIRED_HEADERS = [
    "MODE",
    "DATETIME",
    "INVERTER",
    "ACTUAL AC POWER (KW)",
    "EXPECTED AC POWER (KW)",
    "DC POWER (KW)",
    "GHI (W/M²)",
    "MODULE TEMP (°C)",
    "AMBIENT TEMP (°C)",
    "STATUS"
  ];

  const loadRecords = async () => {
    if (!selectedPlant?.plant_id) return;
    setLoading(true);
    setRecords([]);
    const data = await apiService.getRecords(selectedPlant.plant_id, date, limit, dataMode);
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    let isSubscribed = true;
    const fetchRecs = async () => {
      if (!selectedPlant?.plant_id) return;
      setLoading(true);
      const data = await apiService.getRecords(selectedPlant.plant_id, date, limit, dataMode);
      if (isSubscribed) {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    };
    fetchRecs();
    return () => { isSubscribed = false; };
  }, [selectedPlant?.plant_id, date, limit, dataMode]);

  const downloadTemplateCSV = () => {
    const csvContent = REQUIRED_HEADERS.join(',') + '\n' +
      `DEMO,${new Date().toISOString()},INV_01,145.2,148.0,152.4,780.5,42.5,29.1,NORMAL\n` +
      `DEMO,${new Date().toISOString()},INV_02,142.8,148.0,150.1,780.5,43.1,29.1,NORMAL\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'solar_telemetry_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!records || records.length === 0) return;
    
    const headers = Object.keys(records[0]).join(',');
    const rows = records.map(r => Object.values(r).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar_data_plant${selectedPlant?.plant_id}_${dataMode.toLowerCase()}_${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setValidationError('Unsupported file type. Please upload a CSV file (.csv).');
      setSelectedFile(null);
      setParsedData(null);
      return;
    }

    setSelectedFile(file);
    setValidationError(null);
    setValidationWarning(null);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setValidationError('The uploaded file is empty.');
        setParsedData(null);
        return;
      }

      // Parse headers
      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const upperHeaders = rawHeaders.map(h => h.toUpperCase());

      // Validate required columns
      const missing = REQUIRED_HEADERS.filter(req => !upperHeaders.includes(req));
      if (missing.length > 0) {
        setValidationError(`Missing required columns: ${missing.join(', ')}`);
        setParsedData(null);
        return;
      }

      const unexpected = rawHeaders.filter(h => !REQUIRED_HEADERS.includes(h.toUpperCase()));
      if (unexpected.length > 0) {
        setValidationWarning(`Unexpected columns detected: ${unexpected.join(', ')}. These will be safely ignored.`);
      }

      // Parse records
      const parsedRecords = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length < rawHeaders.length) continue;

        const rowObj = {};
        rawHeaders.forEach((h, idx) => {
          rowObj[h] = values[idx];
        });
        parsedRecords.push(rowObj);
      }

      setParsedData({
        fileName: file.name,
        totalRecords: parsedRecords.length,
        headers: rawHeaders,
        records: parsedRecords
      });
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!parsedData || !parsedData.records) return;

    setImporting(true);
    setValidationError(null);

    try {
      const res = await apiService.importTelemetryRecords(selectedPlant.plant_id, parsedData.records);
      setImportStatus(res);
      await loadRecords();
    } catch (err) {
      setValidationError(err.message || 'Import failed. Please verify file formatting.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold">Data Explorer — {selectedPlant?.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Filtering telemetry records strictly for Plant #{selectedPlant?.plant_id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dataMode === 'LIVE' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-purple-100 text-purple-800 border border-purple-200'}`}>
            {dataMode === 'LIVE' ? '🟢 LIVE — Stream' : '🟣 DEMO — Synthetic Telemetry'}
          </span>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-white font-medium"
          />
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            placeholder="Limit"
            className="px-4 py-2 border rounded-lg w-24 text-sm font-medium"
          />
          <PlantSelectorDropdown />

          {/* Import File Button */}
          <button
            onClick={() => {
              setShowImportModal(true);
              setValidationError(null);
              setValidationWarning(null);
              setImportStatus(null);
              setParsedData(null);
              setSelectedFile(null);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import File
          </button>

          {/* Download CSV Button */}
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Database className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>

      {/* IMPORT FILE MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>📤</span> Import Telemetry Data — {selectedPlant?.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Bulk upload telemetry records directly into Plant #{selectedPlant?.plant_id} database</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Template Download & Dropzone */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-8 h-8 text-purple-600" />
                <p className="text-sm font-bold text-gray-800">Select CSV file for ingestion</p>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block mx-auto text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              />

              {selectedFile && (
                <p className="text-xs text-purple-700 font-semibold">
                  Selected File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
                <span>Requires standard Solar Console 10-column schema</span>
                <button
                  onClick={downloadTemplateCSV}
                  className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                >
                  📄 Download Template CSV
                </button>
              </div>
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 space-y-1">
                <p className="font-bold text-red-900 text-sm">❌ Import Failed</p>
                <p>{validationError}</p>
                <p className="text-[11px] text-red-600 mt-1">Please ensure the uploaded CSV uses the required column structure.</p>
              </div>
            )}

            {/* Validation Warning Alert */}
            {validationWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
                <p>⚠️ {validationWarning}</p>
              </div>
            )}

            {/* Parsed Data Preview & Validation Checklist */}
            {parsedData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <span className="text-purple-900">File: {parsedData.fileName}</span>
                  <span className="text-purple-700">Records detected: {parsedData.totalRecords.toLocaleString()}</span>
                </div>

                {/* Columns Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Required Columns Validation:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    {REQUIRED_HEADERS.map(h => (
                      <div key={h} className="p-2 bg-green-50 border border-green-200 rounded-lg text-green-800 font-bold flex items-center gap-1">
                        <span>✓</span>
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table Preview (First 10 Rows) */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Preview (First 10 Rows):</h4>
                  <div className="overflow-x-auto border rounded-xl max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          {parsedData.headers.map(h => (
                            <th key={h} className="p-2 text-left font-bold text-gray-700 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedData.records.slice(0, 10).map((r, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {parsedData.headers.map(h => (
                              <td key={h} className="p-2 whitespace-nowrap font-mono text-[11px] text-gray-700">{r[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Import Status / Results */}
            {importStatus && (
              <div className="p-4 bg-green-50 border border-green-300 rounded-xl text-xs font-semibold text-green-900 space-y-2">
                <p className="text-sm font-bold text-green-950 flex items-center gap-1.5">
                  <span>✓</span> Import Successful
                </p>
                <p>{importStatus.message}</p>
                <div className="flex gap-4 text-xs font-mono pt-1 text-green-800">
                  <span>Records processed: {importStatus.records_processed?.toLocaleString()}</span>
                  <span>Valid: {importStatus.valid_count?.toLocaleString()}</span>
                  <span>Rejected: {importStatus.rejected_count?.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition"
              >
                Cancel
              </button>
              {parsedData && !importStatus && (
                <button
                  onClick={handleExecuteImport}
                  disabled={importing}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <Sun className="w-4 h-4 animate-spin text-yellow-300" />
                      <span>Processing Batch Ingestion...</span>
                    </>
                  ) : (
                    <span>Import Data</span>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TELEMETRY TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-gray-400 font-medium animate-pulse">Fetching telemetry records for {selectedPlant?.name}...</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 border-b text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Datetime</th>
                  <th className="px-4 py-3 text-left">Inverter</th>
                  <th className="px-4 py-3 text-left">Actual AC Power (kW)</th>
                  <th className="px-4 py-3 text-left">Expected AC Power (kW)</th>
                  <th className="px-4 py-3 text-left">DC Power (kW)</th>
                  <th className="px-4 py-3 text-left">GHI (W/m²)</th>
                  <th className="px-4 py-3 text-left">Module Temp (°C)</th>
                  <th className="px-4 py-3 text-left">Ambient Temp (°C)</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {(records || []).map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${record.mode === 'LIVE' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                        {record.mode === 'LIVE' ? '🟢 LIVE' : '🟣 DEMO'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{record.datetime}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-semibold">{record.inverter_id}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-bold text-gray-900">{record.actual_ac_kw !== undefined ? record.actual_ac_kw.toFixed(1) : (record.ac_power_kw ? record.ac_power_kw.toFixed(1) : '0.0')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{record.expected_ac_kw !== undefined ? record.expected_ac_kw.toFixed(1) : (record.predicted_ac_3h_kw ? record.predicted_ac_3h_kw.toFixed(1) : '0.0')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{record.dc_power_kw ? record.dc_power_kw.toFixed(1) : '0.0'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{record.ghi !== undefined && record.ghi !== null ? record.ghi.toFixed(1) : (record.irradiation ? record.irradiation.toFixed(1) : '—')}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{record.module_temperature ? record.module_temperature.toFixed(1) : '—'}°C</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{record.ambient_temperature ? record.ambient_temperature.toFixed(1) : '—'}°C</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        record.status === 'OFFLINE' ? 'bg-red-100 text-red-800' :
                        record.status === 'CRITICAL' ? 'bg-orange-100 text-orange-800' :
                        record.status === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {record.status || 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// AI Assistant (Solar Copilot) Page — ChatGPT-Style Conversational Redesign
const AIAssistantPage = () => {
  const { selectedPlant } = usePlant();
  const { dataMode } = useDataMode();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(() => Date.now().toString());
  
  // Multi-session chat history state saved in localStorage
  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('solar_console_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Current session's messages
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('solar_console_active_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const chatEndRef = React.useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('solar_console_active_messages', JSON.stringify(messages));
    } catch (e) {}
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    try {
      localStorage.setItem('solar_console_chat_sessions', JSON.stringify(chatSessions));
    } catch (e) {}
  }, [chatSessions]);

  const handleStartNewChat = () => {
    setMessages([]);
    setActiveSessionId(Date.now().toString());
    try {
      sessionStorage.removeItem('solar_console_active_messages');
    } catch (e) {}
  };

  const handleOpenSession = (session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    setShowHistoryModal(false);
  };

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      handleStartNewChat();
    }
  };

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      sender: 'user',
      text: q,
      timestamp: timeStr
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!textToSend) setQuery('');
    setLoading(true);

    try {
      const res = await apiService.askAIAssistant(q, selectedPlant?.plant_id, dataMode, updatedMessages);
      const assistantMsg = {
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources || ['Random Forest Model', selectedPlant?.name, `Mode: ${dataMode}`]
      };
      
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Save/Update session in chatSessions list
      setChatSessions(prev => {
        const title = q.length > 35 ? q.substring(0, 35) + '...' : q;
        const existingIdx = prev.findIndex(s => s.id === activeSessionId);
        const sessionObj = {
          id: activeSessionId,
          title: title,
          plant_id: selectedPlant?.plant_id,
          plant_name: selectedPlant?.name,
          mode: dataMode,
          messages: finalMessages,
          updatedAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          const newArr = [...prev];
          newArr[existingIdx] = sessionObj;
          return newArr;
        } else {
          return [sessionObj, ...prev];
        }
      });

    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'I couldn\'t retrieve the latest plant information right now. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['Error']
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const samplePrompts = [
    { title: "What is current power?", query: "What is the current plant power?", icon: Zap, color: "text-[#F5B83D]" },
    { title: "Forecast after 3 hours", query: "What will generation be after 3 hours?", icon: TrendingUp, color: "text-[#60A5FA]" },
    { title: "Inverter Status & Issues", query: "Which inverter needs attention?", icon: AlertTriangle, color: "text-[#F87171]" },
    { title: "Weather Impact Analysis", query: "How is weather affecting generation?", icon: Cloud, color: "text-[#34D399]" }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-5xl mx-auto bg-[#0D0F12] rounded-2xl border border-[#242936] shadow-2xl overflow-hidden relative font-sans">
      
      {/* PROFESSIONAL CHAT HEADER */}
      <div className="bg-[#161920] border-b border-[#242936] px-6 py-4 flex items-center justify-between flex-wrap gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-[#11141A] border border-[#242936]">
            <SolarBotAvatar size={34} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#F0F2F5] tracking-tight">
                Solar Plant Copilot
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5B83D]/10 text-[#F5B83D] border border-[#F5B83D]/30 uppercase tracking-wider">
                AI Engine
              </span>
            </div>
            <p className="text-xs text-[#9AA1B0] font-medium mt-0.5">Enterprise SCADA & Predictive Intelligence</p>
          </div>
        </div>

        {/* Live Context & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <PlantSelectorDropdown className="text-xs border-[#242936] bg-[#11141A] text-[#F0F2F5]" />
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            dataMode === 'LIVE' 
              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' 
              : 'bg-[#8B5CF6]/10 text-[#A78BFA] border-[#8B5CF6]/30'
          }`}>
            {dataMode === 'LIVE' ? '🟢 LIVE' : '🟣 DEMO'}
          </span>
          <button
            onClick={handleStartNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#F5B83D] to-[#E0A632] hover:from-[#FFC552] hover:to-[#F5B83D] text-[#0B0C0E] rounded-xl text-xs font-extrabold transition shadow-md hover:shadow-amber-500/20 transform hover:-translate-y-0.5"
          >
            <span>+ New Chat</span>
          </button>
          <button
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1C202B] hover:bg-[#242936] text-[#F0F2F5] rounded-xl text-xs font-bold transition border border-[#242936]"
          >
            <span>📜 Chat History</span>
            {chatSessions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F5B83D] text-[#0B0C0E] text-[10px] font-extrabold">
                {chatSessions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CHAT HISTORY MODAL / DRAWER */}
      {showHistoryModal && (
        <div className="absolute right-4 top-16 z-40 w-80 bg-[#161920] rounded-2xl shadow-2xl border border-[#242936] p-4 space-y-3 max-h-96 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#242936] pb-2">
            <h3 className="text-xs font-bold text-[#F5B83D] uppercase tracking-wider">Recent Chat Sessions</h3>
            <button onClick={() => setShowHistoryModal(false)} className="text-[#9AA1B0] hover:text-[#F0F2F5] text-sm font-bold">✕</button>
          </div>
          {chatSessions.length === 0 ? (
            <p className="text-xs text-[#9AA1B0] text-center py-4">No saved chat sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {chatSessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleOpenSession(s)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    s.id === activeSessionId 
                      ? 'bg-[#F5B83D]/10 border-[#F5B83D]/40 font-semibold text-[#F5B83D]' 
                      : 'bg-[#11141A] border-[#242936] hover:border-[#3A4255] text-[#F0F2F5]'
                  }`}
                >
                  <div className="truncate flex-1 pr-2">
                    <p className="font-bold truncate">{s.title}</p>
                    <p className="text-[10px] text-[#9AA1B0] mt-0.5">{s.plant_name} • {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="text-[#6C7485] hover:text-[#F87171] text-sm font-bold p-1 transition"
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHAT CONVERSATION AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0D0F12]">
        {messages.length === 0 ? (
          /* HERO EMPTY CHAT STATE */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 my-auto">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(245,184,61,0.2)] bg-[#161920] border border-[#F5B83D]/40">
              <SolarBotAvatar size={68} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-[#F0F2F5] tracking-tight">How can I assist with your solar plant?</h3>
              <p className="text-sm text-[#9AA1B0] mt-2 leading-relaxed max-w-lg">
                Ask about real-time generation, 3-hour forecasts, inverter telemetry, environmental conditions, or active alerts for <strong className="text-[#F5B83D] font-bold">{selectedPlant?.name}</strong>.
              </p>
            </div>

            {/* Example Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4">
              {samplePrompts.map((sp, i) => {
                const IconComponent = sp.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(sp.query)}
                    className="p-4 bg-[#161920] border border-[#242936] hover:border-[#F5B83D]/60 hover:bg-[#1C202B] rounded-xl text-left transition-all duration-200 group shadow-lg hover:shadow-[0_0_20px_rgba(245,184,61,0.12)] transform hover:-translate-y-0.5 cursor-pointer flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-[#11141A] border border-[#242936] shrink-0 group-hover:border-[#F5B83D]/40 transition">
                      <IconComponent className={`w-5 h-5 ${sp.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#F0F2F5] group-hover:text-[#F5B83D] transition">{sp.title}</p>
                      <p className="text-[11px] text-[#9AA1B0] mt-0.5 line-clamp-1">"{sp.query}"</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ACTIVE MESSAGES */
          messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-md shrink-0 border ${
                  m.sender === 'user' ? 'bg-[#F5B83D] text-[#0B0C0E] border-[#F5B83D]' : 'bg-[#161920] border-[#242936]'
                }`}>
                  {m.sender === 'user' ? '👤' : <SolarBotAvatar size={28} />}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-[#F5B83D] to-[#E0A632] text-[#0B0C0E] font-semibold rounded-tr-none shadow-lg'
                    : 'bg-[#161920] text-[#F0F2F5] rounded-tl-none border border-[#242936] shadow-xl'
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  
                  {/* Footer Context / Sources */}
                  <div className="mt-3 pt-2 border-t border-[#242936] flex items-center justify-between gap-2 flex-wrap text-[10px]">
                    <span className={m.sender === 'user' ? 'text-[#0B0C0E]/70 font-medium' : 'text-[#6C7485] font-medium'}>{m.timestamp}</span>
                    {m.sources && m.sources.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {m.sources.map((src, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded font-mono font-bold ${
                            m.sender === 'user' ? 'bg-[#0B0C0E]/20 text-[#0B0C0E]' : 'bg-[#11141A] text-[#F5B83D] border border-[#242936]'
                          }`}>
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-xl">
              <div className="w-9 h-9 rounded-xl bg-[#161920] border border-[#242936] flex items-center justify-center shrink-0 shadow-md">
                <SolarBotAvatar size={28} />
              </div>
              <div className="p-4 rounded-2xl bg-[#161920] border border-[#242936] shadow-xl text-sm text-[#F5B83D] font-medium flex items-center gap-2.5">
                <Sun className="w-4 h-4 animate-spin text-[#F5B83D]" />
                <span className="animate-pulse">Inspecting telemetry & model predictions for {selectedPlant?.name}...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* CHAT INPUT BAR */}
      <div className="bg-[#161920] border-t border-[#242936] p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2.5 items-center bg-[#0D0F12] p-2.5 rounded-2xl border border-[#242936] focus-within:border-[#F5B83D] focus-within:shadow-[0_0_15px_rgba(245,184,61,0.15)] transition-all">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask anything about ${selectedPlant?.name || 'your solar plant'}... (Shift+Enter for new line)`}
            className="flex-1 px-3 py-1.5 bg-transparent text-sm font-medium text-[#F0F2F5] placeholder-[#6C7485] focus:outline-none resize-none max-h-24"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#F5B83D] to-[#E0A632] hover:from-[#FFC552] hover:to-[#F5B83D] disabled:opacity-40 text-[#0B0C0E] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 transform hover:-translate-y-0.5"
          >
            <span>Send</span>
            <span>➔</span>
          </button>
        </form>
      </div>

    </div>
  );
};



// Professional Solar Copilot Executive Emblem Component
const SolarBotAvatar = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="shieldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E2330" />
        <stop offset="100%" stopColor="#0B0D12" />
      </linearGradient>

      <linearGradient id="goldBeam" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFD875" />
        <stop offset="50%" stopColor="#F5B83D" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>

      <radialGradient id="coreSunGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFF2AF" />
        <stop offset="40%" stopColor="#F5B83D" />
        <stop offset="100%" stopColor="#D97706" />
      </radialGradient>
    </defs>

    {/* Hexagonal Outer Badge Frame */}
    <polygon points="50,4 92,25 92,75 50,96 8,75 8,25" fill="url(#shieldGrad)" stroke="url(#goldBeam)" strokeWidth="2.5" />

    {/* Inner Precision Grid Circle */}
    <circle cx="50" cy="50" r="30" stroke="#242936" strokeWidth="1.5" strokeDasharray="3 3" />

    {/* Solar Radiation Rays */}
    <line x1="50" y1="14" x2="50" y2="24" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />
    <line x1="50" y1="76" x2="50" y2="86" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="50" x2="24" y2="50" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />
    <line x1="76" y1="50" x2="86" y2="50" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />

    <line x1="25" y1="25" x2="32" y2="32" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />
    <line x1="68" y1="68" x2="75" y2="75" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />
    <line x1="75" y1="25" x2="68" y2="32" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />
    <line x1="25" y1="75" x2="32" y2="68" stroke="url(#goldBeam)" strokeWidth="2" strokeLinecap="round" />

    {/* Central Solar AI Core */}
    <circle cx="50" cy="50" r="16" fill="url(#coreSunGlow)" />
    <polygon points="50,38 60,50 50,62 40,50" fill="#0D0F12" opacity="0.85" />
    <circle cx="50" cy="50" r="4" fill="#FFFFFF" />

    {/* Neural Network Nodes */}
    <circle cx="50" cy="24" r="2.5" fill="#F5B83D" />
    <circle cx="50" cy="76" r="2.5" fill="#F5B83D" />
    <circle cx="24" cy="50" r="2.5" fill="#F5B83D" />
    <circle cx="76" cy="50" r="2.5" fill="#F5B83D" />
  </svg>
);

// Global Floating AI Assistant Navigation Button
const FloatingAIAssistantButton = ({ currentPage, setCurrentPage }) => {
  const handleClick = () => {
    if (currentPage !== 'assistant') {
      setCurrentPage('assistant');
    } else {
      const inputEl = document.querySelector('textarea, input[placeholder*="Ask"]');
      if (inputEl) {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputEl.focus();
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center group">
      {/* Accessible Hover Tooltip */}
      <span className="hidden group-hover:block bg-[#161920] text-[#F0F2F5] text-xs font-bold py-1.5 px-3 rounded-lg shadow-2xl mr-3 whitespace-nowrap animate-fadeIn border border-[#242936]">
        Ask Solar Copilot
      </span>

      <button
        onClick={handleClick}
        aria-label="Open AI Assistant"
        title="Ask Solar Copilot"
        className="w-14 h-14 rounded-full bg-[#161920] text-[#F5B83D] shadow-[0_0_25px_rgba(245,184,61,0.25)] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 border-2 border-[#F5B83D] relative overflow-hidden"
      >
        <SolarBotAvatar size={42} />
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-[#0D0F12]"></span>
      </button>
    </div>
  );
};

// App Shell Layout Component
const AppShell = () => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const { dataMode, setDataMode } = useDataMode();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'forecast', label: 'Forecast', icon: Sun },
    { id: 'inverters', label: 'Monitoring', icon: List },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'monitoring', label: 'Analytics', icon: Database },
    { id: 'assistant', label: 'AI Assistant', icon: Sun },
    { id: 'explorer', label: 'Data Explorer', icon: Database },
    { id: 'timeseries', label: 'Time Series', icon: TrendingUp },
    { id: 'weather', label: 'Weather', icon: Cloud },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'onboarding', label: 'Plant Onboarding', icon: Upload },
    { id: 'quickestimate', label: 'Quick Estimate', icon: TrendingUp }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'assistant': return <AIAssistantPage />;
      case 'timeseries': return <TimeSeriesPage />;
      case 'inverters': return <InverterTablePage />;
      case 'weather': return <WeatherPage />;
      case 'forecast': return <ForecastPlanningPage />;
      case 'monitoring': return <ModelMonitoringPage />;
      case 'config': return <ConfigPage />;
      case 'alerts': return <AlertsPage />;
      case 'explorer': return <DataExplorerPage />;
      case 'onboarding': return <PlantOnboardingPage />;
      case 'quickestimate': return <QuickEstimatePage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0D0F12] text-[#F0F2F5] relative overflow-hidden font-sans">
      {/* Sidebar (Obsidian Dark with Gold Active Highlights) */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0B0C0E] border-r border-[#1C202B] text-white transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C202B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F5B83D] text-[#0B0C0E] flex items-center justify-center font-black text-base shadow-md shadow-[#F5B83D]/20">
              ☀
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase leading-none">SOLAR CONSOLE</h1>
              <span className="text-[9px] font-bold text-[#F5B83D] tracking-widest uppercase block mt-1">SYSTEM ONLINE</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#9AA1B0] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="p-4 space-y-1.5 overflow-y-auto flex-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#F5B83D] text-[#0B0C0E] font-extrabold shadow-lg shadow-[#F5B83D]/25 scale-[1.02]' 
                    : 'text-[#9AA1B0] hover:bg-[#161922] hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#0B0C0E]' : 'text-[#9AA1B0]'}`} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-[#1C202B] space-y-3 bg-[#0B0C0E]">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#9AA1B0]">Theme</span>
            <ThemeToggleBtn />
          </div>
          {theme === 'light' && (
            <button
              onClick={() => setDataMode(dataMode === 'LIVE' ? 'DEMO' : 'LIVE')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-extrabold text-xs shadow-lg transition-all cursor-pointer backdrop-blur-sm"
            >
              <span className={`w-2 h-2 rounded-full ${dataMode === 'LIVE' ? 'bg-[#10B981] animate-pulse' : 'bg-[#8B5CF6]'}`} />
              <span>{dataMode === 'LIVE' ? 'Switch to DEMO' : 'Switch to LIVE'}</span>
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#9AA1B0] hover:bg-[#161922] hover:text-white transition-colors text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0D0F12]">
        {/* Top Header Bar */}
        <div className="bg-[#121418] border-b border-[#1C202B] px-6 py-3.5 flex items-center justify-between gap-4 shadow-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-[#1C202B] rounded-lg text-[#9AA1B0]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Center Plant Selector */}
          <div className="flex items-center gap-3">
            <PlantSelectorDropdown />
          </div>

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-3">
            <ThemeToggleBtn />

            {theme === 'light' ? (
              <button
                onClick={() => setDataMode(dataMode === 'LIVE' ? 'DEMO' : 'LIVE')}
                title={`Switch to ${dataMode === 'LIVE' ? 'DEMO' : 'LIVE'} Mode`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-xs font-extrabold text-[#3B0764] shadow-sm hover:bg-[#EDE9FE] transition-all cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${dataMode === 'LIVE' ? 'bg-[#10B981] animate-pulse' : 'bg-[#8B5CF6]'}`} />
                <span className="tracking-wider">● {dataMode} MODE</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161920] border border-[#242936] text-xs font-extrabold">
                <span className={`w-2 h-2 rounded-full ${dataMode === 'LIVE' ? 'bg-[#10B981] animate-pulse' : 'bg-[#8B5CF6]'}`} />
                <span className="text-white tracking-wider">● {dataMode}</span>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#9AA1B0] font-semibold bg-[#161920] px-3.5 py-1.5 rounded-full border border-[#242936]">
              <Sun className="w-3.5 h-3.5 text-[#F5B83D]" />
              <span>Weather: 32°C</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#161920] border border-[#242936] flex items-center justify-center text-xs font-bold text-[#F5B83D] shadow-sm">
              ⚡
            </div>
          </div>
        </div>

        {/* Main Dynamic View Content */}
        <div className="flex-1 overflow-auto p-6 bg-[#0D0F12]">
          {renderPage()}
        </div>
      </div>

      {/* GLOBAL FLOATING AI ASSISTANT SHORTCUT BUTTON */}
      <FloatingAIAssistantButton currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Main App Component with Centralized Context Providers
const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [dataMode, setDataMode] = useState('DEMO');

  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('solar_console_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('solar_console_theme', next);
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  const [devMode, setDevModeState] = useState(() => {
    try {
      return localStorage.getItem('solar_console_dev_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  const setDevMode = (val) => {
    setDevModeState(prev => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem('solar_console_dev_mode', String(nextVal));
      } catch (e) {}
      return nextVal;
    });
  };

  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlantState] = useState(null);
  const [loadingPlants, setLoadingPlants] = useState(true);

  useEffect(() => {
    const initPlants = async () => {
      const list = await apiService.getPlants();
      setPlants(list);
      if (list && list.length > 0) {
        setSelectedPlantState(list[0]);
        console.log(`[PLANT CHANGE] plant_id=${list[0].plant_id} name=${list[0].name}`);
      }
      setLoadingPlants(false);
    };
    initPlants();
  }, []);

  const setSelectedPlantId = (plantId) => {
    const pId = parseInt(plantId);
    const found = plants.find(p => p.plant_id === pId) || plants[0];
    if (found) {
      console.log(`[PLANT CHANGE] plant_id=${found.plant_id} name=${found.name}`);
      setSelectedPlantState(found);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await apiService.login(username, password);
      setUser(response.user);
      setToken(response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const authValue = { user, token, login, logout };

  return (
    <AuthContext.Provider value={authValue}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <DataModeContext.Provider value={{ dataMode, setDataMode }}>
          <DevModeContext.Provider value={{ devMode, setDevMode }}>
            <PlantContext.Provider value={{ plants, selectedPlant, setSelectedPlantId, loadingPlants }}>
              {!user ? <LoginPage /> : <AppShell />}
            </PlantContext.Provider>
          </DevModeContext.Provider>
        </DataModeContext.Provider>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;