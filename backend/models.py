from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, index=True)
    product_name = Column(String, index=True)
    quantity = Column(Float, default=1)
    invoice_date = Column(DateTime, nullable=True)
    customer_id = Column(String, index=True)
    unit_price = Column(Float, default=1.0)


class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    antecedent = Column(String, index=True)
    consequent = Column(String, index=True)
    support = Column(Float)
    confidence = Column(Float)
    lift = Column(Float, index=True)
    algorithm = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    id = Column(Integer, primary_key=True)
    customer_id = Column(String, index=True)
    segment_label = Column(String, index=True)
    recency = Column(Float)
    frequency = Column(Float)
    monetary = Column(Float)


Index("ix_rule_products", Rule.antecedent, Rule.consequent)
