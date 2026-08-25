import { useEffect, useState } from "react";
import { MERCHANT } from "@/lib/catalog";
import type { CartLine, Mandate, Payment, Quote } from "@/lib/policy";
import { cn, formatInr, formatTime } from "@/lib/utils";

export function Receipt({
  lines,
  quote,
  mandate,
  payment,
  buyer,
  className,
}: {
  lines: CartLine[];
  quote: Quote | null;
  mandate: Mandate | null;
  payment: Payment | null;
  buyer: string;
  className?: string;
}) {
  const shown = quote?.lines ?? lines;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, [shown.length, mandate?.id, payment?.id]);

  return (
    <aside
      className={cn(
        "relative bg-receipt text-ink shadow-[var(--shadow-receipt)]",
        className,
      )}
    >
      <div className="h-3 bg-[repeating-linear-gradient(90deg,var(--color-receipt)_0_10px,transparent_10px_14px)]" />
      <div className="px-5 pb-6 pt-3 font-mono text-[11px] leading-relaxed sm:px-6">
        <p className="text-center font-sans text-[10px] uppercase tracking-[0.22em] text-muted">
          Rao & Sons · est. {MERCHANT.est}
        </p>
        <p className="mt-1 text-center font-display text-lg tracking-tight">Munim chit</p>
        <p className="text-center text-muted">{MERCHANT.address}</p>
        <p className="mt-3 border-t border-dashed border-line pt-3">
          {now ? formatTime(now) : "—"} · GSTIN {MERCHANT.gstin}
        </p>
        <p className="mt-1">Buyer: {buyer || "— unnamed —"}</p>
        <div className="mt-3 border-t border-dashed border-line pt-3">
          {shown.length === 0 ? (
            <p className="text-muted">Nothing on the chit yet.</p>
          ) : (
            shown.map((l) => (
              <div key={l.sku} className="mb-1.5 flex justify-between gap-3">
                <span>
                  {l.qty} × {l.name}
                  {l.note ? <span className="block text-[10px] text-muted">{l.note}</span> : null}
                </span>
                <span className="tabular-nums">{formatInr(l.unitPaise * l.qty)}</span>
              </div>
            ))
          )}
        </div>
        {quote ? (
          <div className="mt-3 border-t border-dashed border-line pt-3 tabular-nums">
            <div className="flex justify-between">
              <span>Goods</span>
              <span>{formatInr(quote.subtotalPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span>Of which GST</span>
              <span>{formatInr(quote.gstPaise)}</span>
            </div>
            <div className="mt-1 flex justify-between font-sans text-sm font-medium">
              <span>To pay</span>
              <span>{formatInr(quote.totalPaise)}</span>
            </div>
          </div>
        ) : null}
        {mandate ? (
          <p className="mt-3 border-t border-dashed border-line pt-3">
            Mandate {mandate.id}
            <br />
            {mandate.status} · bound {formatInr(mandate.maxPaise)}
            {mandate.reason ? (
              <>
                <br />
                {mandate.reason}
              </>
            ) : null}
          </p>
        ) : null}
        {payment ? (
          <p className="mt-3">
            {payment.id}
            <br />
            {payment.status}
            {payment.failureCode ? ` · ${payment.failureCode}` : null}
          </p>
        ) : null}
        <div className="mt-5 flex justify-center">
          {payment?.status === "captured" ? (
            <span className="stamp text-ok">Paid</span>
          ) : payment?.status === "failed" ? (
            <span className="stamp text-stamp">Held</span>
          ) : mandate?.status === "blocked" ? (
            <span className="stamp text-stamp">No</span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.18em] text-faint">Not a bill until captured</span>
          )}
        </div>
      </div>
    </aside>
  );
}
