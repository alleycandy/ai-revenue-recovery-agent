"""
Decision engine = ML probability + business rules + guardrails.

Deliberately NOT an LLM: the policy that decides whether money moves must be
deterministic, auditable and testable. The LLM (see recovery_agent.py) is only
used downstream to turn this decision into a personalized customer message and
a human-readable explanation -- never to decide the action itself.
"""
from dataclasses import dataclass, field

# ---- Guardrail configuration (would be merchant-configurable in production) ----
MAX_AUTONOMOUS_AMOUNT = 10000       # INR - above this, a human must approve
MAX_DISCOUNT_PCT = 10.0
HIGH_PROB_THRESHOLD = 0.75
MED_PROB_THRESHOLD = 0.45


@dataclass
class Decision:
    action: str
    channel: str
    discount_pct: float
    requires_human_approval: bool
    priority_score: float
    reasons: list = field(default_factory=list)


def decide(features: dict, recovery_probability: float) -> Decision:
    reasons = []
    amount = features["amount"]
    opted_out = bool(features["customer_opted_out"])
    preferred_method = features["customer_preferred_method"]
    success_rate = features["customer_success_rate"]
    ltv = features["customer_lifetime_value"]
    prior_successes = features["prior_recovery_successes"]
    prior_attempts = features["prior_recovery_attempts"]
    failure_reason = features["failure_reason"]
    time_since_failure = features["time_since_failure_hr"]
    segment = features["segment"]

    # ---- hard guardrail: opted-out customers are never contacted ----
    if opted_out:
        return Decision(
            action="skip_no_contact",
            channel="none",
            discount_pct=0.0,
            requires_human_approval=False,
            priority_score=0.0,
            reasons=["Customer has opted out of recovery communications — agent will not contact them."],
        )

    # ---- channel selection ----
    if features["method_matches_preference"]:
        reasons.append(f"Failed via {features['payment_method']}, which matches the customer's preferred method — retry link uses the same method.")
        channel = "payment_link"
    elif preferred_method == "upi":
        reasons.append("Customer historically prefers UPI — generating a UPI-friendly payment link instead of retrying the failed method.")
        channel = "payment_link"
    else:
        channel = "whatsapp" if segment in ("loyal", "high_value") else "email"
        reasons.append(f"No strong method preference on record — defaulting to {channel} for follow-up.")

    if success_rate >= 0.85:
        reasons.append(f"Customer has a strong historical success rate ({success_rate:.0%}) — high confidence in a straightforward retry.")
    if prior_attempts > 0:
        rate = prior_successes / prior_attempts
        reasons.append(f"{prior_successes}/{prior_attempts} previous recovery attempts succeeded ({rate:.0%}) with this customer.")
    if segment == "high_value":
        reasons.append(f"High-value customer (lifetime value ₹{ltv:,.0f}) — prioritized for immediate outreach.")
    if failure_reason == "insufficient_funds":
        reasons.append("Failure reason is insufficient funds — recovery is less certain; agent will wait and retry later rather than push immediately.")
    if time_since_failure > 24:
        reasons.append(f"{time_since_failure:.0f} hours have passed since failure — recoverability decays with time, so this case is deprioritized.")
    elif time_since_failure <= 1:
        reasons.append("Failure just happened — recoverability is highest in this window, so the agent is acting immediately.")

    # ---- discount policy: only offered when probability is marginal, never wasted on sure things ----
    discount_pct = 0.0
    if MED_PROB_THRESHOLD <= recovery_probability < HIGH_PROB_THRESHOLD:
        discount_pct = 5.0
        reasons.append("Recovery probability is moderate — a small 5% incentive is offered to tip the decision, rather than a larger unnecessary discount.")
    elif recovery_probability < MED_PROB_THRESHOLD and failure_reason != "insufficient_funds":
        discount_pct = min(MAX_DISCOUNT_PCT, 8.0)
        reasons.append("Recovery probability is low — a stronger incentive is offered, capped by the merchant's maximum discount policy.")
    discount_pct = min(discount_pct, MAX_DISCOUNT_PCT)

    # ---- action selection ----
    if failure_reason == "insufficient_funds" and recovery_probability < MED_PROB_THRESHOLD:
        action = "delay_and_retry"
        reasons.append("Scheduling a delayed retry (6–24h) instead of an immediate nudge, since insufficient-funds failures often resolve after a pay cycle.")
    elif recovery_probability < 0.20:
        action = "escalate_to_human"
        reasons.append("Recovery probability is very low — escalating to a human agent instead of spending an automated cycle on a low-yield case.")
    else:
        action = "generate_payment_link_and_notify"

    # ---- guardrail: high amount always needs human sign-off ----
    requires_human_approval = amount > MAX_AUTONOMOUS_AMOUNT
    if requires_human_approval:
        reasons.append(f"Amount (₹{amount:,.0f}) exceeds the ₹{MAX_AUTONOMOUS_AMOUNT:,.0f} autonomous-action limit — routed for human approval before execution.")

    # ---- priority score for queue ordering: probability * amount recoverable, boosted for high value ----
    priority_score = round(recovery_probability * amount * (1.3 if segment == "high_value" else 1.0), 2)

    return Decision(
        action=action,
        channel=channel,
        discount_pct=discount_pct,
        requires_human_approval=requires_human_approval,
        priority_score=priority_score,
        reasons=reasons,
    )
