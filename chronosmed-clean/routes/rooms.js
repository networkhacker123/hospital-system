const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// GET /api/rooms — get all rooms (with optional floor/ward filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.floor) filter.floor = Number(req.query.floor);
    if (req.query.ward) filter.ward = req.query.ward;
    if (req.query.status) filter.status = req.query.status;
    const rooms = await Room.find(filter).sort({ floor: 1, roomNumber: 1 });
    res.json({ success: true, data: rooms, count: rooms.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/rooms/:id — get a single room by MongoDB ID
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/rooms/num/:roomNumber — get room by room number
router.get('/num/:roomNumber', async (req, res) => {
  try {
    const room = await Room.findOne({ roomNumber: Number(req.params.roomNumber) });
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rooms — create a new room/patient
router.post('/', async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/rooms/:id — update entire room record
router.put('/:id', async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/rooms/:id/status — update just the status + alert
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, alert, alertType } = req.body;
    const room = await Room.findByIdAndUpdate(req.params.id, { status, alert, alertType }, { new: true });
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/rooms/:id — delete a room
router.delete('/:id', async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── MEDICATION sub-routes ────────────────────────────────────

// GET /api/rooms/:id/medications
router.get('/:id/medications', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room.medications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rooms/:id/medications — add a medication
router.post('/:id/medications', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    room.medications.push(req.body);
    await room.save();
    res.status(201).json({ success: true, data: room.medications });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/rooms/:id/medications/:medId — update a specific medication (timing, dose, status, etc.)
router.put('/:id/medications/:medId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    const med = room.medications.id(req.params.medId);
    if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });
    Object.assign(med, req.body);
    await room.save();
    res.json({ success: true, data: med });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH /api/rooms/:id/medications/:medId/administer — mark as administered
router.patch('/:id/medications/:medId/administer', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    const med = room.medications.id(req.params.medId);
    if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });
    med.status = 'Administered';
    med.administeredAt = new Date();
    med.administeredBy = req.body.nurse || 'Unknown';
    await room.save();
    res.json({ success: true, data: med });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/rooms/:id/medications/:medId — remove a medication
router.delete('/:id/medications/:medId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    room.medications.pull(req.params.medId);
    await room.save();
    res.json({ success: true, message: 'Medication removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ENVIRONMENT sub-route ────────────────────────────────────
// PATCH /api/rooms/:id/environment
router.patch('/:id/environment', async (req, res) => {
  try {
    const { hvacTemp, hvacHumidity, lastCleaned, evsTech, oxygenSupply, bedAlarm, callLight } = req.body;
    const room = await Room.findByIdAndUpdate(req.params.id,
      { hvacTemp, hvacHumidity, lastCleaned, evsTech, oxygenSupply, bedAlarm, callLight },
      { new: true }
    );
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
