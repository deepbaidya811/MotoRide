import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'motoride.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    userType TEXT DEFAULT 'passenger',
    reset_token TEXT,
    reset_expiry INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;