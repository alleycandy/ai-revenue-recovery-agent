import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, MERCHANT } from "@/lib/catalog";
import { useMunim, spendToday } from "@/lib/store";
import { cn, formatClock, formatInr } from "@/lib/utils";

export const Route = createFileRoute("/gaddi")({ component: GaddiPage });

const TABS = ["Ledger", "Wall rules", "Book"] as const;

function GaddiPage() {
  const { products, orders, policy, setPolicy, audit, mandate, approveMandate, restock } =
    useMunim();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Ledger");
  const take = spendToday(orders);
  const paid = orders.filter((o) => o.status === "paid");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">The gaddi · {MERCHANT.address}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Where the book is kept.</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Kulkarni sat here with a red ledger and a glass of cutting. You sit here with the same
        job: watch the till, change the wall rules, and say no when an agent gets greedy.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat k="Today's agent take" v={formatInr(take)} />
        <Stat k="Paid chits" v={String(paid.length)} />
        <Stat k="SKUs on the shelf" v={String(products.length)} />
        <Stat
          k="Pending mandate"
          v={mandate?.status === "held" ? formatInr(mandate.maxPaise) : "None"}
        />
      </dl>

      {mandate?.status === "held" ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-ink px-4 py-3 text-paper">
          <p className="text-sm">
            {mandate.buyer} wants {formatInr(mandate.maxPaise)} · {mandate.purpose}
          </p>
          <Button variant="night" size="sm" onClick={() => approveMandate(mandate.id)}>
            Approve from the gaddi
          </Button>
        </div>
      ) : null}

      <div className="mt-8 flex gap-1 rounded-[12px] bg-paper-2 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "h-10 flex-1 rounded-[10px] text-sm transition-colors",
              tab === t ? "bg-receipt text-ink shadow-[var(--shadow-page)]" : "text-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ledger" ? <Ledger /> : null}
      {tab === "Wall rules" ? (
        <Wall
          policy={policy}
          setPolicy={setPolicy}
          restock={restock}
        />
      ) : null}
      {tab === "Book" ? (
        <Book audit={audit} orders={orders} />
      ) : null}
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[16px] bg-paper-2 px-4 py-4">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums tracking-tight">{v}</dd>
    </div>
  );
}

function Ledger() {
  const products = useMunim((s) => s.products);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        !n ||
        p.name.toLowerCase().includes(n) ||
        p.sku.toLowerCase().includes(n) ||
        p.aliases.some((a) => a.includes(n)),
    );
  }, [products, q]);

  return (
    <div className="mt-6">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a sack, a tin, a jar…"
        className="h-11 w-full max-w-md rounded-[10px] bg-receipt px-3 text-sm shadow-[0_0_0_1px_var(--color-line)] placeholder:text-faint focus:outline-none focus:shadow-[0_0_0_2px_var(--color-tide)]"
      />
      <div className="mt-4 overflow-x-auto rounded-[16px] bg-receipt shadow-[var(--shadow-page)]">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Shelf</th>
              <th className="px-4 py-3 font-medium">Book</th>
              <th className="px-4 py-3 font-medium">Origin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.sku} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">
                  <span className="block">{p.name}</span>
                  <span className="text-xs text-muted">
                    {CATEGORY_LABEL[p.category]} · {p.unit}
                  </span>
                </td>
                <td className={cn("px-4 py-3 tabular-nums", p.stock <= 8 && "text-stamp")}>
                  {p.stock}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatInr(p.pricePaise)}</td>
                <td className="px-4 py-3 text-muted">{p.origin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Wall({
  policy,
  setPolicy,
  restock,
}: {
  policy: ReturnType<typeof useMunim.getState>["policy"];
  setPolicy: ReturnType<typeof useMunim.getState>["setPolicy"];
  restock: () => void;
}) {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <NumberRule
          label="Shop cap"
          hint="Nothing above this, even with a named buyer."
          rupees={policy.maxOrderPaise / 100}
          min={500}
          max={20000}
          onChange={(n) => setPolicy({ maxOrderPaise: n * 100 })}
        />
        <NumberRule
          label="Auto-approve below"
          hint="The gaddi sleeps under this line."
          rupees={policy.autoApproveBelowPaise / 100}
          min={0}
          max={10000}
          onChange={(n) => setPolicy({ autoApproveBelowPaise: n * 100 })}
        />
        <NumberRule
          label="Daily agent cap"
          hint="All captured agent money today, together."
          rupees={policy.dailyCapPaise / 100}
          min={2000}
          max={100000}
          onChange={(n) => setPolicy({ dailyCapPaise: n * 100 })}
        />
      </div>
      <div className="rounded-[22px] bg-ink p-6 text-paper">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Demo levers</p>
        <h2 className="mt-2 font-display text-3xl">Make it fail.</h2>
        <p className="mt-3 text-sm text-paper-2">
          The track bar asks for one failure, handled. This switch expires the next UPI collect
          at the issuer. Munim retries once, then stops. The bag stays.
        </p>
        <button
          type="button"
          onClick={() => setPolicy({ tripNextPayment: !policy.tripNextPayment })}
          className={cn(
            "mt-6 flex h-12 w-full items-center justify-between rounded-[12px] px-4 text-sm",
            policy.tripNextPayment ? "bg-stamp text-paper" : "bg-night-line text-paper",
          )}
        >
          <span>Trip the next payment</span>
          <span className="font-mono text-xs">{policy.tripNextPayment ? "ARMED" : "off"}</span>
        </button>
        <Button variant="night" className="mt-4 w-full" onClick={restock}>
          Restock the shelf from the book
        </Button>
        <p className="mt-4 text-xs text-faint">
          Credit is off. Named buyers are on. Max retries: {policy.maxPaymentRetries}. Hold:{" "}
          {policy.holdMinutes} minutes.
        </p>
      </div>
    </div>
  );
}

function NumberRule({
  label,
  hint,
  rupees,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  rupees: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block border-t border-line pt-4">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-display text-2xl">{label}</span>
        <span className="font-mono text-sm tabular-nums">{formatInr(rupees * 100)}</span>
      </span>
      <span className="mt-1 block text-sm text-muted">{hint}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={100}
        value={rupees}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-tide"
      />
    </label>
  );
}

function Book({
  audit,
  orders,
}: {
  audit: ReturnType<typeof useMunim.getState>["audit"];
  orders: ReturnType<typeof useMunim.getState>["orders"];
}) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-2xl">Chits</h2>
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[16px] bg-receipt px-4 py-3 shadow-[var(--shadow-page)]">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{o.buyer}</p>
                <p className="tabular-nums">{formatInr(o.totalPaise)}</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {formatClock(o.createdAt)} · {o.status} · {o.lines.map((l) => l.name).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-display text-2xl">Tape</h2>
        <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto font-mono text-xs leading-relaxed">
          {audit.map((a) => (
            <li key={a.id} className="border-b border-line pb-2">
              <span className="text-muted">{formatClock(a.at)}</span>{" "}
              <span className="text-tide">{a.kind}</span>
              <br />
              {a.summary}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
