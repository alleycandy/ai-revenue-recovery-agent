# Agent design notes

## Why the decision engine is not an LLM

An agent that can generate payment links, apply discounts, and message customers is
an agent that can move money and shape customer trust. In a payments company, the
component that decides *whether and how much* must be:

- **Deterministic** — same inputs always produce the same decision, so it can be unit tested.
- **Auditable** — every decision traces back to explicit, readable rules (see `decision_engine.py`), not a prompt that might drift between model versions.
- **Bounded** — hard caps (max autonomous amount, max discount, opt-out enforcement) that no prompt injection or edge-case input can override, because they're plain Python `if` statements evaluated after the model runs, not instructions the model is asked to follow.

So the split is:

```
ML model            → probability (a number, nothing more)
Decision engine      → action + channel + discount + approval requirement
LLM (optional)       → the words of the customer message, and a human-readable
                        explanation — never a new action
```

## The LLM boundary — where a real LLM call plugs in

`agents/tools.py::generate_message()` is currently a template. To swap in a real LLM:

```python
def generate_message(channel, customer_name, amount, preferred_method, short_url, discount_pct):
    system = (
        "You write short, warm payment-recovery messages. "
        "Return ONLY the message body, no preamble. "
        "Never invent a link, amount, or discount not given to you."
    )
    user = (
        f"Channel: {channel}\nCustomer first name: {customer_name.split()[0]}\n"
        f"Amount: INR {amount}\nPreferred method: {preferred_method}\n"
        f"Payment link: {short_url}\nDiscount: {discount_pct}%"
    )
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text
```

The important part isn't the API call — it's that the LLM is given **only the fields
the decision engine already approved** (amount, link, discount are all pre-computed),
so there's no path for the LLM to hallucinate a different discount or a fake link.

## The 8-step loop, mapped to code

| Step | What happens | Function |
|---|---|---|
| Observe | Failed payment event lands | `run_agent()` step 1 |
| Retrieve context | Customer history pulled from DB | `run_agent()` step 2 |
| Predict | XGBoost model scores recovery probability | `predict_recovery_probability()` |
| Reason | Decision engine picks action/channel/discount | `decide()` |
| Select tool | (part of `decide()` — action name maps 1:1 to a tool) | — |
| Execute | Payment link created, message sent, or escalated | `execute_decision()` |
| Verify | Outcome recorded (simulated in this build) | `simulate_outcome()` |
| Memory | Customer's recovery-success counters updated for next time | `simulate_outcome()` |

Every step writes an `AgentAction` row — that's what powers the live trace in the frontend, and it's a real execution log, not a scripted animation.

## Evaluating the agent, not just the model

The ML model has a ROC-AUC; the *agent* needs its own evaluation, separate from
model accuracy — e.g. build a labeled set of ~100 scenarios (opted-out customer,
very-high-amount transaction, repeat failure, low-probability case) and check:

- Did it correctly skip the opted-out customer?
- Did it correctly route the high-amount case to human approval?
- Did it avoid offering a discount on a case that didn't need one?

This is a stronger interview answer than "the model has 74% AUC" — it shows you
think about agent *safety*, not just model *accuracy*.
