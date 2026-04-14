const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

const initDB = () => {
  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      userType TEXT DEFAULT 'passenger',
      reset_token TEXT,
      reset_expiry INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, userType)
    );
  `);

  // Add userType column safely (ignore if exists)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN userType TEXT DEFAULT 'passenger'`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }

  // Add phone column safely (ignore if exists)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }

  // Add isActive column safely (ignore if exists)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 0`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }

  // Drop old unique constraint on email if exists and recreate with composite (email, userType)
  try {
    db.exec(`DROP INDEX IF EXISTS sqlite_autoindex_users_1`);
  } catch (e) {}
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_email_usertype ON users(email, userType)`);
  } catch (e) {
    // Ignore if index exists
  }

  // Create Rides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passenger_id INTEGER NOT NULL,
      rider_id INTEGER,
      passenger_name TEXT NOT NULL,
      passenger_phone TEXT,
      pickup TEXT NOT NULL,
      dropoff TEXT NOT NULL,
      pickup_lat REAL,
      pickup_lon REAL,
      dropoff_lat REAL,
      dropoff_lon REAL,
      distance REAL,
      fare INTEGER,
      status TEXT DEFAULT 'searching', -- searching, ongoing, cancelled, confirmed
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passenger_id) REFERENCES users(id),
      FOREIGN KEY (rider_id) REFERENCES users(id)
    );
  `);

  // Create Ride Requests table (legacy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ride_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passenger_id INTEGER NOT NULL,
      rider_id INTEGER,
      pickup TEXT NOT NULL,
      dropoff TEXT NOT NULL,
      pickup_lat REAL,
      pickup_lon REAL,
      dropoff_lat REAL,
      dropoff_lon REAL,
      distance REAL,
      fare INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passenger_id) REFERENCES users(id),
      FOREIGN KEY (rider_id) REFERENCES users(id)
    );
  `);

  // Create Completed Rides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS completed_rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rider_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      pickup TEXT NOT NULL,
      dropoff TEXT NOT NULL,
      distance REAL,
      fare INTEGER,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rider_id) REFERENCES users(id),
      FOREIGN KEY (passenger_id) REFERENCES users(id)
    );
  `);

  // Create Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  console.log('✅ SQLite database initialized at', dbPath);
};

module.exports = { db, initDB, getDB: () => db };
