import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, MERCHANT, PRODUCTS, catalogForAgents } from "@/lib/catalog";
import { formatInr } from "@/lib/utils";

export const Route = createFileRoute("/aisle")({ component: AislePage });

function AislePage() {
  const [sku, setSku] = useState(PRODUCTS[6]?.sku ?? PRODUCTS[0].sku);
  const product = PRODUCTS.find((p) => p.sku === sku) ?? PRODUCTS[0];
  const machine = useMemo(() => catalogForAgents().find((p) => p.sku === sku), [sku]);
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    const payload = {
      merchant: {
        name: MERCHANT.name,
        gstin: MERCHANT.gstin,
        address: MERCHANT.address,
        hours: MERCHANT.hours,
        razorpay_account: MERCHANT.razorpayAccount,
        currency: "INR",
        protocol: "munim.aisle/v0",
      },
      products: catalogForAgents(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">The aisle · agent-readable</p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl tracking-tight sm:text-5xl">
        What a machine is allowed to know.
      </h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        A human walking East Street can smell the pickle. An agent gets a catalog: SKU, aliases
        (including the Hinglish), stock, GST, substitutions, and a note that is a constraint, not
        marketing. This is the missing half of agentic payments — NPCI can move the rupee; someone
        still has to describe the sack.
      </p>
      <div className="mt-6">
        <Button variant="line" onClick={() => void copyAll()}>
          {copied ? "Copied the aisle" : "Copy the full catalog as JSON"}
        </Button>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {PRODUCTS.map((p) => (
          <button
            key={p.sku}
            type="button"
            onClick={() => setSku(p.sku)}
            className={`h-10 shrink-0 rounded-full px-3 text-sm ${
              p.sku === sku ? "bg-ink text-paper" : "bg-paper-2 text-ink-soft"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[22px] bg-receipt p-6 shadow-[var(--shadow-page)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">On the shelf</p>
          <h2 className="mt-2 font-display text-3xl">{product.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {CATEGORY_LABEL[product.category]} · {product.unit} · {product.origin}
          </p>
          <p className="mt-6 font-display text-4xl tabular-nums tracking-tight">
            {formatInr(product.pricePaise)}
          </p>
          <p className="text-sm text-muted">MRP {formatInr(product.mrpPaise)} · GST {product.gstPct}%</p>
          <p className="mt-6 text-ink-soft">{product.notesForAgents}</p>
          <p className="mt-4 text-sm text-muted">
            Also known as {product.aliases.join(", ")}.
            {product.substitutions.length
              ? ` If we are short: ${product.substitutions.join(", ")} — disclosed.`
              : " No substitute. If we are short, we say no."}
          </p>
          <p className="mt-4 font-mono text-xs">Stock {product.stock} · {product.sku}</p>
        </article>
        <pre className="overflow-x-auto rounded-[22px] bg-night p-5 font-mono text-[11px] leading-relaxed text-night-fg">
          {JSON.stringify(machine, null, 2)}
        </pre>
      </div>

      <section className="mt-16 grid gap-10 border-t border-line pt-12 lg:grid-cols-3">
        <Protocol
          n="01"
          t="Describe"
          d="Aliases, pack size, GST, perishability, substitutions. The things a warehouse SKU file pretends not to need and a Pune counter cannot live without."
        />
        <Protocol
          n="02"
          t="Bound"
          d="An agent mandate is not a saved card. It is a ceiling, a purpose, a named principal, and an expiry. Capture cannot exceed it. Credit is off."
        />
        <Protocol
          n="03"
          t="Write"
          d="Every quote, block, retry, and capture is a line in the book. If the model hallucinates a price, the engine files the book price and a warning."
        />
      </section>
    </main>
  );
}

function Protocol({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div>
      <p className="font-mono text-xs text-muted">{n}</p>
      <h3 className="mt-2 font-display text-2xl">{t}</h3>
      <p className="mt-3 text-sm text-ink-soft">{d}</p>
    </div>
  );
}
