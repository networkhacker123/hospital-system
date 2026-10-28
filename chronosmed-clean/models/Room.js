const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dose: { type: String, required: true },
  drugClass: { type: String },
  prescriber: { type: String },
  status: {
    type: String,
    enum: ['Administered', 'Pending', 'Hold', 'Refused', 'Scheduled'],
    default: 'Scheduled'
  },
  scheduledTimes: [{ type: String }], // e.g. ["08:00", "14:00", "20:00"]
  notes: { type: String },
  administeredAt: { type: Date },
  administeredBy: { type: String }
}, { timestamps: true });

const labSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ordered: { type: String },
  tat: { type: String },
  stage: { type: Number, default: 0, min: 0, max: 4 },
  status: { type: String, enum: ['ok', 'progress', 'delayed'], default: 'progress' },
  delay: { type: String }
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  resolved: { type: Boolean, default: false }
});

const roomSchema = new mongoose.Schema({
  roomNumber: { type: Number, required: true },
  floor: { type: Number, required: true, min: 1, max: 10 },
  ward: { type: String, enum: ['emergency', 'icu', 'general', 'orthopedics', 'pediatrics', 'recovery'], required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  mrn: { type: String, required: true, unique: true },
  diagnosis: { type: String, required: true },
  status: { type: String, enum: ['critical', 'amber', 'ok'], default: 'ok' },
  alert: { type: String },
  alertType: { type: String, enum: ['red', 'amber', null] },
  medications: [medicationSchema],
  labs: [labSchema],
  tasks: [taskSchema],
  // Room environment
  hvacTemp: { type: Number, default: 22.0 },
  hvacHumidity: { type: Number, default: 50 },
  lastCleaned: { type: Date },
  evsTech: { type: String },
  oxygenSupply: { type: Boolean, default: true },
  bedAlarm: { type: Boolean, default: true },
  callLight: { type: Boolean, default: false },
  notes: { type: String },
  admittedAt: { type: Date, default: Date.now },
  isOccupied: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
