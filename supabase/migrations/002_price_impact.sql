-- 002_price_impact.sql
-- Price data + impact scoring tables

-- Price history (OHLCV)
CREATE TABLE IF NOT EXISTS cronos_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC NOT NULL,
  volume BIGINT,
  volume_brl NUMERIC,
  trades INTEGER,
  source TEXT DEFAULT 'b3', -- b3, yahoo, bcb
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, date, source)
);

-- Macro indicators (Selic, IPCA, USD/BRL)
CREATE TABLE IF NOT EXISTS cronos_macro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator TEXT NOT NULL, -- selic, ipca, usdbrl, cdi
  date DATE NOT NULL,
  value NUMERIC NOT NULL,
  source TEXT DEFAULT 'bcb',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator, date)
);

-- Impact scores (article × ticker correlation)
CREATE TABLE IF NOT EXISTS cronos_impacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES cronos_articles(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES cronos_entities(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  -- Price deltas by window
  delta_1h NUMERIC, -- % change t to t+1h
  delta_4h NUMERIC,
  delta_1d NUMERIC,
  delta_5d NUMERIC,
  -- Volume anomaly
  volume_ratio NUMERIC, -- actual/avg ratio
  volume_anomaly BOOLEAN DEFAULT false,
  -- Composite score
  impact_score NUMERIC NOT NULL DEFAULT 0, -- 0 to 1
  confidence NUMERIC DEFAULT 0.5,
  -- Context
  sentiment_score NUMERIC,
  source_trust NUMERIC DEFAULT 0.5,
  window_data JSONB DEFAULT '{}', -- raw price snapshots
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(article_id, ticker)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prices_ticker_date ON cronos_prices(ticker, date DESC);
CREATE INDEX IF NOT EXISTS idx_prices_date ON cronos_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_macro_indicator ON cronos_macro(indicator, date DESC);
CREATE INDEX IF NOT EXISTS idx_impacts_ticker ON cronos_impacts(ticker);
CREATE INDEX IF NOT EXISTS idx_impacts_score ON cronos_impacts(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_impacts_article ON cronos_impacts(article_id);

-- RLS
ALTER TABLE cronos_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronos_macro ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronos_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_prices" ON cronos_prices FOR SELECT USING (true);
CREATE POLICY "service_write_prices" ON cronos_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_macro" ON cronos_macro FOR SELECT USING (true);
CREATE POLICY "service_write_macro" ON cronos_macro FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_impacts" ON cronos_impacts FOR SELECT USING (true);
CREATE POLICY "service_write_impacts" ON cronos_impacts FOR INSERT WITH CHECK (true);
