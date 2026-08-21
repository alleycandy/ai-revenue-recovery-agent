"""
Central place to load configuration from environment variables / .env.

Nothing here is required to run the demo — every integration falls back to a
safe mock if its credentials are missing (see agents/tools.py). This keeps
`uvicorn app.main:app` working with zero setup, while making the real
integrations a matter of filling in `.env`, not changing code.
"""
import os
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
    # backend/.env  (two levels up from this file: app/config.py -> backend/)
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    # python-dotenv not installed — fine, real env vars (e.g. from the shell
    # or a deployment platform) still work, we just won't read a local .env file.
    pass


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


# ---- Razorpay ----
RAZORPAY_KEY_ID = _clean(os.getenv("RAZORPAY_KEY_ID"))
RAZORPAY_KEY_SECRET = _clean(os.getenv("RAZORPAY_KEY_SECRET"))
RAZORPAY_WEBHOOK_SECRET = _clean(os.getenv("RAZORPAY_WEBHOOK_SECRET"))

# ---- WhatsApp (Meta Cloud API) ----
# Create these in the Meta for Developers dashboard -> WhatsApp -> API Setup.
# WHATSAPP_ACCESS_TOKEN: temporary (24h) or permanent System User token
# WHATSAPP_PHONE_NUMBER_ID: the "Phone number ID" (NOT the phone number itself)
# WHATSAPP_BUSINESS_ACCOUNT_ID: optional, only needed for template management
WHATSAPP_ACCESS_TOKEN = _clean(os.getenv("WHATSAPP_ACCESS_TOKEN"))
WHATSAPP_PHONE_NUMBER_ID = _clean(os.getenv("WHATSAPP_PHONE_NUMBER_ID"))
WHATSAPP_BUSINESS_ACCOUNT_ID = _clean(os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID"))
WHATSAPP_API_VERSION = _clean(os.getenv("WHATSAPP_API_VERSION")) or "v20.0"

# Meta requires an approved message *template* for any message sent outside a
# customer-initiated 24h session window. Set this once you've created and had
# a template approved in the Meta dashboard. If unset, we send a free-form
# text message instead (only deliverable inside an open 24h session).
WHATSAPP_TEMPLATE_NAME = _clean(os.getenv("WHATSAPP_TEMPLATE_NAME"))
WHATSAPP_TEMPLATE_LANGUAGE = _clean(os.getenv("WHATSAPP_TEMPLATE_LANGUAGE")) or "en_US"

WHATSAPP_CONFIGURED = bool(WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID)

# ---- Anthropic (for the optional LLM message-generation upgrade) ----
ANTHROPIC_API_KEY = _clean(os.getenv("ANTHROPIC_API_KEY"))
