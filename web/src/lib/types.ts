export interface Article {
  id: string;
  source: string;
  url: string;
  title: string;
  summary: string | null;
  content: string | null;
  published_at: string | null;
  crawled_at: string;
  image_url: string | null;
  metadata: Record<string, any>;
}

export interface Entity {
  id: string;
  type: string;
  value: string;
  canonical_name: string | null;
  sector: string | null;
  metadata: Record<string, any>;
}

export interface ArticleEntity {
  article_id: string;
  entity_id: string;
  relevance: number;
  context: string | null;
}

export interface Sentiment {
  id: string;
  article_id: string;
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  model: string;
  created_at: string;
}

export interface ArticleWithMeta extends Article {
  sentiment?: Sentiment;
  entities?: Entity[];
}

export interface TrendingEntity extends Entity {
  mention_count: number;
  avg_sentiment: number;
}

// Sprint 2+ types

export interface Price {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface Impact {
  id: string;
  article_id: string;
  entity_id: string;
  ticker: string;
  delta_1d: number | null;
  delta_5d: number | null;
  volume_ratio: number;
  volume_anomaly: boolean;
  impact_score: number;
  confidence: number;
  sentiment_score: number;
  source_trust: number;
  window_data: Record<string, any>;
  created_at: string;
  cronos_articles?: { title: string; source: string; published_at: string };
}

export interface Simulation {
  id: string;
  scenario: string;
  tickers: string[];
  config: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: SimulationResult | null;
  created_at: string;
  completed_at: string | null;
}

export interface SimulationResult {
  simulation_id: string;
  scenario: string;
  predictions: Prediction[];
  scenarios: ScenarioCase[];
  agent_interactions: {
    consensus_level: number;
    most_influential: string;
    strongest_disagreement: string;
    key_debate_points: string[];
  };
  rounds: { round: number; key_arguments: string[]; emerging_consensus: string; sentiment_shift: number }[];
  confidence: number;
  caveats: string[];
}

export interface Prediction {
  ticker: string;
  direction: 'up' | 'down' | 'sideways';
  magnitude: 'small' | 'moderate' | 'large';
  probability: number;
  timeframe: string;
  reasoning: string;
}

export interface ScenarioCase {
  name: string;
  probability: number;
  description: string;
  catalysts: string[];
}

export interface Pattern {
  id: string;
  ticker: string;
  pattern_type: string;
  description: string;
  avg_impact: number;
  std_dev: number;
  occurrences: number;
  avg_confidence: number;
  sample_articles: { title: string; date: string; delta: number }[];
  last_seen: string;
}

export interface Alert {
  id: string;
  name: string;
  type: string;
  conditions: Record<string, any>;
  channels: string[];
  active: boolean;
  last_triggered: string | null;
  trigger_count: number;
  cooldown_minutes: number;
}
