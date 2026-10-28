# ChronosMed admin

A small Express and MongoDB admin panel for rooms, medications, alerts and settings.

## Run

1. Install Node.js 18 or newer and a MongoDB server, or create a MongoDB Atlas database.
2. Run `npm ci` in this folder.
3. Copy `.env.example` to `.env`. Set `MONGODB_URI` to your reachable MongoDB connection string. If your old configuration is named `.env.txt`, rename or copy it to `.env`; dotenv does not read `.env.txt` automatically.
4. Run `npm start` and open `http://localhost:3001/admin` (or your configured port).
5. Check `http://localhost:3001/api/health`. HTTP 200 means MongoDB is connected; HTTP 503 means the server is up but MongoDB is unavailable.

The connection string stays in `.env`, which is ignored by Git. Never put database credentials in frontend files.

## Demo data

`npm run seed` populates an empty database with sample records. It refuses to run when any rooms, alerts or settings already exist. `npm run seed -- --reset-demo-data` deletes those collections and replaces them with sample records; use it only on a disposable database.

## API

The admin page uses same-origin `/api` requests. Main endpoints are `/api/rooms`, `/api/alerts`, `/api/settings`, and `/api/health`. Room routes also support medication and environment edits. The UI is in `public/admin.html`, `public/admin.css`, and `public/admin.js`.

This project does not include a MongoDB server. If health reports 503, start your local MongoDB service or use a reachable Atlas URI in `.env`.
