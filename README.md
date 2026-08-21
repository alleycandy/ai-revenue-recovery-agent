# AI Revenue Recovery Agent

An autonomous fintech AI agent that detects failed and abandoned payments, predicts recovery probability, reasons about the best intervention, executes the recovery action, and monitors the outcome — built for **Razorpay AI Builder Internship 2026, Track 3: AI Revenue Recovery**.

This isn't a payment-failure dashboard with a chatbot bolted on. It's a full **observe → retrieve context → predict → reason → select tool → execute → verify → memory** agent loop, backed by a real trained ML model and an auditable, guardrailed decision engine — the same shape as Razorpay's own Agent Studio workflows (Subscription Recovery, Abandoned Cart Conversion, Cashflow Forecasting).

## Why this project, and why it's built this way

Failed payments are not fraud — they're mostly good customers hitting friction (a declined card, a UPI timeout, insufficient funds at that moment). Recovering them is a probability problem *and* a trust problem: contact the right customer, on the right channel, with the right incentive, at the right time — without annoying opted-out customers or handing an LLM the power to move money unsupervised.

That's why the architecture deliberately **separates the parts that decide from the parts that talk**:

- **ML model (XGBoost)** predicts *P(recovery)* from real transaction + customer signal.
- **Decision engine (deterministic Python)** turns that probability into an action, channel, and discount — with hard guardrails (autonomous-amount cap, discount cap, opt-out enforcement, human-approval routing). This is what should be audited and unit-tested, not prompt-engineered.
- **LLM / message layer** (currently templated, designed to be swapped for a real LLM call — see below) only personalizes the *words* sent to the customer. It never decides whether to act.

This split is a real answer to "how do you keep an autonomous agent safe in a payments company" — worth leading with in an interview.

## What's actually implemented and working end-to-end

| Layer | What it does | Tech |
|---|---|---|
| Synthetic dataset | 8,000 customers, 50,000 failed-payment events with **deliberate, realistic relationships** (method preference, time-decay, segment, prior recovery history) driving the recovery label — not random noise | `data/generate_dataset.py`, pandas/numpy |
| ML model | XGBoost classifier predicting recovery probability, trained/evaluated on a real 80/20 split | `backend/app/ml/train.py`, scikit-learn, xgboost |
| Decision engine | Rule + probability based action/channel/discount selection with guardrails | `backend/app/agents/decision_engine.py` |
| Agent orchestrator | Full 8-step agent loop, every step logged to DB as an auditable trace | `backend/app/agents/recovery_agent.py` |
| Tools | Mock Razorpay Payment Link creation, message generation, notification dispatch, human escalation | `backend/app/agents/tools.py` |
| API | FastAPI REST API: dashboard, recovery queue, case detail + agent trace, webhook simulation, ML metrics | `backend/app/main.py` |
| Database | SQLite (swap-in Postgres-ready via SQLAlchemy) with customers, transactions, recovery_cases, agent_actions, payment_links, messages | `backend/app/models/models.py` |
| Frontend | Live dashboard: KPIs, recovery queue, click-through agent reasoning trace, "simulate a live failure" demo button, channel/trend charts | `frontend/index.html` (vanilla JS, no build step) |

**Everything above runs live and was tested before delivery** — this README's metrics are the actual output of `train.py` on this repo's generated dataset, not invented numbers.

## Real model metrics (from `backend/app/ml/model_metrics.json`)

- **ROC-AUC: 0.744**
- Accuracy: 0.706 · Precision: 0.587 · Recall: 0.408 · F1: 0.481
- Base recovery rate in data: 33.5% (so accuracy alone is not the story — ROC-AUC is the honest metric here, per the model card)
- Top predictive features: `customer_opted_out`, `segment_new`, `failure_reason_insufficient_funds`, `method_matches_preference`, `is_subscription`

Retrain any time with `python train.py` in `backend/app/ml/` — it will print and save fresh metrics from your own data.

## Architecture

```
Razorpay / Mock Payment Events
            │
            ▼
   Webhook Receiver (FastAPI)
            │
            ▼
      RecoveryCase created
            │
            ▼
┌─────────────────────────────┐
│         AGENT LOOP          │
│  observe → retrieve context │
│  → predict (XGBoost)        │
│  → reason (decision engine) │
│  → select tool → execute    │
│  → verify → memory          │
└─────────────┬────────────────┘
              │
   ┌──────────┼───────────┐
   ▼          ▼           ▼
Payment Link  WhatsApp   Escalate
   │          Email      to human
   └──────────┼───────────┘
              ▼
        Outcome Monitor
              │
              ▼
        Agent Memory (customer's next
        interaction uses this history)
```

## Guardrails (the part worth emphasizing in an interview)

- Transactions above ₹10,000 always require human approval before the agent acts.
- Discounts are capped at 10% and are only offered when recovery probability is genuinely marginal — never on high-confidence or already-lost cases.
- Opted-out customers are never contacted; this is enforced in the decision engine, not the prompt.
- The LLM/message-generation layer cannot trigger payment links, discounts, or escalations — it only fills in words for a decision the deterministic engine already made.

## Running it locally

```bash
# 1. Generate the synthetic dataset (already included, but regenerate if you like)
cd data
python3 generate_dataset.py --n_customers 8000 --n_txns 50000

# 2. Install backend dependencies
cd ../backend
pip install -r requirements.txt

# 3. Train the model (already included as recovery_model.pkl, but retrain if you like)
cd app/ml
python3 train.py --data ../../../data/transactions.csv
cd ../../..

# 4. Seed the database
cd backend
python3 -m app.db.seed

# 5. Run the server (also serves the frontend at the same URL)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 6. Open http://localhost:8000 in your browser
```

Click **"Simulate live payment failure"** on the dashboard — it creates a real failed transaction for a random seeded customer and runs the full agent loop live, so you can watch the reasoning trace populate in real time. This is the 2-minute demo to run in your interview.

## What's mocked vs. what's real

Being upfront about this because it will come up:

- **Real**: dataset generation logic, ML training/evaluation, decision engine, guardrails, full agent orchestration, database, API, frontend.
- **Mocked (by design, no production credentials)**: Razorpay Payment Link creation (`agents/tools.py::create_payment_link`) and WhatsApp/email dispatch. Both are written with the exact same function signature Razorpay's actual Payment Link API expects, so swapping in `razorpay.Client().payment_link.create(...)` and a real WhatsApp Business API / SMTP call is a small, contained change — see `docs/razorpay-integration.md`.
- **Templated, LLM-ready**: customer message generation. It's currently a deterministic template (so the demo works with zero API keys), but it already receives the exact fields an LLM prompt would need (name, amount, preferred channel, discount). See `docs/agent-design.md` for the drop-in LLM integration point.

## Extending this

Natural next steps, roughly in order of impact:
1. Swap `tools.create_payment_link` for the real Razorpay Payment Links API in test mode, and add a real webhook receiver with signature verification.
2. Swap templated messages for a real LLM call (Claude/GPT), constrained to structured JSON output — never free-form tool execution.
3. Add `agent_memory` with `pgvector` for semantic retrieval of similar past cases ("customers like this one recovered best via X").
4. Add a merchant-facing settings screen to make the guardrail thresholds configurable, not hardcoded.
5. A/B test channel and discount strategy against a held-out control group and report lift, not just recovery rate.

## Project structure

```
ai-revenue-recovery-agent/
├── data/                    synthetic dataset generator + generated CSVs
├── backend/
│   └── app/
│       ├── ml/              feature engineering, training, inference
│       ├── agents/          decision engine, tools, agent orchestrator
│       ├── models/          SQLAlchemy ORM models
│       ├── db/               database engine + seed script
│       └── main.py          FastAPI app / all API routes
├── frontend/
│   └── index.html           dashboard (no build step, vanilla JS + Chart.js)
├── docs/
│   ├── agent-design.md
│   └── razorpay-integration.md
└── README.md
```
