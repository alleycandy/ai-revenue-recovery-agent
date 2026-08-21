import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from app.db.database import Base


def uid():
    return str(uuid.uuid4())


class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True, default=uid)
    customer_ref = Column(String, unique=True, index=True)  # e.g. C100001
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    segment = Column(String)
    total_transactions = Column(Integer, default=0)
    successful_transactions = Column(Integer, default=0)
    failed_transactions = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    lifetime_value = Column(Float, default=0.0)
    preferred_method = Column(String)
    prior_recovery_attempts = Column(Integer, default=0)
    prior_recovery_successes = Column(Integer, default=0)
    opted_out = Column(Boolean, default=False)

    transactions = relationship("Transaction", back_populates="customer")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, default=uid)
    transaction_ref = Column(String, unique=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"))
    amount = Column(Float)
    currency = Column(String, default="INR")
    payment_method = Column(String)
    status = Column(String, default="failed")
    failure_reason = Column(String)
    is_subscription = Column(Boolean, default=False)
    failed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="transactions")
    recovery_case = relationship("RecoveryCase", back_populates="transaction", uselist=False)


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"
    id = Column(String, primary_key=True, default=uid)
    transaction_id = Column(String, ForeignKey("transactions.id"))
    customer_id = Column(String, ForeignKey("customers.id"))
    recovery_probability = Column(Float)
    priority_score = Column(Float)
    status = Column(String, default="new")  # new -> analyzing -> decided -> executing -> monitoring -> recovered/failed
    recommended_action = Column(String)
    recommended_channel = Column(String)
    reasoning = Column(Text)          # JSON string of the agent's explanation bullets
    requires_human_approval = Column(Boolean, default=False)
    discount_pct = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    transaction = relationship("Transaction", back_populates="recovery_case")
    actions = relationship("AgentAction", back_populates="recovery_case")
    payment_links = relationship("PaymentLink", back_populates="recovery_case")
    messages = relationship("Message", back_populates="recovery_case")


class AgentAction(Base):
    __tablename__ = "agent_actions"
    id = Column(String, primary_key=True, default=uid)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"))
    step = Column(String)          # observe / retrieve_context / predict / reason / select_tool / execute / verify
    action_type = Column(String)
    detail = Column(Text)
    status = Column(String, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)

    recovery_case = relationship("RecoveryCase", back_populates="actions")


class PaymentLink(Base):
    __tablename__ = "payment_links"
    id = Column(String, primary_key=True, default=uid)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"))
    link_ref = Column(String)
    short_url = Column(String)
    amount = Column(Float)
    status = Column(String, default="created")  # created / paid / cancelled / expired
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    recovery_case = relationship("RecoveryCase", back_populates="payment_links")


class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=uid)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"))
    channel = Column(String)
    body = Column(Text)
    sent_at = Column(DateTime, default=datetime.utcnow)
    opened_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, nullable=True)

    recovery_case = relationship("RecoveryCase", back_populates="messages")
