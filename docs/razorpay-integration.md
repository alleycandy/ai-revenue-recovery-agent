# Wiring up real Razorpay Test Mode

This project mocks two things so it runs with zero credentials: Payment Link
creation and webhook receipt. Both are written to be a small, contained swap.

## 1. Payment Links

Current mock (`backend/app/agents/tools.py`):

```python
def create_payment_link(amount, customer_name, description, expiry_hours=24):
    # returns a fake ref + short_url
```

Real version, using the `razorpay` Python SDK with Test Mode keys:

```python
import razorpay
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_payment_link(amount, customer_name, description, expiry_hours=24):
    link = client.payment_link.create({
        "amount": int(amount * 100),   # paise
        "currency": "INR",
        "description": description,
        "customer": {"name": customer_name},
        "notify": {"sms": True, "email": True},
        "expire_by": int((datetime.utcnow() + timedelta(hours=expiry_hours)).timestamp()),
    })
    return {
        "link_ref": link["id"],
        "short_url": link["short_url"],
        "amount": amount,
        "status": link["status"],
        "expires_at": datetime.utcfromtimestamp(link["expire_by"]),
    }
```

Never commit `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — load from environment
variables via `.env` (see `.env.example`).

## 2. Webhooks

Add a real receiver alongside the existing `/api/webhooks/simulate-failure`:

```python
import hmac, hashlib

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "invalid signature")

    payload = json.loads(body)
    event = payload["event"]
    if event == "payment.failed":
        # create Transaction + RecoveryCase, then run_agent(db, rc)
        ...
    elif event == "payment_link.paid":
        # find the matching RecoveryCase by link_ref, call simulate_outcome(db, rc, "recovered")
        ...
```

Important: verify the signature against the **raw request body**, before any
JSON parsing — Razorpay's docs are explicit about this, and it's a common bug.

For local development, Razorpay needs a publicly reachable URL, not `localhost`
— use `ngrok http 8000` and register the forwarded HTTPS URL as your webhook
endpoint in the Razorpay dashboard (Test Mode).

## 3. Events worth handling first

- `payment.failed` — creates a new recovery case
- `payment_link.paid` — marks a case recovered
- `payment_link.expired` / `payment_link.cancelled` — marks a case failed, can trigger a follow-up case
- `order.paid` — closes out any open recovery case for that order id
