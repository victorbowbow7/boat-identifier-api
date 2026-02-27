require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS identifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT,
    boat_type TEXT,
    boat_brand TEXT,
    boat_model TEXT,
    confidence REAL,
    vessel_name TEXT,
    mmsi TEXT,
    registration TEXT,
    length TEXT,
    tonnage TEXT,
    owner TEXT,
    location TEXT,
    identified_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identification_id INTEGER,
    is_correct BOOLEAN,
    feedback_text TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (identification_id) REFERENCES identifications(id)
  )`);
});

// Make db available to routes
app.locals.db = db;

// Routes
app.use('/api/identify', require('./routes/identify'));
app.use('/api/search', require('./routes/search'));
app.use('/api/history', require('./routes/history'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/placeholder-boat.jpg', require('./routes/placeholder'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚢 Boat Identifier API running on port ${PORT}`);
});

module.exports = app;