const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

const editableFields = [
  'hospitalName', 'doctorName', 'ward', 'alertsEnabled', 'autoRefresh',
  'refreshIntervalSeconds', 'soundAlerts', 'darkSidebar',
  'emergencyEscalation', 'defaultFloor', 'alertSeverityThreshold',
  'showVitals', 'shiftHandoffMode'
];

router.get('/', async (_req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const updates = Object.fromEntries(
      editableFields.filter(field => Object.hasOwn(req.body, field)).map(field => [field, req.body[field]])
    );
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: updates, $setOnInsert: { key: 'global' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
