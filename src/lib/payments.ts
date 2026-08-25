import { event, type Mandate, type Payment, type Policy } from "./policy";
import { uid } from "./utils";

/**
 * Razorpay-shaped test-mode adapter.
 * Money never leaves this process. The object graph matches what a
 * `payments.create` + `orders.create` call returns in test mode so a
 * live key can be dropped in later without rewriting the desk.
 */
export function capturePayment(
  mandate: Mandate,
  amountPaise: number,
  policy: Policy,
): { payment: Payment; mandate: Mandate } {
  if (mandate.status !== "approved" && mandate.status !== "failed") {
    const payment = makePayment(mandate, amountPaise, "failed", "mandate_not_approved", "Mandate is not approved.");
    return { payment, mandate: { ...mandate, status: "blocked", reason: payment.failureMessage } };
  }
  if (Date.now() > mandate.expiresAt) {
    const payment = makePayment(mandate, amountPaise, "failed", "mandate_expired", "Mandate expired. Ask again.");
    return { payment, mandate: { ...mandate, status: "expired", reason: payment.failureMessage } };
  }
  if (amountPaise > mandate.maxPaise) {
    const payment = makePayment(
      mandate,
      amountPaise,
      "failed",
      "over_bound",
      `Capture ${amountPaise} exceeds mandate bound ${mandate.maxPaise}.`,
    );
    return { payment, mandate: { ...mandate, status: "blocked", reason: payment.failureMessage } };
  }
  if (mandate.retries >= policy.maxPaymentRetries && mandate.status === "failed") {
    const payment = makePayment(
      mandate,
      amountPaise,
      "failed",
      "retry_exhausted",
      "One retry already used. Stopping. The bag stays on the counter.",
    );
    return { payment, mandate: { ...mandate, status: "failed", reason: payment.failureMessage } };
  }

  if (policy.tripNextPayment) {
    const payment = makePayment(
      mandate,
      amountPaise,
      "failed",
      "BAD_REQUEST_ERROR:gateway_error",
      "UPI collect expired at the issuer. The shop does not hammer the customer.",
    );
    return {
      payment,
      mandate: {
        ...mandate,
        status: "failed",
        retries: mandate.retries + 1,
        reason: payment.failureMessage,
      },
    };
  }

  const payment = makePayment(mandate, amountPaise, "captured");
  return {
    payment,
    mandate: { ...mandate, status: "captured", reason: "Captured in test mode." },
  };
}

function makePayment(
  mandate: Mandate,
  amountPaise: number,
  status: Payment["status"],
  failureCode?: string,
  failureMessage?: string,
): Payment {
  return {
    id: `pay_test_${uid("rzp").replace(/-/g, "")}`,
    mandateId: mandate.id,
    amountPaise,
    method: "agent_mandate",
    status,
    failureCode,
    failureMessage,
    createdAt: Date.now(),
    razorpayShape: {
      entity: "payment",
      currency: "INR",
      notes: {
        mandate_id: mandate.id,
        buyer: mandate.buyer,
        purpose: mandate.purpose,
        merchant: "Rao & Sons",
      },
    },
  };
}

export function paymentAudit(payment: Payment) {
  if (payment.status === "captured") {
    return event("payment.capture", `Captured ${payment.amountPaise / 100} INR via agent mandate`, payment.amountPaise, {
      paymentId: payment.id,
      mandateId: payment.mandateId,
      method: payment.method,
    });
  }
  return event("payment.fail", payment.failureMessage ?? "Payment failed", payment.amountPaise, {
    paymentId: payment.id,
    mandateId: payment.mandateId,
    code: payment.failureCode ?? "unknown",
  });
}
