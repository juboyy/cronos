-- 003_simulations.sql
-- Simulation results + patterns + alerts

CREATE TABLE IF NOT EXISTS cronos_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario TEXT NOT NULL,
  tickers TEXT[] DEFAULT '{}',
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Historical patterns
CREATE TABLE IF NOT EXISTS cronos_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- dividend, earnings, acquisition, regulatory, macro
  description TEXT NOT NULL,
  avg_impact NUMERIC,
  std_dev NUMERIC,
  occurrences INTEGER DEFAULT 0,
  avg_confidence NUMERIC,
  sample_articles JSONB DEFAULT '[]',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, pattern_type, description)
);

-- Alerts
CREATE TABLE IF NOT EXISTS cronos_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- sentiment, price, volume, pattern, composite
  conditions JSONB NOT NULL, -- e.g. {"ticker": "PETR4", "sentiment_below": -0.3, "volume_above": 2.0}
  channels TEXT[] DEFAULT '{dashboard}', -- dashboard, telegram, slack, email
  active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  cooldown_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert history
CREATE TABLE IF NOT EXISTS cronos_alert_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES cronos_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  conditions_met JSONB,
  data_snapshot JSONB,
  delivered_to TEXT[],
  acknowledged BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_simulations_status ON cronos_simulations(status);
CREATE INDEX IF NOT EXISTS idx_simulations_created ON cronos_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_ticker ON cronos_patterns(ticker);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON cronos_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON cronos_alerts(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_alert_events_alert ON cronos_alert_events(alert_id);

-- RLS
ALTER TABLE cronos_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronos_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronos_alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_simulations" ON cronos_simulations FOR SELECT USING (true);
CREATE POLICY "service_write_simulations" ON cronos_simulations FOR ALL USING (true);
CREATE POLICY "public_read_patterns" ON cronos_patterns FOR SELECT USING (true);
CREATE POLICY "service_write_patterns" ON cronos_patterns FOR ALL USING (true);
CREATE POLICY "public_read_alerts" ON cronos_alerts FOR SELECT USING (true);
CREATE POLICY "service_write_alerts" ON cronos_alerts FOR ALL USING (true);
CREATE POLICY "public_read_alert_events" ON cronos_alert_events FOR SELECT USING (true);
CREATE POLICY "service_write_alert_events" ON cronos_alert_events FOR ALL USING (true);
