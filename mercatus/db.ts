import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

const db = SQLite.openDatabaseSync('mercatus.db');

// ── ІНІЦІАЛІЗАЦІЯ ─────────────────────────────────────
export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      lang TEXT DEFAULT 'en',
      reputation INTEGER DEFAULT 50,
      trades_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      have TEXT NOT NULL,
      need TEXT NOT NULL,
      urgency TEXT DEFAULT 'medium',
      amount INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trade_participants (
      trade_id TEXT,
      user_id TEXT,
      give TEXT,
      get TEXT,
      confirmed INTEGER DEFAULT 0,
      FOREIGN KEY (trade_id) REFERENCES trades(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

// ── ХЕШ ПАРОЛЯ ───────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

// ── РЕЄСТРАЦІЯ ────────────────────────────────────────
export async function registerUser(
  username: string,
  password: string,
  lang: string = 'en'
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  try {
    const existing = db.getFirstSync(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existing) return { ok: false, error: 'Username already taken' };

    const hash = await hashPassword(password);
    const id = Crypto.randomUUID();

    db.runSync(
      'INSERT INTO users (id, username, password_hash, lang) VALUES (?, ?, ?, ?)',
      [id, username, hash, lang]
    );

    return { ok: true, userId: id };
  } catch (e) {
    return { ok: false, error: 'Registration failed' };
  }
}

// ── ВХІД ─────────────────────────────────────────────
export async function loginUser(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string; user?: User }> {
  try {
    const hash = await hashPassword(password);
    const user = db.getFirstSync<User>(
      'SELECT * FROM users WHERE username = ? AND password_hash = ?',
      [username, hash]
    );
    if (!user) return { ok: false, error: 'Wrong username or password' };
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: 'Login failed' };
  }
}

// ── РЕСУРСИ ───────────────────────────────────────────
export function addResource(
  userId: string,
  have: string,
  need: string,
  urgency: string,
  amount: number = 1
): string {
  const id = Crypto.randomUUID();
  db.runSync(
    'INSERT INTO resources (id, user_id, have, need, urgency, amount) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, have, need, urgency, amount]
  );
  return id;
}

export function getUserResources(userId: string): Resource[] {
  return db.getAllSync<Resource>(
    'SELECT * FROM resources WHERE user_id = ? AND active = 1 ORDER BY created_at DESC',
    [userId]
  );
}

export function getAllActiveResources(): Resource[] {
  return db.getAllSync<Resource>(
    `SELECT r.*, u.username, u.reputation
     FROM resources r
     JOIN users u ON r.user_id = u.id
     WHERE r.active = 1
     ORDER BY r.created_at DESC`
  );
}

export function deactivateResource(resourceId: string) {
  db.runSync('UPDATE resources SET active = 0 WHERE id = ?', [resourceId]);
}

// ── ТИПИ ─────────────────────────────────────────────
export type User = {
  id: string;
  username: string;
  lang: string;
  reputation: number;
  trades_count: number;
  created_at: string;
};

export type Resource = {
  id: string;
  user_id: string;
  username?: string;
  reputation?: number;
  have: string;
  need: string;
  urgency: string;
  amount: number;
  active: number;
  created_at: string;
};