# Wiring up real WhatsApp notifications (Meta Cloud API)

The agent's `whatsapp` channel now sends real messages through Meta's
**WhatsApp Business Cloud API** when credentials are configured, and falls
back to a mock "sent" log otherwise — so the demo still runs with zero setup
if you don't need real messages.

Code lives in `backend/app/agents/tools.py::_send_whatsapp` and is called
from `send_notification()`. Config is read in `backend/app/config.py`.

## 1. Get credentials (free, ~10 minutes)

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App** → type **Business**.
2. Add the **WhatsApp** product to the app.
3. Under **WhatsApp → API Setup** you'll see:
   - A **temporary access token** (valid 24h — fine for testing, see step 4 for a permanent one).
   - A **Phone number ID** (this is what `WHATSAPP_PHONE_NUMBER_ID` needs — not the phone number itself).
   - A **test number** you can send to for free, plus a button to add your own phone as a recipient.
4. For a token that doesn't expire every 24h: **Business Settings → Users → System Users** → create a system user → generate a token with `whatsapp_business_messaging` permission.

## 2. Fill in `.env`

Copy `.env.example` to `.env` in the project root and fill in:

```
WHATSAPP_ACCESS_TOKEN=<your token>
WHATSAPP_PHONE_NUMBER_ID=<your phone number id>
```

That's it for basic testing — `WHATSAPP_CONFIGURED` in `config.py` flips to
`True` and the agent will start making real API calls instead of mocking.

## 3. Two ways messages get sent

WhatsApp only allows **free-form text** messages if the customer has
messaged your business number within the last 24 hours (an "open session").
For proactive outreach like payment recovery — where the customer hasn't
messaged you first — Meta requires an **approved message template**.

- **No template configured (`WHATSAPP_TEMPLATE_NAME` blank):** the agent sends
  free-form text. Good for local testing: message the test number from your
  own WhatsApp once, then trigger a recovery case for a customer whose phone
  you've set to your own number in the seed data.
- **Template configured:** the agent sends a template message with the
  customer's first name and the recovery message as parameters. This works
  proactively, any time, which is what you want in production.

### Creating a template

1. **WhatsApp Manager → Message Templates → Create Template**.
2. Category: **Utility** (payment reminders fit this, not "Marketing").
3. Body, e.g.:
   ```
   Hi {{1}}, {{2}}
   ```
   (`{{1}}` = first name, `{{2}}` = the full personalized recovery message —
   matches the two parameters `_send_whatsapp()` sends. Adjust both the
   template body and the code's `parameters` list together if you want a
   richer, multi-field template instead.)
4. Submit for review — usually approved within minutes to a few hours.
5. Set `WHATSAPP_TEMPLATE_NAME=<your_template_name>` in `.env`.

## 4. Testing it

With `.env` filled in:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Click **"Simulate live payment failure"** on the dashboard for a customer
whose `phone` you've pointed at your own WhatsApp number (edit a row in
`data/customers.csv` or the seeded DB), and watch for the `notification_sent`
step in the agent trace — its `detail` will show `"status": "sent"` and a
real `wa_message_id` from Meta, instead of `"status": "sent_mock"`.

## 5. Failure handling

`_send_whatsapp()` never raises — a failed WhatsApp call (bad token, phone
not on WhatsApp, template not approved, etc.) returns
`{"status": "failed", "error": "..."}` instead of throwing, so a notification
failure never breaks the agent loop or leaves a `RecoveryCase` stuck mid-way.
Check `agent_actions.detail` for the `notification_sent` step to see the raw
Meta error message if delivery ever fails silently in the UI.

## 6. Costs

WhatsApp Business conversations are billed per-conversation (not per-message)
after a monthly free tier (currently 1,000 conversations/month across all
your numbers — check Meta's current pricing page, this changes). Fine for a
hackathon demo; worth knowing before wiring this into real customer volume.
