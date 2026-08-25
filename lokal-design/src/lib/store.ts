import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PRODUCTS, getProduct, type Product } from "./catalog";
import {
  DEFAULT_POLICY,
  decideMandate,
  event,
  quoteCart,
  type AuditEvent,
  type CartLine,
  type Mandate,
  type Order,
  type Payment,
  type Policy,
  type Quote,
} from "./policy";
import { capturePayment, paymentAudit } from "./payments";
import { uid } from "./utils";

export type ChatRole = "buyer" | "munim" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
};

type EngineResult = {
  quote?: Quote;
  mandate?: Mandate;
  payment?: Payment;
  order?: Order;
  notes: string[];
};

type MunimState = {
  products: Product[];
  policy: Policy;
  cart: CartLine[];
  quote: Quote | null;
  mandate: Mandate | null;
  payment: Payment | null;
  orders: Order[];
  audit: AuditEvent[];
  messages: ChatMessage[];
  buyerName: string;
  setPolicy: (patch: Partial<Policy>) => void;
  setBuyerName: (name: string) => void;
  setCart: (cart: CartLine[]) => void;
  addLine: (sku: string, qty: number, note?: string) => EngineResult;
  removeLine: (sku: string) => void;
  clearCart: () => void;
  runQuote: () => EngineResult;
  requestMandate: (purpose: string) => EngineResult;
  approveMandate: (id: string) => EngineResult;
  capture: () => EngineResult;
  retryCapture: () => EngineResult;
  pushMessage: (role: ChatRole, text: string) => void;
  resetConversation: () => void;
  restock: () => void;
};

const SEED_ORDERS: Order[] = [
  {
    id: "ord-seed-1",
    cartId: "cart-seed-1",
    mandateId: "man-seed-1",
    paymentId: "pay_test_seed1",
    buyer: "Hotel Surya purchasing agent",
    lines: [
      { sku: "POH-THK-1", name: "Thick poha", qty: 4, unitPaise: 9500, gstPct: 5 },
      { sku: "TEA-CUT-250", name: "Cutting chai blend", qty: 2, unitPaise: 18000, gstPct: 5 },
    ],
    totalPaise: 79800,
    status: "paid",
    createdAt: Date.parse("2026-08-24T07:12:00+05:30"),
    note: "Breakfast for 18 rooms. Repeated from last Thursday.",
  },
  {
    id: "ord-seed-2",
    cartId: "cart-seed-2",
    mandateId: "man-seed-2",
    paymentId: "pay_test_seed2",
    buyer: "Iyer household agent",
    lines: [{ sku: "ATT-LOK-5", name: "Lokwan atta", qty: 1, unitPaise: 31000, gstPct: 5 }],
    totalPaise: 32550,
    status: "paid",
    createdAt: Date.parse("2026-08-25T11:05:00+05:30"),
    note: "The third-of-the-month atta.",
  },
];

const SEED_AUDIT: AuditEvent[] = [
  event("payment.capture", "Captured ₹798 for Hotel Surya purchasing agent", 79800, {
    paymentId: "pay_test_seed1",
    seed: true,
  }),
  event("payment.capture", "Captured ₹326 for Iyer household agent", 32550, {
    paymentId: "pay_test_seed2",
    seed: true,
  }),
];

function dailySpend(orders: Order[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return orders
    .filter((o) => o.status === "paid" && o.createdAt >= start.getTime())
    .reduce((s, o) => s + o.totalPaise, 0);
}

export const useMunim = create<MunimState>()(
  persist(
    (set, get) => ({
      products: PRODUCTS.map((p) => ({ ...p })),
      policy: { ...DEFAULT_POLICY },
      cart: [],
      quote: null,
      mandate: null,
      payment: null,
      orders: SEED_ORDERS,
      audit: SEED_AUDIT,
      messages: [],
      buyerName: "",
      setPolicy: (patch) => {
        set((s) => ({
          policy: { ...s.policy, ...patch },
          audit: [
            event("policy", "Wall rules updated from the gaddi", undefined, {
              keys: Object.keys(patch).join(","),
            }),
            ...s.audit,
          ],
        }));
      },
      setBuyerName: (buyerName) => set({ buyerName }),
      setCart: (cart) => set({ cart, quote: null, mandate: null, payment: null }),
      addLine: (sku, qty, note) => {
        const product = getProduct(sku);
        if (!product) return { notes: [`Unknown SKU ${sku}`] };
        const existing = get().cart.find((l) => l.sku === sku);
        const nextQty = (existing?.qty ?? 0) + qty;
        const line: CartLine = {
          sku,
          name: product.name,
          qty: nextQty,
          unitPaise: product.pricePaise,
          gstPct: product.gstPct,
          note,
        };
        const cart = existing
          ? get().cart.map((l) => (l.sku === sku ? line : l))
          : [...get().cart, line];
        set({ cart, quote: null, mandate: null, payment: null });
        return { notes: [`Added ${qty} × ${product.name}.`] };
      },
      removeLine: (sku) =>
        set((s) => ({
          cart: s.cart.filter((l) => l.sku !== sku),
          quote: null,
          mandate: null,
          payment: null,
        })),
      clearCart: () => set({ cart: [], quote: null, mandate: null, payment: null }),
      runQuote: () => {
        const s = get();
        const quote = quoteCart(s.cart, s.policy, dailySpend(s.orders), s.buyerName, s.products);
        const audit = event(
          "quote",
          quote.blockers.length
            ? `Quote blocked: ${quote.blockers[0]}`
            : `Quoted ${quote.totalPaise / 100} INR across ${quote.lines.length} lines`,
          quote.totalPaise,
          { blockers: quote.blockers.length, warnings: quote.warnings.length },
        );
        set({ quote, audit: [audit, ...s.audit] });
        return { quote, notes: [...quote.warnings, ...quote.blockers] };
      },
      requestMandate: (purpose) => {
        const s = get();
        const quote = s.quote ?? quoteCart(s.cart, s.policy, dailySpend(s.orders), s.buyerName, s.products);
        const { mandate, audit } = decideMandate(quote, s.policy, s.buyerName || "unnamed agent", purpose);
        set({ quote, mandate, audit: [audit, ...s.audit] });
        return { quote, mandate, notes: [audit.summary] };
      },
      approveMandate: (id) => {
        const s = get();
        if (!s.mandate || s.mandate.id !== id) return { notes: ["No such mandate."] };
        const mandate: Mandate = {
          ...s.mandate,
          status: "approved",
          reason: "Approved from the gaddi.",
        };
        const audit = event("mandate.approve", `Desk approved ${mandate.id}`, mandate.maxPaise, {
          mandateId: mandate.id,
        });
        set({ mandate, audit: [audit, ...s.audit] });
        return { mandate, notes: [audit.summary] };
      },
      capture: () => {
        const s = get();
        if (!s.mandate || !s.quote) return { notes: ["Nothing to capture. Quote and mandate first."] };
        const { payment, mandate } = capturePayment(s.mandate, s.quote.totalPaise, s.policy);
        const audit = paymentAudit(payment);
        const policy =
          s.policy.tripNextPayment && payment.status === "failed"
            ? { ...s.policy, tripNextPayment: false }
            : s.policy;

        if (payment.status === "captured") {
          const order: Order = {
            id: uid("ord"),
            cartId: s.mandate.cartId,
            mandateId: s.mandate.id,
            paymentId: payment.id,
            buyer: s.buyerName || "unnamed agent",
            lines: s.quote.lines,
            totalPaise: s.quote.totalPaise,
            status: "paid",
            createdAt: Date.now(),
          };
          const products = s.products.map((p) => {
            const line = s.quote?.lines.find((l) => l.sku === p.sku);
            if (!line) return p;
            return { ...p, stock: Math.max(0, p.stock - line.qty) };
          });
          set({
            payment,
            mandate,
            policy,
            orders: [order, ...s.orders],
            audit: [audit, ...s.audit],
            products,
            cart: [],
          });
          return { payment, mandate, order, notes: [audit.summary] };
        }

        set({ payment, mandate, policy, audit: [audit, ...s.audit] });
        return { payment, mandate, notes: [audit.summary] };
      },
      retryCapture: () => get().capture(),
      pushMessage: (role, text) =>
        set((s) => ({
          messages: [...s.messages, { id: uid("msg"), role, text, at: Date.now() }],
        })),
      resetConversation: () =>
        set({
          messages: [],
          cart: [],
          quote: null,
          mandate: null,
          payment: null,
          buyerName: "",
        }),
      restock: () => set({ products: PRODUCTS.map((p) => ({ ...p })) }),
    }),
    {
      name: "munim-rao-and-sons",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (s) => ({
        policy: s.policy,
        orders: s.orders,
        audit: s.audit.slice(0, 80),
        products: s.products,
      }),
    },
  ),
);

export function spendToday(orders: Order[]) {
  return dailySpend(orders);
}
