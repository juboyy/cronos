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
