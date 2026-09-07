-- Better Auth Cloudflare D1 Schema
-- Database: kodand (ca1b0b5e-f964-4a8a-bdf9-ec94bab27c0e)

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  banReason TEXT,
  banExpires TEXT,
  tier TEXT DEFAULT 'free',
  company TEXT,
  phone TEXT,
  scansUsed INTEGER DEFAULT 0,
  maxScans INTEGER DEFAULT 10,
  lastActiveIp TEXT,
  lastActiveCity TEXT,
  lastActiveCountry TEXT,
  lastActiveDevice TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON user(role);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL,
  impersonatedBy TEXT,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_session_user ON session(userId);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_user ON account(userId);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(providerId, accountId);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_id ON verification(identifier);
