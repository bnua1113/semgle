// db.js
const Database = require("better-sqlite3");
const db = new Database("semgle.db");

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT,
    nickname TEXT NOT NULL,
    avatar_url TEXT,

    username TEXT UNIQUE,        -- ✅ 사용자가 입력하는 "내 아이디"
    real_name TEXT,              -- ✅ 사용자가 입력하는 "이름"
    status TEXT NOT NULL DEFAULT 'pending',  -- ✅ pending/active

    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ✅ 관리자 보안코드(초대코드/가입코드) 테이블
  CREATE TABLE IF NOT EXISTS signup_codes (
    code TEXT PRIMARY KEY,
    is_used INTEGER NOT NULL DEFAULT 0,
    used_by_user_id INTEGER,
    used_at TEXT,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;