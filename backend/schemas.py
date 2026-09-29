from typing import Optional
from pydantic import BaseModel, Field


class MineRequest(BaseModel):
    min_support: float = Field(0.05, ge=0.001, le=1)
    min_confidence: float = Field(0.3, ge=0.001, le=1)
    min_lift: float = Field(1.0, ge=0.0)


class SegmentRequest(BaseModel):
    n_clusters: int = Field(3, ge=2, le=8)


class RevenueRequest(BaseModel):
    antecedent: str
    consequent: str
    discount_percent: float = Field(..., ge=0, le=100)
