"""
RecoveryAgent orchestrates the full agentic loop for one failed transaction and
writes every step to AgentAction so the frontend "Agent Activity" trace is a
real execution log, not a canned animation.
"""
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Customer, Transaction, RecoveryCase, AgentAction, PaymentLink, Message
from app.ml.predict import predict_recovery_probability
from app.agents.decision_engine import decide
from app.agents import tools


def _log(db: Session, case_id: str, step: str, action_type: str, detail: dict):
    entry = AgentAction(
        recovery_case_id=case_id,
        step=step,
        action_type=action_type,
        detail=json.dumps(detail, default=str),
        status="completed",
    )
    db.add(entry)
    db.commit()
    return entry


def build_features(customer: Customer, txn: Transaction) -> dict:
    now = datetime.utcnow()
    hours_since = max((now - txn.failed_at).total_seconds() / 3600.0, 0.0)
    return {
        "amount": txn.amount,
        "hour": txn.failed_at.hour,
        "day_of_week": txn.failed_at.weekday(),
        "is_subscription": int(txn.is_subscription),
        "time_since_failure_hr": round(hours_since, 2),
        "customer_total_transactions": customer.total_transactions,
        "customer_successful_transactions": customer.successful_transactions,
        "customer_failed_transactions": customer.failed_transactions,
        "customer_success_rate": customer.success_rate,
        "customer_lifetime_value": customer.lifetime_value,
        "method_matches_preference": int(txn.payment_method == customer.preferred_method),
        "prior_recovery_attempts": customer.prior_recovery_attempts,
        "prior_recovery_successes": customer.prior_recovery_successes,
        "customer_opted_out": int(customer.opted_out),
        "payment_method": txn.payment_method,
        "failure_reason": txn.failure_reason,
        "customer_preferred_method": customer.preferred_method,
        "segment": customer.segment,
    }


def run_agent(db: Session, recovery_case: RecoveryCase, auto_execute: bool = True) -> RecoveryCase:
    txn = recovery_case.transaction
    customer = recovery_case.customer if hasattr(recovery_case, "customer") else db.get(Customer, recovery_case.customer_id)

    # 1. OBSERVE
    _log(db, recovery_case.id, "observe", "payment_failure_detected", {
        "transaction_ref": txn.transaction_ref, "amount": txn.amount, "failure_reason": txn.failure_reason,
    })

    # 2. RETRIEVE CONTEXT
    _log(db, recovery_case.id, "retrieve_context", "customer_history_retrieved", {
        "segment": customer.segment, "success_rate": customer.success_rate,
        "lifetime_value": customer.lifetime_value, "prior_recovery_attempts": customer.prior_recovery_attempts,
    })

    # 3. PREDICT
    features = build_features(customer, txn)
    probability = predict_recovery_probability(features)
    _log(db, recovery_case.id, "predict", "recovery_probability_calculated", {"recovery_probability": probability})

    # 4. REASON + 5. SELECT TOOL (decision engine)
    decision = decide(features, probability)
    _log(db, recovery_case.id, "reason", "agent_decision", {
        "action": decision.action, "channel": decision.channel,
        "discount_pct": decision.discount_pct, "reasons": decision.reasons,
        "requires_human_approval": decision.requires_human_approval,
    })

    recovery_case.recovery_probability = probability
    recovery_case.priority_score = decision.priority_score
    recovery_case.recommended_action = decision.action
    recovery_case.recommended_channel = decision.channel
    recovery_case.discount_pct = decision.discount_pct
    recovery_case.requires_human_approval = decision.requires_human_approval
    recovery_case.reasoning = json.dumps(decision.reasons)
    recovery_case.status = "human_review" if decision.requires_human_approval else "decided"
    db.commit()

    if auto_execute and not decision.requires_human_approval:
        execute_decision(db, recovery_case)

    return recovery_case


def execute_decision(db: Session, recovery_case: RecoveryCase) -> RecoveryCase:
    txn = recovery_case.transaction
    customer = db.get(Customer, recovery_case.customer_id)
    action = recovery_case.recommended_action

    if action == "skip_no_contact":
        recovery_case.status = "closed_no_contact"
        db.commit()
        _log(db, recovery_case.id, "execute", "skipped", {"reason": "customer opted out"})
        return recovery_case

    if action == "escalate_to_human":
        result = tools.escalate_to_human("Recovery probability too low for automated action")
        _log(db, recovery_case.id, "execute", "escalate_to_human", result)
        recovery_case.status = "escalated"
        db.commit()
        return recovery_case

    if action == "delay_and_retry":
        _log(db, recovery_case.id, "execute", "delay_and_retry_scheduled", {"retry_after_hours": 12})
        recovery_case.status = "scheduled_retry"
        db.commit()
        return recovery_case

    # generate_payment_link_and_notify
    link = tools.create_payment_link(
        amount=txn.amount * (1 - recovery_case.discount_pct / 100.0),
        customer_name=customer.name,
        description=f"Recovery link for {txn.transaction_ref}",
    )
    pl = PaymentLink(
        recovery_case_id=recovery_case.id, link_ref=link["link_ref"], short_url=link["short_url"],
        amount=link["amount"], status="created", expires_at=link["expires_at"],
    )
    db.add(pl)
    db.commit()
    _log(db, recovery_case.id, "execute", "payment_link_created", link)

    message = tools.generate_message(
        channel=recovery_case.recommended_channel, customer_name=customer.name, amount=link["amount"],
        preferred_method=customer.preferred_method, short_url=link["short_url"],
        discount_pct=recovery_case.discount_pct,
    )
    sent = tools.send_notification(
        recovery_case.recommended_channel, message,
        phone=customer.phone, customer_name=customer.name,
    )
    msg = Message(recovery_case_id=recovery_case.id, channel=sent["channel"], body=sent["message"], sent_at=sent["sent_at"])
    db.add(msg)
    recovery_case.status = "monitoring"
    db.commit()
    _log(db, recovery_case.id, "execute", "notification_sent", sent)

    return recovery_case


def simulate_outcome(db: Session, recovery_case: RecoveryCase, outcome: str) -> RecoveryCase:
    """Simulate the customer's response for demo purposes (recovered / no_response)."""
    from datetime import datetime as dt
    if outcome == "recovered":
        for pl in recovery_case.payment_links:
            pl.status = "paid"
        for m in recovery_case.messages:
            m.responded_at = dt.utcnow()
        recovery_case.status = "recovered"
        recovery_case.resolved_at = dt.utcnow()
        customer = db.get(Customer, recovery_case.customer_id)
        customer.prior_recovery_attempts += 1
        customer.prior_recovery_successes += 1
        _log(db, recovery_case.id, "verify", "payment_recovered", {"case_id": recovery_case.id})
    else:
        recovery_case.status = "failed"
        recovery_case.resolved_at = dt.utcnow()
        customer = db.get(Customer, recovery_case.customer_id)
        customer.prior_recovery_attempts += 1
        _log(db, recovery_case.id, "verify", "recovery_failed", {"case_id": recovery_case.id})

    _log(db, recovery_case.id, "memory", "outcome_recorded", {
        "customer_id": recovery_case.customer_id, "outcome": outcome, "channel": recovery_case.recommended_channel,
    })
    db.commit()
    return recovery_case
