"""
Agent tools. These are the ONLY things the agent is allowed to call — no free-form
execution. In this project they are mocked (no real Razorpay keys), but the
create_payment_link() signature matches Razorpay's Payment Link API shape closely
enough that swapping in real `razorpay.Client().payment_link.create(...)` calls
is a drop-in change (see docs/razorpay-integration.md).
"""
import random
import string
import uuid
import logging
from datetime import datetime, timedelta

import requests

from app import config

logger = logging.getLogger("recovery_agent.tools")


def create_payment_link(amount: float, customer_name: str, description: str, expiry_hours: int = 24) -> dict:
    ref = "plink_" + "".join(random.choices(string.ascii_letters + string.digits, k=14))
    short_url = f"https://rzp.io/l/{ref[-8:]}"
    return {
        "link_ref": ref,
        "short_url": short_url,
        "amount": amount,
        "status": "created",
        "expires_at": datetime.utcnow() + timedelta(hours=expiry_hours),
    }


def generate_message(channel: str, customer_name: str, amount: float, preferred_method: str,
                      short_url: str, discount_pct: float = 0.0) -> str:
    """
    Templated, structured message generation. In production this call is replaced by
    an LLM call constrained to structured output (see docs/agent-design.md §"LLM boundary"),
    but the template already reflects the same personalization fields an LLM would use:
    name, amount, preferred method, and any discount incentive.
    """
    first_name = customer_name.split(" ")[0] if customer_name else "there"
    discount_line = f" As a thank-you, here's {discount_pct:.0f}% off if you complete it in the next few hours." if discount_pct else ""
    amount_txt = f"₹{amount:,.0f}"

    if channel == "whatsapp":
        return (f"Hi {first_name}, your {amount_txt} payment didn't go through. "
                f"Since you usually pay via {preferred_method.upper()}, we've created a fresh secure link for you: "
                f"{short_url}{discount_line}")
    if channel == "email":
        return (f"Hi {first_name},\n\nYour recent payment of {amount_txt} could not be completed. "
                f"You can finish it securely here: {short_url}{discount_line}\n\n— Team")
    if channel == "payment_link":
        return f"Payment link generated for {amount_txt}: {short_url}{discount_line}"
    return f"Reminder: complete your {amount_txt} payment here: {short_url}{discount_line}"


def send_notification(channel: str, message: str, phone: str = None, customer_name: str = None) -> dict:
    """
    Dispatch a notification on the given channel.

    - "whatsapp": sends via the real Meta WhatsApp Cloud API if WHATSAPP_ACCESS_TOKEN
      and WHATSAPP_PHONE_NUMBER_ID are configured (see .env.example / docs/whatsapp-integration.md).
      Falls back to a mock "sent" log if credentials are missing, `phone` is missing,
      or the API call fails — the agent loop never breaks because a notification failed.
    - all other channels ("email", etc.): still mocked, same as before.
    """
    if channel == "whatsapp":
        return _send_whatsapp(phone=phone, message=message, customer_name=customer_name)

    # Mock dispatch for non-WhatsApp channels — logs as sent.
    return {"channel": channel, "status": "sent", "sent_at": datetime.utcnow(), "message": message}


def _send_whatsapp(phone: str, message: str, customer_name: str = None) -> dict:
    """
    Real dispatch via the Meta WhatsApp Cloud API (graph.facebook.com).

    Two send modes, chosen automatically:
      - Template message (WHATSAPP_TEMPLATE_NAME set): required if there is no
        open 24h customer-service session — this is the mode you want for
        proactive payment-recovery pings.
      - Free-form text message (no template configured): only deliverable if
        the customer has messaged your WhatsApp number in the last 24 hours.
        Good enough for local testing against your own phone once you've
        messaged the test number once.
    """
    if not config.WHATSAPP_CONFIGURED:
        logger.info("WhatsApp not configured (missing WHATSAPP_ACCESS_TOKEN / "
                     "WHATSAPP_PHONE_NUMBER_ID) — mocking send instead.")
        return {
            "channel": "whatsapp", "status": "sent_mock", "sent_at": datetime.utcnow(),
            "message": message, "note": "WhatsApp credentials not configured — see .env.example",
        }

    if not phone:
        logger.warning("No customer phone number on file — cannot send WhatsApp message.")
        return {
            "channel": "whatsapp", "status": "failed", "sent_at": datetime.utcnow(),
            "message": message, "error": "missing_customer_phone",
        }

    to_number = phone.lstrip("+").replace(" ", "").replace("-", "")
    url = f"https://graph.facebook.com/{config.WHATSAPP_API_VERSION}/{config.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    if config.WHATSAPP_TEMPLATE_NAME:
        # Template mode — safest for proactive outreach. The template must already
        # be approved in the Meta dashboard with matching {{1}}, {{2}}... placeholders.
        first_name = (customer_name or "there").split(" ")[0]
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "template",
            "template": {
                "name": config.WHATSAPP_TEMPLATE_NAME,
                "language": {"code": config.WHATSAPP_TEMPLATE_LANGUAGE},
                "components": [{
                    "type": "body",
                    "parameters": [{"type": "text", "text": first_name},
                                   {"type": "text", "text": message}],
                }],
            },
        }
    else:
        # Free-form text — only works inside an open 24h session window.
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"body": message, "preview_url": True},
        }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        data = resp.json()
        if resp.status_code >= 400:
            error = data.get("error", {})
            logger.error("WhatsApp send failed (%s): %s", resp.status_code, error.get("message"))
            return {
                "channel": "whatsapp", "status": "failed", "sent_at": datetime.utcnow(),
                "message": message, "error": error.get("message", "unknown_error"),
                "error_code": error.get("code"),
            }
        wa_message_id = data.get("messages", [{}])[0].get("id")
        return {
            "channel": "whatsapp", "status": "sent", "sent_at": datetime.utcnow(),
            "message": message, "wa_message_id": wa_message_id, "to": to_number,
        }
    except requests.RequestException as e:
        logger.exception("WhatsApp API request error")
        return {
            "channel": "whatsapp", "status": "failed", "sent_at": datetime.utcnow(),
            "message": message, "error": str(e),
        }


def escalate_to_human(reason: str) -> dict:
    return {"status": "escalated", "reason": reason, "ticket_id": f"ESC-{uuid.uuid4().hex[:8].upper()}"}
