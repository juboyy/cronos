-- Cronos Intelligence v2 — Cross-source correlation, temporal clusters, daily briefings
-- Run against: apkflemxmsbdltziouls (Supabase)

-- 1. Cross-source correlations: same entity mentioned across multiple sources
CREATE TABLE IF NOT EXISTS cronos_correlations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES cronos_entities(id),
  entity_value TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'ticker',
  source_count INT NOT NULL DEFAULT 0,
  sources JSONB NOT NULL DEFAULT '[]',           -- [{source, article_id, title, sentiment, published_at}]
  avg_sentiment FLOAT,
  sentiment_consensus FLOAT,                     -- 0=divergent, 1=unanimous
  signal_strength FLOAT NOT NULL DEFAULT 0,      -- composite: source_count * consensus * abs(sentiment)
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correlations_entity ON cronos_correlations(entity_value);
CREATE INDEX IF NOT EXISTS idx_correlations_strength ON cronos_correlations(signal_strength DESC);
CREATE INDEX IF NOT EXISTS idx_correlations_window ON cronos_correlations(window_start DESC);

-- 2. Temporal clusters: bursts of related articles within short time windows
CREATE TABLE IF NOT EXISTS cronos_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_type TEXT NOT NULL DEFAULT 'burst',     -- burst, emerging, sustained
  title TEXT NOT NULL,                             -- auto-generated cluster label
  article_ids JSONB NOT NULL DEFAULT '[]',
  entity_ids JSONB NOT NULL DEFAULT '[]',
  sources JSONB NOT NULL DEFAULT '[]',
  article_count INT NOT NULL DEFAULT 0,
  avg_sentiment FLOAT,
  dominant_sentiment TEXT,                         -- positive/negative/neutral
  window_minutes INT NOT NULL DEFAULT 360,         -- time window of the cluster
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  keywords JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clusters_type ON cronos_clusters(cluster_type);
CREATE INDEX IF NOT EXISTS idx_clusters_window ON cronos_clusters(window_start DESC);

-- 3. Daily briefings: automated intelligence summaries
CREATE TABLE IF NOT EXISTS cronos_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  top_entities JSONB DEFAULT '[]',                -- [{entity, mentions, avg_sentiment}]
  top_correlations JSONB DEFAULT '[]',            -- [{entity, sources, signal_strength}]
  top_clusters JSONB DEFAULT '[]',                -- [{title, article_count, sentiment}]
  market_mood FLOAT,                               -- overall sentiment for the day
  article_count INT DEFAULT 0,
  source_breakdown JSONB DEFAULT '{}',            -- {source: count}
  alerts_fired INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_date ON cronos_briefings(date DESC);
