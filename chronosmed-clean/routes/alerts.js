const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// GET /api/alerts — List all alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts — Create new alert
router.post('/', async (req, res) => {
  try {
    const alert = new Alert(req.body);
    await alert.save();
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/alerts/:id/acknowledge — Mark as acknowledged
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const { by } = req.body;
    const alert = await Alert.findByIdAndUpdate(req.params.id, 
      { acknowledged: true, acknowledgedBy: by, acknowledgedAt: new Date() }, 
      { new: true }
    );
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/alerts/:id — Delete one
router.delete('/:id', async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/alerts/clear/all — Clear all alerts
router.delete('/clear/all', async (req, res) => {
  try {
    await Alert.deleteMany({});
    res.json({ success: true, message: 'All alerts cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;