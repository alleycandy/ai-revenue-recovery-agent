import { getProduct, type Category, type Product } from "./catalog";

import { uid } from "./utils";

export type Policy = {
  maxOrderPaise: number;
  autoApproveBelowPaise: number;
  dailyCapPaise: number;
  blockedCategories: Category[];
  allowCredit: boolean;
  maxPaymentRetries: number;
  holdMinutes: number;
  requireNamedBuyer: boolean;
  tripNextPayment: boolean;
};

export const DEFAULT_POLICY: Policy = {
  maxOrderPaise: 500000, // ₹5,000
  autoApproveBelowPaise: 250000, // ₹2,500
  dailyCapPaise: 2000000, // ₹20,000
  blockedCategories: [],
  allowCredit: false,
  maxPaymentRetries: 1,
  holdMinutes: 20,
  requireNamedBuyer: true,
  tripNextPayment: false,
};

export type CartLine = {
  sku: string;
  name: string;
  qty: number;
  unitPaise: number;
  gstPct: number;
  note?: string;
};

export type Quote = {
  lines: CartLine[];
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  warnings: string[];
  blockers: string[];
};

export type MandateStatus =
  | "requested"
  | "approved"
  | "captured"
  | "failed"
  | "expired"
  | "blocked"
  | "held";

export type Mandate = {
  id: string;
  cartId: string;
  maxPaise: number;
  purpose: string;
  buyer: string;
  buyerKind: "agent" | "human";
  createdAt: number;
  expiresAt: number;
  status: MandateStatus;
  reason?: string;
  retries: number;
};

export type Payment = {
  id: string;
  mandateId: string;
  amountPaise: number;
  method: "upi" | "agent_mandate";
  status: "created" | "captured" | "failed";
  failureCode?: string;
  failureMessage?: string;
  createdAt: number;
  razorpayShape: {
    entity: "payment";
    currency: "INR";
    notes: Record<string, string>;
  };
};

export type Order = {
  id: string;
  cartId: string;
  mandateId: string;
  paymentId?: string;
  buyer: string;
  lines: CartLine[];
  totalPaise: number;
  status: "quoted" | "mandated" | "paid" | "failed" | "held";
  createdAt: number;
  note?: string;
};

export type AuditKind =
  | "quote"
  | "mandate.request"
  | "mandate.approve"
  | "mandate.block"
  | "payment.capture"
  | "payment.fail"
  | "exception"
  | "substitution"
  | "policy";

export type AuditEvent = {
  id: string;
  at: number;
  kind: AuditKind;
  summary: string;
  moneyPaise?: number;
  detail: Record<string, string | number | boolean | null>;
};

export function quoteCart(
  lines: CartLine[],
  policy: Policy,
  dailySpendPaise: number,
  buyer: string,
  products?: Product[],
): Quote {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const lookup = (sku: string) => products?.find((p) => p.sku === sku) ?? getProduct(sku);

  const hydrated: CartLine[] = [];
  for (const line of lines) {
    const product = lookup(line.sku);
    if (!product) {
      blockers.push(`Unknown SKU ${line.sku}.`);
      continue;
    }
    if (line.qty <= 0) {
      blockers.push(`${product.name}: quantity must be at least 1.`);
      continue;
    }
    if (line.qty > product.stock) {
      blockers.push(
        `${product.name}: asked for ${line.qty} ${product.packUnit}, only ${product.stock} on the shelf.`,
      );
    }
    if (policy.blockedCategories.includes(product.category)) {
      blockers.push(`${product.name} is in a blocked category (${product.category}).`);
    }
    if (line.unitPaise !== product.pricePaise) {
      warnings.push(
        `${product.name}: quoted ${line.unitPaise / 100} but the book says ${product.pricePaise / 100}. Using the book.`,
      );
    }
    hydrated.push({
      ...line,
      name: product.name,
      unitPaise: product.pricePaise,
      gstPct: product.gstPct,
    });
  }

  const subtotalPaise = hydrated.reduce((s, l) => s + l.unitPaise * l.qty, 0);
  const gstPaise = hydrated.reduce(
    (s, l) => s + Math.round((l.unitPaise * l.qty * l.gstPct) / (100 + l.gstPct)),
    0,
  );
  const totalPaise = subtotalPaise;

  if (!buyer.trim() && policy.requireNamedBuyer) {
    blockers.push("A named buyer is required. Agents must identify the principal.");
  }
  if (totalPaise > policy.maxOrderPaise) {
    blockers.push(
      `Order ${inr(totalPaise)} is over the shop cap of ${inr(policy.maxOrderPaise)}. Split it or come to the counter.`,
    );
  }
  if (dailySpendPaise + totalPaise > policy.dailyCapPaise) {
    blockers.push(
      `This would take today's agent take to ${inr(dailySpendPaise + totalPaise)}, over the daily cap of ${inr(policy.dailyCapPaise)}.`,
    );
  }
  if (policy.allowCredit === false) {
    warnings.push("No credit. Payment is captured before the bag leaves.");
  }

  return { lines: hydrated, subtotalPaise, gstPaise, totalPaise, warnings, blockers };
}

export function decideMandate(
  quote: Quote,
  policy: Policy,
  buyer: string,
  purpose: string,
): { mandate: Mandate; audit: AuditEvent } {
  const now = Date.now();
  const cartId = uid("cart");
  const base: Mandate = {
    id: uid("man"),
    cartId,
    maxPaise: quote.totalPaise,
    purpose,
    buyer,
    buyerKind: "agent",
    createdAt: now,
    expiresAt: now + policy.holdMinutes * 60_000,
    status: "requested",
    retries: 0,
  };

  if (quote.blockers.length > 0) {
    const mandate: Mandate = {
      ...base,
      status: "blocked",
      reason: quote.blockers[0],
    };
    return {
      mandate,
      audit: event("mandate.block", mandate.reason ?? "Blocked", quote.totalPaise, {
        mandateId: mandate.id,
        buyer,
      }),
    };
  }

  if (quote.totalPaise <= policy.autoApproveBelowPaise) {
    const mandate: Mandate = { ...base, status: "approved", reason: "Within auto-approve bound." };
    return {
      mandate,
      audit: event("mandate.approve", `Auto-approved ${inr(quote.totalPaise)} for ${buyer}`, quote.totalPaise, {
        mandateId: mandate.id,
        bound: policy.autoApproveBelowPaise,
      }),
    };
  }

  const mandate: Mandate = {
    ...base,
    status: "held",
    reason: `Over auto-approve (${inr(policy.autoApproveBelowPaise)}). Waiting on the gaddi.`,
  };
  return {
    mandate,
    audit: event("mandate.request", mandate.reason ?? "Held for the desk", quote.totalPaise, {
      mandateId: mandate.id,
      buyer,
    }),
  };
}

function inr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function event(
  kind: AuditKind,
  summary: string,
  moneyPaise: number | undefined,
  detail: AuditEvent["detail"],
): AuditEvent {
  return {
    id: uid("aud"),
    at: Date.now(),
    kind,
    summary,
    moneyPaise,
    detail,
  };
}
