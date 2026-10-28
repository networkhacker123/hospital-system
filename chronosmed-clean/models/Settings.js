const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global' },
  hospitalName: { type: String, default: 'ChronosMed' },
  doctorName: { type: String, default: 'Dr. Evelyn Reed' },
  ward: { type: String, default: 'ICU / Acute' },
  alertsEnabled: { type: Boolean, default: true },
  autoRefresh: { type: Boolean, default: true },
  refreshIntervalSeconds: { type: Number, default: 12 },
  soundAlerts: { type: Boolean, default: false },
  darkSidebar: { type: Boolean, default: true },
  emergencyEscalation: { type: Boolean, default: true },
  defaultFloor: { type: Number, default: 3 },
  alertSeverityThreshold: { type: String, default: 'amber' },
  showVitals: { type: Boolean, default: true },
  shiftHandoffMode: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);