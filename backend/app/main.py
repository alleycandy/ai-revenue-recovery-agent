import json
import random
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db, Base, engine, SessionLocal
from app.models import models as m
from app.agents.recovery_agent import run_agent, execute_decision, simulate_outcome, build_features
from app.ml.predict import predict_recovery_probability

Base.metadata.create_all(bind=engine)


def ensure_demo_database_seeded() -> None:
    """Seed the demo database automatically when deployed on a fresh instance.

    Local development can still use ``python -m app.db.seed`` to reset/reseed
    explicitly. On deployment, an empty database should not make the dashboard
    appear blank, so we seed only when no customers exist.
    """
    db = SessionLocal()
    try:
        if db.query(m.Customer).count() == 0:
            from app.db.seed import seed
            seed()
    finally:
        db.close()


ensure_demo_database_seeded()

app = FastAPI(title="AI Revenue Recovery Agent API", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


# ---------- helpers ----------
def case_to_dict(rc: m.RecoveryCase, db: Session) -> dict:
    txn = db.get(m.Transaction, rc.transaction_id)
    cust = db.get(m.Customer, rc.customer_id)
    return {
        "id": rc.id,
        "status": rc.status,
        "recovery_probability": rc.recovery_probability,
        "priority_score": rc.priority_score,
        "recommended_action": rc.recommended_action,
        "recommended_channel": rc.recommended_channel,
        "discount_pct": rc.discount_pct,
        "requires_human_approval": rc.requires_human_approval,
        "reasoning": json.loads(rc.reasoning) if rc.reasoning else [],
        "created_at": rc.created_at.isoformat() if rc.created_at else None,
        "resolved_at": rc.resolved_at.isoformat() if rc.resolved_at else None,
        "transaction": {
            "ref": txn.transaction_ref, "amount": txn.amount, "payment_method": txn.payment_method,
            "failure_reason": txn.failure_reason, "is_subscription": txn.is_subscription,
            "failed_at": txn.failed_at.isoformat() if txn.failed_at else None,
        } if txn else None,
        "customer": {
            "id": cust.id, "name": cust.name, "segment": cust.segment,
            "lifetime_value": cust.lifetime_value, "success_rate": cust.success_rate,
            "preferred_method": cust.preferred_method,
        } if cust else None,
    }


# ---------- dashboard ----------
@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    cases = db.query(m.RecoveryCase).all()
    txns_by_case = {t.id: t for t in db.query(m.Transaction).all()}

    revenue_at_risk = sum(txns_by_case[c.transaction_id].amount for c in cases
                           if txns_by_case.get(c.transaction_id) and c.status not in ("recovered",))
    revenue_recovered = sum(txns_by_case[c.transaction_id].amount for c in cases
                             if txns_by_case.get(c.transaction_id) and c.status == "recovered")
    open_cases = [c for c in cases if c.status in ("new", "decided", "human_review", "monitoring", "scheduled_retry")]
    resolved = [c for c in cases if c.status in ("recovered", "failed")]
    recovered_n = len([c for c in cases if c.status == "recovered"])
    recovery_rate = round(recovered_n / len(resolved), 4) if resolved else 0.0
    potentially_recoverable = sum(
        txns_by_case[c.transaction_id].amount * (c.recovery_probability or 0.5)
        for c in open_cases if txns_by_case.get(c.transaction_id)
    )

    return {
        "revenue_at_risk": round(revenue_at_risk, 2),
        "potentially_recoverable": round(potentially_recoverable, 2),
        "revenue_recovered": round(revenue_recovered, 2),
        "recovery_rate": recovery_rate,
        "open_cases": len(open_cases),
        "resolved_cases": len(resolved),
        "total_customers": db.query(m.Customer).count(),
    }


@app.get("/api/dashboard/channel-performance")
def channel_performance(db: Session = Depends(get_db)):
    rows = db.query(m.RecoveryCase.recommended_channel, m.RecoveryCase.status).filter(
        m.RecoveryCase.status.in_(["recovered", "failed"])
    ).all()
    agg = {}
    for channel, status in rows:
        channel = channel or "unassigned"
        agg.setdefault(channel, {"total": 0, "recovered": 0})
        agg[channel]["total"] += 1
        if status == "recovered":
            agg[channel]["recovered"] += 1
    return [
        {"channel": ch, "recovery_rate": round(v["recovered"] / v["total"], 3) if v["total"] else 0, "n": v["total"]}
        for ch, v in agg.items()
    ]


@app.get("/api/dashboard/recovery-trend")
def recovery_trend(db: Session = Depends(get_db)):
    """Recovery rate bucketed by day for the last 14 days of resolved cases."""
    cases = db.query(m.RecoveryCase).filter(m.RecoveryCase.status.in_(["recovered", "failed"])).all()
    buckets = {}
    for c in cases:
        day = (c.resolved_at or c.created_at).date().isoformat()
        buckets.setdefault(day, {"total": 0, "recovered": 0})
        buckets[day]["total"] += 1
        if c.status == "recovered":
            buckets[day]["recovered"] += 1
    days = sorted(buckets.keys())[-14:]
    return [{"date": d, "recovery_rate": round(buckets[d]["recovered"] / buckets[d]["total"], 3)} for d in days]


# ---------- recovery cases ----------
@app.get("/api/recovery/cases")
def list_cases(status: str | None = None, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(m.RecoveryCase)
    if status:
        q = q.filter(m.RecoveryCase.status == status)
    else:
        q = q.filter(m.RecoveryCase.status.notin_(["recovered", "failed"]))
    cases = q.order_by(m.RecoveryCase.priority_score.desc()).limit(limit).all()
    return [case_to_dict(c, db) for c in cases]


@app.get("/api/recovery/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    rc = db.get(m.RecoveryCase, case_id)
    if not rc:
        raise HTTPException(404, "case not found")
    actions = db.query(m.AgentAction).filter(m.AgentAction.recovery_case_id == case_id).order_by(m.AgentAction.created_at).all()
    links = db.query(m.PaymentLink).filter(m.PaymentLink.recovery_case_id == case_id).all()
    messages = db.query(m.Message).filter(m.Message.recovery_case_id == case_id).all()
    data = case_to_dict(rc, db)
    data["agent_trace"] = [
        {"step": a.step, "action_type": a.action_type, "detail": json.loads(a.detail), "at": a.created_at.isoformat()}
        for a in actions
    ]
    data["payment_links"] = [{"short_url": l.short_url, "amount": l.amount, "status": l.status} for l in links]
    data["messages"] = [{"channel": msg.channel, "body": msg.body, "sent_at": msg.sent_at.isoformat()} for msg in messages]
    return data


@app.post("/api/recovery/cases/{case_id}/analyze")
def analyze_case(case_id: str, db: Session = Depends(get_db)):
    rc = db.get(m.RecoveryCase, case_id)
    if not rc:
        raise HTTPException(404, "case not found")
    run_agent(db, rc, auto_execute=False)
    return get_case(case_id, db)


@app.post("/api/recovery/cases/{case_id}/execute")
def approve_and_execute(case_id: str, db: Session = Depends(get_db)):
    rc = db.get(m.RecoveryCase, case_id)
    if not rc:
        raise HTTPException(404, "case not found")
    if rc.recommended_action is None:
        run_agent(db, rc, auto_execute=True)
    else:
        execute_decision(db, rc)
    return get_case(case_id, db)


@app.post("/api/recovery/cases/{case_id}/reject")
def reject_case(case_id: str, db: Session = Depends(get_db)):
    rc = db.get(m.RecoveryCase, case_id)
    if not rc:
        raise HTTPException(404, "case not found")
    rc.status = "rejected_by_human"
    rc.resolved_at = datetime.utcnow()
    db.commit()
    return get_case(case_id, db)


@app.post("/api/recovery/cases/{case_id}/simulate-outcome")
def simulate(case_id: str, outcome: str, db: Session = Depends(get_db)):
    if outcome not in ("recovered", "failed"):
        raise HTTPException(400, "outcome must be 'recovered' or 'failed'")
    rc = db.get(m.RecoveryCase, case_id)
    if not rc:
        raise HTTPException(404, "case not found")
    simulate_outcome(db, rc, outcome)
    return get_case(case_id, db)


# ---------- customers ----------
@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    cust = db.get(m.Customer, customer_id)
    if not cust:
        raise HTTPException(404, "customer not found")
    cases = db.query(m.RecoveryCase).filter(m.RecoveryCase.customer_id == customer_id).order_by(m.RecoveryCase.created_at.desc()).limit(20).all()
    return {
        "id": cust.id, "name": cust.name, "email": cust.email, "segment": cust.segment,
        "lifetime_value": cust.lifetime_value, "success_rate": cust.success_rate,
        "total_transactions": cust.total_transactions, "preferred_method": cust.preferred_method,
        "prior_recovery_attempts": cust.prior_recovery_attempts,
        "prior_recovery_successes": cust.prior_recovery_successes,
        "opted_out": cust.opted_out,
        "recent_cases": [case_to_dict(c, db) for c in cases],
    }


# ---------- ML ----------
@app.get("/api/ml/model-metrics")
def model_metrics():
    path = Path(__file__).resolve().parent / "ml" / "model_metrics.json"
    if not path.exists():
        raise HTTPException(404, "model metrics not found, run train.py first")
    return json.loads(path.read_text())


# ---------- webhook simulation (stand-in for real Razorpay webhooks) ----------
@app.post("/api/webhooks/simulate-failure")
def simulate_failure(db: Session = Depends(get_db)):
    """Creates a brand-new failed payment for a random existing customer and runs the agent live."""
    cust = db.query(m.Customer).order_by(func.random()).first()
    if not cust:
        raise HTTPException(400, "no customers seeded")

    methods = ["upi", "card", "netbanking", "wallet"]
    reasons = ["card_declined", "insufficient_funds", "network_error", "otp_failure", "bank_timeout"]
    amount = round(random.uniform(299, min(15000, max(999, cust.lifetime_value / 10))), 2)

    txn = m.Transaction(
        transaction_ref=f"LIVE-{random.randint(100000,999999)}", customer_id=cust.id, amount=amount,
        payment_method=random.choice(methods), status="failed", failure_reason=random.choice(reasons),
        is_subscription=random.random() < 0.2, failed_at=datetime.utcnow(),
    )
    db.add(txn)
    db.flush()
    rc = m.RecoveryCase(transaction_id=txn.id, customer_id=cust.id, status="new", reasoning="[]", created_at=datetime.utcnow())
    db.add(rc)
    db.commit()

    run_agent(db, rc, auto_execute=True)
    return get_case(rc.id, db)


app.mount("/", StaticFiles(directory=str(Path(__file__).resolve().parents[2] / "frontend"), html=True), name="frontend")
