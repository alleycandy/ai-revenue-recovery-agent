"""
Synthetic fintech transaction dataset generator for the AI Revenue Recovery Agent.

Generates realistic FAILED payment events with meaningful, non-random relationships
between customer history, payment method, failure reason, time-since-failure and
whether the payment was eventually recovered -- so a model trained on this data
learns real signal instead of noise.

Usage:
    python generate_dataset.py --n 50000 --out ../data/transactions.csv
"""
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

RNG = np.random.default_rng(42)

PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"]
FAILURE_REASONS = [
    "card_declined", "insufficient_funds", "bank_timeout",
    "network_error", "otp_failure", "payment_link_expired", "gateway_error",
]
DEVICE_TYPES = ["mobile", "desktop", "tablet"]


def gen_customers(n_customers: int) -> pd.DataFrame:
    """Create a customer base with heterogeneous history so recovery behaviour varies."""
    tenure_days = RNG.integers(1, 900, n_customers)

    # segment customers so the dataset has real structure, not iid noise
    segment = RNG.choice(
        ["new", "casual", "loyal", "high_value"],
        size=n_customers,
        p=[0.25, 0.35, 0.28, 0.12],
    )

    seg_success_rate = {"new": 0.55, "casual": 0.72, "loyal": 0.86, "high_value": 0.93}
    seg_ltv_range = {
        "new": (0, 3000), "casual": (1000, 15000),
        "loyal": (10000, 60000), "high_value": (50000, 400000),
    }

    total_txns = np.clip((tenure_days / RNG.integers(5, 30, n_customers)).astype(int), 1, 400)
    success_rate = np.clip(
        np.array([seg_success_rate[s] for s in segment]) + RNG.normal(0, 0.08, n_customers),
        0.05, 0.99,
    )
    successful = (total_txns * success_rate).astype(int)
    failed = np.maximum(total_txns - successful, 0)

    ltv = np.array([RNG.uniform(*seg_ltv_range[s]) for s in segment])
    preferred_method = RNG.choice(PAYMENT_METHODS, n_customers, p=[0.52, 0.28, 0.13, 0.07])

    # customers who have been recovered before tend to be recoverable again
    prior_recovery_attempts = RNG.poisson(np.clip(failed * 0.6, 0, 20)).astype(int)
    prior_recovery_success_rate = np.clip(success_rate + RNG.normal(0, 0.1, n_customers), 0.02, 0.97)
    prior_recovery_successes = (prior_recovery_attempts * prior_recovery_success_rate).astype(int)

    opted_out = RNG.choice([0, 1], n_customers, p=[0.93, 0.07])

    df = pd.DataFrame({
        "customer_id": [f"C{100000+i}" for i in range(n_customers)],
        "segment": segment,
        "tenure_days": tenure_days,
        "total_transactions": total_txns,
        "successful_transactions": successful,
        "failed_transactions": failed,
        "success_rate": (successful / np.maximum(total_txns, 1)).round(3),
        "lifetime_value": ltv.round(2),
        "preferred_method": preferred_method,
        "prior_recovery_attempts": prior_recovery_attempts,
        "prior_recovery_successes": prior_recovery_successes,
        "opted_out": opted_out,
    })
    return df


def gen_failed_transactions(customers: pd.DataFrame, n_txns: int) -> pd.DataFrame:
    """Generate failed-payment events for these customers with a realistic recovery label."""
    idx = RNG.choice(customers.index, size=n_txns, replace=True,
                      p=(customers["failed_transactions"] + 1) / (customers["failed_transactions"] + 1).sum())
    cust = customers.loc[idx].reset_index(drop=True)

    # amount correlated with segment / LTV, not pure random
    base_amount = np.clip(cust["lifetime_value"] / RNG.integers(8, 40, n_txns), 99, 50000)
    amount = np.round(base_amount, -1) + RNG.choice([0, 99, 49], n_txns, p=[0.5, 0.3, 0.2])

    payment_method = RNG.choice(PAYMENT_METHODS, n_txns, p=[0.5, 0.32, 0.12, 0.06])
    failure_reason = np.array([
        RNG.choice(FAILURE_REASONS, p=[0.28, 0.22, 0.14, 0.14, 0.10, 0.06, 0.06])
        if pm == "card" else
        RNG.choice(["network_error", "otp_failure", "bank_timeout", "insufficient_funds", "gateway_error"],
                   p=[0.30, 0.22, 0.20, 0.18, 0.10])
        for pm in payment_method
    ])

    hour = RNG.integers(0, 24, n_txns)
    day_of_week = RNG.integers(0, 7, n_txns)
    is_subscription = RNG.choice([0, 1], n_txns, p=[0.78, 0.22])

    # time since failure at "the moment the agent looks at it" (hours) - decays recoverability
    time_since_failure_hr = RNG.exponential(6, n_txns).clip(0, 96)

    method_matches_preference = (payment_method == cust["preferred_method"]).astype(int)

    # ---- ground-truth recovery probability model (this is the signal the ML model must learn) ----
    base = 0.12
    base += 0.35 * cust["success_rate"]
    base += 0.15 * method_matches_preference
    base += 0.10 * (cust["segment"] == "high_value").astype(int)
    base += 0.05 * (cust["segment"] == "loyal").astype(int)
    base -= 0.08 * (cust["segment"] == "new").astype(int)
    base += 0.12 * np.clip(cust["prior_recovery_successes"] / np.maximum(cust["prior_recovery_attempts"], 1), 0, 1)
    base -= 0.20 * (failure_reason == "insufficient_funds").astype(int)
    base -= 0.05 * (failure_reason == "card_declined").astype(int)
    base += 0.05 * (failure_reason == "network_error").astype(int)
    base += 0.05 * (failure_reason == "otp_failure").astype(int)
    # time decay: recoverability drops off the longer it's been
    time_decay = np.select(
        [time_since_failure_hr <= 1, time_since_failure_hr <= 6, time_since_failure_hr <= 24],
        [0.06, 0.0, -0.12],
        default=-0.28,
    )
    base += time_decay
    base -= 0.35 * cust["opted_out"]
    base -= 0.10 * is_subscription  # subscription failures recover slightly less without intervention
    base += RNG.normal(0, 0.06, n_txns)  # noise
    true_prob = np.clip(base, 0.01, 0.98)

    recovered = (RNG.uniform(0, 1, n_txns) < true_prob).astype(int)
    # opted-out customers never actually get contacted -> cannot be recovered by the agent
    recovered = np.where(cust["opted_out"] == 1, 0, recovered)

    now = datetime(2026, 8, 21, 12, 0, 0)
    failed_at = [now - timedelta(hours=float(h)) - timedelta(days=int(RNG.integers(0, 10)))
                 for h in time_since_failure_hr]

    df = pd.DataFrame({
        "transaction_id": [f"T{900000+i}" for i in range(n_txns)],
        "customer_id": cust["customer_id"],
        "segment": cust["segment"],
        "amount": amount,
        "payment_method": payment_method,
        "failure_reason": failure_reason,
        "failed_at": failed_at,
        "hour": hour,
        "day_of_week": day_of_week,
        "is_subscription": is_subscription,
        "time_since_failure_hr": time_since_failure_hr.round(2),
        "customer_total_transactions": cust["total_transactions"],
        "customer_successful_transactions": cust["successful_transactions"],
        "customer_failed_transactions": cust["failed_transactions"],
        "customer_success_rate": cust["success_rate"],
        "customer_lifetime_value": cust["lifetime_value"],
        "customer_preferred_method": cust["preferred_method"],
        "method_matches_preference": method_matches_preference,
        "prior_recovery_attempts": cust["prior_recovery_attempts"],
        "prior_recovery_successes": cust["prior_recovery_successes"],
        "customer_opted_out": cust["opted_out"],
        "recovered": recovered,
    })
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n_customers", type=int, default=8000)
    ap.add_argument("--n_txns", type=int, default=50000)
    ap.add_argument("--out", type=str, default="transactions.csv")
    ap.add_argument("--customers_out", type=str, default="customers.csv")
    args = ap.parse_args()

    customers = gen_customers(args.n_customers)
    txns = gen_failed_transactions(customers, args.n_txns)

    customers.to_csv(args.customers_out, index=False)
    txns.to_csv(args.out, index=False)

    print(f"Generated {len(customers)} customers -> {args.customers_out}")
    print(f"Generated {len(txns)} failed transactions -> {args.out}")
    print(f"Overall recovery rate in dataset: {txns['recovered'].mean():.3f}")


if __name__ == "__main__":
    main()
