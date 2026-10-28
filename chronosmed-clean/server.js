require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3001;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chronosmed';

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    db: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, error: 'MongoDB is unavailable. Check MONGODB_URI and start MongoDB.' });
  }
  next();
});

app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/settings', require('./routes/settings'));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (_req, res) => res.redirect('/admin'));

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ success: false, error: 'Invalid JSON request body' });
  }
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

async function start() {
  app.listen(port, () => console.log('ChronosMed: http://localhost:' + port + '/admin'));
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB unavailable: ' + err.message);
    console.error('Check .env MONGODB_URI and whether the MongoDB service is running.');
  }
}

if (require.main === module) start();
module.exports = { app, start };

