-- KODAND Cloudflare D1 Database Schema
-- Production Schema for Users, Multi-Device Telemetry, Scans & Audit Trails
-- Database: kodand (ID: ca1b0b5e-f964-4a8a-bdf9-ec94bab27c0e)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'agency'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  company TEXT,
  phone TEXT,
  scans_used INTEGER NOT NULL DEFAULT 0,
  max_scans INTEGER NOT NULL DEFAULT 10,
  login_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  last_active_ip TEXT,
  last_active_country TEXT,
  last_active_city TEXT,
  last_active_device TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'desktop' | 'mobile' | 'tablet'
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  platform TEXT NOT NULL,
  screen_resolution TEXT NOT NULL,
  color_depth TEXT,
  touch_support INTEGER NOT NULL DEFAULT 0, -- 0 or 1
  language TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  hardware_concurrency INTEGER DEFAULT 4,
  device_memory TEXT,
  connection_type TEXT,
  ip TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  user_agent TEXT NOT NULL,
  referrer TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  login_count INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_ip ON user_devices(ip);

CREATE TABLE IF NOT EXISTS user_scans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  score INTEGER NOT NULL,
  mode TEXT NOT NULL,
  grade TEXT NOT NULL,
  issues_count INTEGER DEFAULT 0,
  device TEXT,
  ip TEXT,
  country TEXT,
  city TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_scans_user ON user_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scans_url ON user_scans(url);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  device TEXT,
  ip TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_logs(user_id);

-- Pre-seed Platform Administrator
INSERT OR IGNORE INTO users (
  id, name, email, password_hash, role, tier, status, company, phone, scans_used, max_scans, login_count, created_at, last_login_at, last_active_ip, last_active_country, last_active_city, last_active_device
) VALUES (
  'user-admin-1',
  'Platform Administrator',
  'admin@kodand.com',
  '3725816ea02b5fd76920b2abb4abf23e594fa13c462a77b4857ec79a4cf8a00e',
  'admin',
  'agency',
  'active',
  'KODAND Security Labs',
  '+1 (555) 019-2831',
  124,
  99999,
  86,
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T00:00:00.000Z',
  '103.21.244.12',
  'IN',
  'Bengaluru',
  'Google Chrome on macOS Sonoma (Desktop)'
);

-- Pre-seed Rahul Sharma (Agency Pro - India)
INSERT OR IGNORE INTO users (
  id, name, email, password_hash, role, tier, status, company, phone, scans_used, max_scans, login_count, created_at, last_login_at, last_active_ip, last_active_country, last_active_city, last_active_device
) VALUES (
  'user-agency-1',
  'Rahul Sharma',
  'rahul@apexmedia.in',
  '00dc853782a0b2fbb9777da9e6651ed69151f4ef923c865c6ac6807e352929cf',
  'user',
  'agency',
  'active',
  'Apex Media Agency (India)',
  '+91 98201 44521',
  42,
  1000,
  28,
  '2026-02-10T11:20:00.000Z',
  '2026-09-07T22:00:00.000Z',
  '49.207.210.84',
  'IN',
  'Mumbai',
  'Microsoft Edge on Windows 10/11 (Desktop)'
);

-- Pre-seed Sarah Jenkins (Starter - USA)
INSERT OR IGNORE INTO users (
  id, name, email, password_hash, role, tier, status, company, phone, scans_used, max_scans, login_count, created_at, last_login_at, last_active_ip, last_active_country, last_active_city, last_active_device
) VALUES (
  'user-starter-1',
  'Sarah Jenkins',
  'sarah@growthdev.com',
  'eaee9d8c3ea5e05f5612b8ca8c165a514808d81eaa8546cbc5be8fe0d661f8ca',
  'user',
  'starter',
  'active',
  'Growth Dev Studio',
  '+1 (415) 890-3321',
  19,
  100,
  14,
  '2026-02-18T14:15:00.000Z',
  '2026-09-07T20:00:00.000Z',
  '172.56.42.99',
  'US',
  'San Francisco',
  'Mozilla Firefox on macOS (Desktop)'
);
