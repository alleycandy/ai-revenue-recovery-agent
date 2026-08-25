import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Receipt } from "@/components/receipt";
import { Button } from "@/components/ui/button";
import { askMunim, type AgentAction, type AgentTurn } from "@/lib/ai";
import { HOTEL_BREAKFAST } from "@/lib/demo-script";
import { useMunim } from "@/lib/store";
import { cn, formatInr } from "@/lib/utils";

export const Route = createFileRoute("/counter")({ component: CounterPage });

function CounterPage() {
  const {
    cart,
    quote,
    mandate,
    payment,
    messages,
    buyerName,
    policy,
    pushMessage,
    resetConversation,
    audit,
  } = useMunim();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  async function onSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setDraft("");
    setError(null);
    pushMessage("buyer", trimmed);
    setBusy(true);
    try {
      const state = useMunim.getState();
      const res = await askMunim({
        data: {
          messages: [...state.messages, { role: "buyer" as const, text: trimmed }].map((m) => ({
            role: m.role,
            text: m.text,
          })),
          cart: state.cart.map((l) => ({ sku: l.sku, qty: l.qty })),
          quoteTotalPaise: state.quote?.totalPaise ?? null,
          quoteBlockers: state.quote?.blockers ?? [],
          mandateStatus: state.mandate?.status ?? null,
          paymentStatus: state.payment?.status ?? null,
          lastEngineNotes: [],
          buyerName: state.buyerName,
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      applyTurn(res.turn);
    } catch {
      setError("The counter lost the line. Try the breakfast script — the book still works.");
    } finally {
      setBusy(false);
    }
  }

  async function playScript() {
    if (playing) return;
    resetConversation();
    setError(null);
    setPlaying(true);
    setBusy(true);
    for (const beat of HOTEL_BREAKFAST) {
      await wait(beat.wait);
      if (beat.who !== "system") {
        useMunim.getState().pushMessage(beat.who, beat.text);
      } else {
        useMunim.getState().pushMessage("system", beat.text);
      }
      if (beat.act) applyAction(beat.act);
    }
    setPlaying(false);
    setBusy(false);
  }

  const lastAudit = audit.slice(0, 6);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">The counter · East Street</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Speak like a buyer who never walks in.</h1>
        <p className="mt-4 max-w-xl text-ink-soft">
          You are a purchasing agent. Munim will match, disclose, quote from the book, and
          take a bounded payment. The model does not own the till.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={playScript} disabled={busy} variant="ink">
            {playing ? "Breakfast order running…" : "Run the hotel breakfast"}
          </Button>
          <Button
            variant="line"
            disabled={busy}
            onClick={() => {
              resetConversation();
              setError(null);
            }}
          >
            Clear the counter
          </Button>
          <Link to="/gaddi" className="inline-flex">
            <Button variant="ghost">Trip a payment on the gaddi</Button>
          </Link>
        </div>

        <div
          ref={scroller}
          className="mt-8 h-[min(28rem,55dvh)] overflow-y-auto rounded-[22px] bg-paper-2 p-4 sm:p-5"
        >
          {messages.length === 0 && !busy ? (
            <EmptyPrompts
              onPick={(t) => {
                setDraft(t);
                void onSend(t);
              }}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <figure
                  key={m.id}
                  className={cn("max-w-[36rem]", m.role === "buyer" && "ml-auto")}
                >
                  <blockquote
                    className={cn(
                      "rounded-[18px] px-4 py-3 text-[15px] leading-snug",
                      m.role === "buyer" && "rounded-br-md bg-ink text-paper",
                      m.role === "munim" && "rounded-bl-md bg-receipt text-ink shadow-[var(--shadow-page)]",
                      m.role === "system" && "rounded-md bg-transparent px-0 font-mono text-xs text-muted",
                    )}
                  >
                    {m.text}
                  </blockquote>
                  {m.role !== "system" ? (
                    <figcaption className="mt-1 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      {m.role === "buyer" ? buyerName || "Purchasing agent" : "Munim"}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
              {busy ? (
                <p className="font-mono text-xs text-muted">Munim is looking at the shelf…</p>
              ) : null}
            </div>
          )}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSend(draft);
          }}
        >
          <label className="sr-only" htmlFor="buyer-line">
            Message to Munim
          </label>
          <input
            id="buyer-line"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="8 kg thick poha, stay under two thousand…"
            className="h-12 min-w-0 flex-1 rounded-[12px] bg-receipt px-4 text-ink shadow-[0_0_0_1px_var(--color-line)] placeholder:text-faint focus:outline-none focus:shadow-[0_0_0_2px_var(--color-tide)]"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !draft.trim()} size="lg">
            Send
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-stamp">{error}</p> : null}
        <p className="mt-3 text-xs text-muted">
          Auto-approve below {formatInr(policy.autoApproveBelowPaise)}. Shop cap{" "}
          {formatInr(policy.maxOrderPaise)}. One retry.
        </p>
      </section>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Receipt
          lines={cart}
          quote={quote}
          mandate={mandate}
          payment={payment}
          buyer={buyerName}
          className="rounded-[4px]"
        />
        <div className="rounded-[16px] bg-ink px-4 py-3 text-paper">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Audit tape</p>
          <ul className="mt-2 space-y-1.5 font-mono text-[11px] leading-snug text-paper-2">
            {lastAudit.length === 0 ? (
              <li>Nothing written yet.</li>
            ) : (
              lastAudit.map((a) => (
                <li key={a.id}>
                  <span className="text-faint">{a.kind}</span> · {a.summary}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}

function EmptyPrompts({ onPick }: { onPick: (t: string) => void }) {
  const prompts = [
    "Hotel Surya. 8kg thick poha, 2L coconut oil, 1kg cutting chai. Under ₹2000.",
    "Iyer household. The usual 5kg Lokwan atta, and a jar of the May mango pickle.",
    "Canteen order: 20kg sona masoori, 10L groundnut oil. We can go to ₹8,000.",
  ];
  return (
    <div>
      <p className="font-display text-xl">The stool is empty.</p>
      <p className="mt-2 max-w-md text-sm text-muted">
        Try a line, or run the breakfast script — a recorded morning that uses the same till.
      </p>
      <ul className="mt-5 space-y-2">
        {prompts.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onPick(p)}
              className="w-full rounded-[14px] bg-receipt px-4 py-3 text-left text-sm text-ink-soft shadow-[0_0_0_1px_var(--color-line)] transition-colors hover:bg-paper"
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function applyTurn(turn: AgentTurn) {
  const s = useMunim.getState();
  if (turn.buyer_name) s.setBuyerName(turn.buyer_name);
  for (const action of turn.actions) applyAction(action);
  s.pushMessage("munim", turn.say);
}

function applyAction(action: AgentAction | NonNullable<(typeof HOTEL_BREAKFAST)[number]["act"]>) {
  const s = useMunim.getState();
  if (action.op === "buyerName") {
    s.setBuyerName(action.name);
    return;
  }
  if (action.op === "add") s.addLine(action.sku, action.qty, action.note);
  if (action.op === "remove") s.removeLine(action.sku);
  if (action.op === "clear") s.clearCart();
  if (action.op === "quote") s.runQuote();
  if (action.op === "mandate") s.requestMandate(action.purpose);
  if (action.op === "capture" || action.op === "retry") s.capture();
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
