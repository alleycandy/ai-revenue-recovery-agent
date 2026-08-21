"""
Seed the SQLite DB from the synthetic dataset.

Loads ALL customers but only a manageable slice of failed transactions as
*already-resolved* history (for analytics charts), plus a smaller batch of
*open* recovery cases the agent hasn't processed yet (for the live queue).

Run:
    python -m app.db.seed
"""
import sys
from pathlib import Path
from datetime import datetime
import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db.database import Base, engine, SessionLocal
from app.models import models as m

DATA_DIR = Path(__file__).resolve().parents[3] / "data"


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed(n_open_cases: int = 60, n_history_cases: int = 800):
    reset_db()
    db = SessionLocal()

    customers_df = pd.read_csv(DATA_DIR / "customers.csv")
    txns_df = pd.read_csv(DATA_DIR / "transactions.csv", parse_dates=["failed_at"])

    first_names = ["Rahul", "Aman", "Priya", "Rohit", "Sneha", "Vikram", "Ananya", "Karan",
                   "Neha", "Arjun", "Divya", "Sanjay", "Pooja", "Manoj", "Isha", "Rajesh"]
    last_names = ["Kumar", "Sharma", "Patel", "Singh", "Gupta", "Reddy", "Nair", "Iyer", "Das", "Mehta"]
    import random
    random.seed(7)

    cust_objs = {}
    for _, row in customers_df.iterrows():
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        c = m.Customer(
            customer_ref=row["customer_id"],
            name=name,
            email=f"{name.lower().replace(' ', '.')}@example.com",
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            segment=row["segment"],
            total_transactions=int(row["total_transactions"]),
            successful_transactions=int(row["successful_transactions"]),
            failed_transactions=int(row["failed_transactions"]),
            success_rate=float(row["success_rate"]),
            lifetime_value=float(row["lifetime_value"]),
            preferred_method=row["preferred_method"],
            prior_recovery_attempts=int(row["prior_recovery_attempts"]),
            prior_recovery_successes=int(row["prior_recovery_successes"]),
            opted_out=bool(row["opted_out"]),
        )
        db.add(c)
        cust_objs[row["customer_id"]] = c
    db.commit()

    # ---- historical (resolved) cases for analytics: sample from full dataset ----
    hist_sample = txns_df.sample(n=min(n_history_cases, len(txns_df)), random_state=7)
    for _, row in hist_sample.iterrows():
        cust = cust_objs.get(row["customer_id"])
        if cust is None:
            continue
        txn = m.Transaction(
            transaction_ref=row["transaction_id"], customer_id=cust.id, amount=float(row["amount"]),
            payment_method=row["payment_method"], status="failed", failure_reason=row["failure_reason"],
            is_subscription=bool(row["is_subscription"]), failed_at=row["failed_at"],
        )
        db.add(txn)
        db.flush()
        rc = m.RecoveryCase(
            transaction_id=txn.id, customer_id=cust.id,
            recovery_probability=None, priority_score=0,
            status="recovered" if row["recovered"] == 1 else "failed",
            recommended_action="generate_payment_link_and_notify",
            recommended_channel=random.choice(["whatsapp", "email", "payment_link"]),
            reasoning="[]", requires_human_approval=False,
            created_at=row["failed_at"], resolved_at=row["failed_at"],
        )
        db.add(rc)
    db.commit()

    # ---- open cases: fresh, not-yet-processed by the agent (for the live demo queue) ----
    open_sample = txns_df.sample(n=n_open_cases, random_state=99)
    now = datetime.utcnow()
    for i, (_, row) in enumerate(open_sample.iterrows()):
        cust = cust_objs.get(row["customer_id"])
        if cust is None:
            continue
        txn = m.Transaction(
            transaction_ref=f"OPEN-{row['transaction_id']}", customer_id=cust.id, amount=float(row["amount"]),
            payment_method=row["payment_method"], status="failed", failure_reason=row["failure_reason"],
            is_subscription=bool(row["is_subscription"]), failed_at=now,
        )
        db.add(txn)
        db.flush()
        rc = m.RecoveryCase(
            transaction_id=txn.id, customer_id=cust.id,
            recovery_probability=None, priority_score=0, status="new",
            reasoning="[]", requires_human_approval=False, created_at=now,
        )
        db.add(rc)
    db.commit()
    db.close()
    print(f"Seeded {len(customers_df)} customers, {len(hist_sample)} historical cases, {n_open_cases} open cases.")


if __name__ == "__main__":
    seed()
