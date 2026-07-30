-- claude-works analytics — D1 schema
--
-- Privacy posture: no raw IP address is ever written to this database.
-- Geography comes from Cloudflare's edge (request.cf), which resolves the
-- country/continent before the Worker runs. The only visitor identifier is
-- `seen.vid`, a SHA-256 of (ip + user-agent + secret salt + UTC day) that is
-- one-way, rotates every midnight UTC, and is deleted the following day.

-- Aggregate pageview counts. One row per unique dimension combination per day.
CREATE TABLE IF NOT EXISTS pageviews (
  day      TEXT    NOT NULL,          -- YYYY-MM-DD, UTC
  slug     TEXT    NOT NULL,          -- work filename minus .html, or 'gallery'
  country  TEXT    NOT NULL,          -- ISO-3166-1 alpha-2, 'XX' when unknown
  region   TEXT    NOT NULL,          -- continent code: AF AN AS EU NA OC SA, 'XX' unknown
  device   TEXT    NOT NULL,          -- mobile | tablet | desktop
  referrer TEXT    NOT NULL,          -- referring hostname only, or 'direct'
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, slug, country, region, device, referrer)
);

CREATE INDEX IF NOT EXISTS idx_pageviews_day  ON pageviews (day);
CREATE INDEX IF NOT EXISTS idx_pageviews_slug ON pageviews (slug);

-- Daily-rotating visitor hashes, used only to tell a repeat view from a new
-- visitor within the same UTC day. Pruned opportunistically by the Worker.
CREATE TABLE IF NOT EXISTS seen (
  vid TEXT PRIMARY KEY,
  day TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seen_day ON seen (day);

-- Standalone counters. Currently just 'profile_views', incremented by the
-- GitHub profile README badge. See the note in src/index.js about why that
-- number is approximate.
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT    PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
