# ChronosMed — Hospital Admin Dashboard

A real-time hospital room management system built with **Node.js**, **Express**, and **MongoDB**. It gives doctors and nurses a live admin dashboard to monitor patients across all floors — tracking room status, medications, lab results, alerts, and room environment from a single screen.

---

## 📌 What This Project Does

- Displays **140 patient rooms** across 7 floors (Emergency, ICU, General)
- Shows real-time **patient status** (Critical 🔴 / Amber 🟡 / OK 🟢)
- Tracks **medications** with dose, prescriber, schedule, and administration status
- Monitors **lab results** with turnaround time and progress stages
- Manages **hospital-wide alerts** (critical vitals, medication holds, admissions, discharges)
- Controls **room environment** — HVAC temp, humidity, oxygen supply, bed alarm
- Supports **per-room task lists** for nursing staff

---

## 🗄️ Database (MongoDB)

This project uses MongoDB to store all hospital data dynamically. Without the database, the dashboard shows only static hardcoded data. With MongoDB connected, every update made in the dashboard (room status change, medication administered, alert acknowledged) is **instantly saved** and visible in MongoDB Compass.

### Collections

| Collection | Documents | Description |
|---|---|---|
| `rooms` | 140 | One document per patient room with full nested data |
| `alerts` | 10+ | Hospital-wide notifications and escalations |
| `settings` | 1 | Global hospital configuration (doctor name, refresh rate, thresholds) |

### What a `rooms` document contains
```json
{
  "roomNumber": 42,
  "floor": 3,
  "ward": "icu",
  "patientName": "Patricia H.",
  "age": 74,
  "mrn": "MRN-4223",
  "diagnosis": "AKI Recovery",
  "status": "critical",
  "alert": "Forgotten Hold: Lisinopril",
  "alertType": "red",
  "medications": [
    { "name": "Vancomycin", "dose": "1g IV", "status": "Administered", ... }
  ],
  "labs": [
    { "name": "CBC", "stage": 3, "status": "delayed", ... }
  ],
  "tasks": [
    { "title": "Review medication reconciliation", "priority": "high", ... }
  ],
  "hvacTemp": 22.4,
  "hvacHumidity": 52,
  "oxygenSupply": true,
  "bedAlarm": true,
  "isOccupied": true
}
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community) installed locally **or** a [MongoDB Atlas](https://www.mongodb.com/atlas) cloud URI
- [MongoDB Compass](https://www.mongodb.com/products/compass) (optional, to visually browse data)

### Setup

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment**
```bash
# Copy the example env file
cp .env.example .env
```
Edit `.env` and set your MongoDB connection string:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/chronosmed
PORT=3001
```

**3. Seed the database** (first time only)
```bash
npm run seed
```
This inserts 140 rooms, 10 alerts, and 1 settings document into MongoDB.

**4. Start the server**
```bash
npm start
```

**5. Open the dashboard**
```
http://localhost:3001/admin
```

**6. Verify MongoDB connection**
```
http://localhost:3001/api/health
```
- `200 OK` → MongoDB is connected ✅
- `503 Service Unavailable` → MongoDB is not running ❌

---

## 🌱 Demo Data

`npm run seed` populates an empty database with realistic hospital sample data. It **refuses to run** if any data already exists (to prevent accidental overwrites).

To wipe and re-seed:
```bash
npm run seed -- --reset-demo-data
```
> ⚠️ Use `--reset-demo-data` only on a disposable/development database. It permanently deletes all existing rooms, alerts, and settings.

---

## 🔌 API Endpoints

All endpoints are prefixed with `/api`. The dashboard calls these from the browser.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | MongoDB connection status |
| `GET` | `/api/rooms` | List all rooms |
| `GET` | `/api/rooms/:id` | Get a single room |
| `POST` | `/api/rooms` | Create a new room |
| `PUT` | `/api/rooms/:id` | Update a room |
| `DELETE` | `/api/rooms/:id` | Delete a room |
| `GET` | `/api/alerts` | List all alerts |
| `PUT` | `/api/alerts/:id` | Acknowledge an alert |
| `GET` | `/api/settings` | Get global settings |
| `PUT` | `/api/settings` | Update settings |

---

## 📁 Project Structure

```
chronosmed-clean/
├── server.js           # Express server + MongoDB connection
├── models/
│   ├── Room.js         # Mongoose schema for patient rooms
│   ├── Alert.js        # Mongoose schema for hospital alerts
│   └── Settings.js     # Mongoose schema for global config
├── routes/
│   ├── rooms.js        # Room CRUD + medication/environment routes
│   ├── alerts.js       # Alert listing + acknowledgement routes
│   └── settings.js     # Settings read/update routes
├── public/
│   ├── admin.html      # Dashboard UI
│   ├── admin.css       # Dashboard styles
│   └── admin.js        # Dashboard logic (API calls, rendering)
├── seed/
│   └── seed.js         # Script to populate MongoDB with demo data
├── .env.example        # Environment variable template
└── package.json
```

---

## 🧭 Viewing Data in MongoDB Compass

1. Open **MongoDB Compass**
2. Connect to: `mongodb://127.0.0.1:27017`
3. Select the **`chronosmed`** database
4. Browse collections: `rooms`, `alerts`, `settings`
5. To find a specific patient, use the Filter bar:
   ```json
   { "patientName": "Yug" }
   ```
   Or by room number:
   ```json
   { "roomNumber": 100 }
   ```
6. Switch to **Table View** (grid icon) for a spreadsheet-style view

> Any changes made in the dashboard are **immediately reflected** in Compass after clicking Refresh 🔄

---

## ⚠️ Notes

- This project does **not** include a MongoDB server. You must have MongoDB running locally or provide an Atlas URI.
- The `.env` file is ignored by Git — never commit database credentials.
- The `node_modules/` folder and `.env` are listed in `.gitignore`.
