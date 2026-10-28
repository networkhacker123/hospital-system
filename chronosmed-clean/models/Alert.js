const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['critical', 'medication', 'discharge', 'admission', 'shift', 'lab', 'ai'],
    required: true
  },
  icon: { type: String, default: '🔔' },
  color: { type: String, default: '#FF9500' },
  message: { type: String, required: true },
  roomNumber: { type: Number },
  patientName: { type: String },
  severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'info' },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);



