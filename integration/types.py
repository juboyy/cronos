"""Common data structures and types for Cronos.
Consolidated from various modules to ensure consistency.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime

# --- Crawler & Intelligence Types ---

@dataclass
class Article:
    id: str
    source: str
    url: str
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    published_at: Optional[str] = None
    crawled_at: Optional[str] = field(default_factory=lambda: datetime.utcnow().isoformat())
    image_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Entity:
    id: str
    type: str
    value: str
    canonical_name: Optional[str] = None
    sector: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Sentiment:
    score: float
    label: str  # 'positive', 'negative', 'neutral'
    confidence: float
    model: str
    article_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

# --- Market & Impact Types ---

@dataclass
class PricePoint:
    date: str
    close: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None

@dataclass
class Impact:
    ticker: str
    impact_score: float
    delta_1d: Optional[float] = None
    delta_5d: Optional[float] = None
    volume_ratio: float = 1.0
    volume_anomaly: bool = False
    sentiment_score: float = 0.0
    confidence: float = 0.5
    article_id: Optional[str] = None

# --- Simulation Types ---

class SimulationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class SimulationPrediction:
    ticker: str
    direction: str  # 'up', 'down', 'sideways'
    magnitude: str  # 'small', 'moderate', 'large'
    probability: float
    timeframe: str
    reasoning: str

@dataclass
class SimulationScenario:
    name: str
    probability: float
    description: str
    catalysts: List[str] = field(default_factory=list)

@dataclass
class SimulationResult:
    simulation_id: str
    scenario: str
    predictions: List[SimulationPrediction] = field(default_factory=list)
    scenarios: List[SimulationScenario] = field(default_factory=list)
    confidence: float = 0.0
    caveats: List[str] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
