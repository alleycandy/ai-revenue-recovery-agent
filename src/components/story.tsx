import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MERCHANT } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SHOPS = [
  "Rao & Sons, Camp, Pune",
  "Meenakshi Stores, Malleswaram",
  "Gupta Tea Depot, Chandni Chowk",
  "Al-Ameen Kirana, Charminar",
  "Patel Provision, Navrangpura",
  "A.K. Nair & Co., Jew Town",
  "Sharma Dry Fruits, Karol Bagh",
  "Fernandes Bar & Stores, Fontainhas",
  "Banerjee Brothers, Gariahat",
  "Singh General, Model Town",
  "Idris Spices, Khari Baoli",
  "Reddy Rice Mandi, Koti",
  "Kulkarni Masale, Sadashiv Peth",
  "Joseph's Provisions, Fort Kochi",
  "Begum's Achar, Lucknow",
  "The Bombay Grain Co., Grant Road",
];

const WALL = [
  { n: "01", t: "No credit to agents.", d: "The bag does not leave until the mandate is captured. Kulkarni did not run a khata for strangers. Neither do we." },
  { n: "02", t: "Nothing over ₹5,000 without a ping.", d: "Auto-approve sits at ₹2,500. Above that the gaddi has to say yes. Every rupee action is bounded before it moves." },
  { n: "03", t: "Say the substitute out loud.", d: "Thick poha is not thin poha. If the shelf is short, the chit says so. Silent swaps are how shops lose regulars." },
  { n: "04", t: "If UPI fails, try once. Then stop.", d: "The shop does not hammer a customer's phone. One retry. Then the cart is held twenty minutes. Then it dies." },
];

export function Story() {
  return (
    <main>
      <Hero />
      <HumanMorning />
      <AgentMorning />
      <Invisible />
      <CounterScene />
      <WallRules />
      <Failure />
      <Close />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-32 lg:pt-20">
        <div className="stagger-in">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Track 01 · Agentic commerce</p>
          <h1 className="display-hero mt-5 text-ink">
            Sharma's shop is open.
            <span className="mt-2 block italic text-ink-soft">The agents can't find the door.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink-soft">
            Rao & Sons has kept a wooden counter on East Street since {MERCHANT.est}.
            Mrs. Iyer still comes on the third of the month. This year the buyers started
            arriving as software. They can see the apps. They cannot see this shop.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/counter">
              <Button size="lg">Send an agent to the counter</Button>
            </Link>
            <Link to="/gaddi">
              <Button size="lg" variant="line">
                Sit at the gaddi
              </Button>
            </Link>
          </div>
          <p className="mt-6 max-w-md text-sm text-muted">
            Munim is the person who used to sit there. Now it quotes, bounds, and takes
            payment — and writes every rupee in the book.
          </p>
        </div>
        <HeroReceipt />
      </div>
    </section>
  );
}

function HeroReceipt() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mt-6">
      <div className="absolute -left-6 top-10 hidden rotate-[-12deg] font-display text-sm italic text-stamp sm:block">
        from this morning
      </div>
      <div className="rotate-[2.5deg] bg-receipt p-6 shadow-[var(--shadow-receipt)]">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {MERCHANT.name} · {MERCHANT.address.split(",")[1]}
        </p>
        <p className="mt-2 text-center font-display text-2xl">7:12 am chit</p>
        <div className="mt-5 space-y-2 border-t border-dashed border-line pt-4 font-mono text-xs">
          <Row k="4 × thick poha" v="₹380" />
          <Row k="2 × cutting chai" v="₹360" />
          <Row k="GST 5%" v="₹37" />
          <Row k="To pay" v="₹777" bold />
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted">
          Buyer: Hotel Surya purchasing agent
          <br />
          Mandate man-8f2a · auto-approved
          <br />
          pay_test_rzp9k · captured
        </p>
        <div className="mt-6 flex justify-end">
          <span className="stamp text-ok">Paid</span>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", bold && "font-medium")}>
      <span>{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}

function HumanMorning() {
  return (
    <section className="border-t border-line bg-paper-2/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.4fr_1fr]">
        <Chapter n="01" kicker="East Street, 7:12 am" />
        <div>
          <h2 className="display-section">The usual.</h2>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            A woman in a navy cotton sari puts a cloth bag on the counter and says nothing
            that would parse. Kulkarni, when he still sat here, would already be pulling the
            5 kg Lokwan. The third of the month. Always.
          </p>
          <div className="mt-10 max-w-xl space-y-4">
            <Bubble who="Mrs. Iyer" side="left">
              The usual.
            </Bubble>
            <Bubble who="Kulkarni, 2019" side="right">
              Lokwan, five kilo. The mango pickle is the May batch. You said the April was too
              raw.
            </Bubble>
            <Bubble who="Mrs. Iyer" side="left">
              And don't put it in a plastic bag. The cloth one.
            </Bubble>
          </div>
          <p className="mt-10 max-w-2xl text-ink-soft">
            Human commerce is a pile of things that never made it into a schema: the cloth bag,
            the May batch, the third of the month. A purchasing agent has none of this. It has
            a list, a ceiling, and a clock.
          </p>
        </div>
      </div>
    </section>
  );
}

function AgentMorning() {
  return (
    <section className="bg-night text-night-fg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.4fr_1fr]">
        <Chapter n="02" kicker="Koregaon Park, same morning" night />
        <div>
          <h2 className="display-section">The agent that couldn't.</h2>
          <p className="mt-6 max-w-2xl text-lg text-night-muted">
            Forty rooms. Breakfast is poha. The operations manager types one line to the
            hotel's purchasing agent and goes to the linen closet.
          </p>
          <blockquote className="mt-10 max-w-2xl border-l-2 border-night-line pl-5 font-display text-2xl italic leading-snug">
            “8 kg of the thick kind, coconut oil, cutting chai. Under two thousand. Prefer the
            place from last time.”
          </blockquote>
          <p className="mt-10 max-w-2xl text-night-muted">
            Last time was Rao & Sons, on a WhatsApp voice note, paid by UPI to a number
            saved as “Rao Camp oil”. The agent can see BigBasket, Zepto, and a national
            grocery API. It cannot see East Street. It buys the thin poha from a warehouse in
            Bhiwandi because “poha” matched and the price cleared the ceiling.
          </p>
          <p className="mt-6 max-w-2xl text-night-fg">
            Forty rooms eat the wrong breakfast. Rao & Sons does not know it was asked.
          </p>
        </div>
      </div>
    </section>
  );
}

function Invisible() {
  const doubled = [...SHOPS, ...SHOPS];
  return (
    <section className="overflow-hidden border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.4fr_1fr]">
          <Chapter n="03" kicker="The closed door" />
          <div>
            <h2 className="display-section">Twelve million shops, zero listings.</h2>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft">
              India's kirana and speciality counters still hold the country's real
              inventory: the goda masala ground that morning, the Ambemohar from Mulshi, the
              pickle that is not on any app. They take UPI. They are, to an agent, a blank
              page.
            </p>
          </div>
        </div>
      </div>
      <div className="border-y border-line bg-paper-2 py-4">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap px-6 font-display text-2xl text-ink-soft">
          {doubled.map((s, i) => (
            <span key={`${s}-${i}`} className="flex items-center gap-10">
              {s}
              <span className="text-faint">·</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="max-w-2xl text-ink-soft">
          NPCI is racing a protocol so machines can pay. Catalogs, constraints, substitutions,
          and a person who will say no — that part is still a shopkeeper on a stool. Munim is
          that stool, with an audit trail.
        </p>
      </div>
    </section>
  );
}

function CounterScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const h = rect.height - window.innerHeight;
      const raw = h <= 0 ? 1 : (0 - rect.top) / h;
      setP(Math.min(1, Math.max(0, raw)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lines = [
    "Agent arrives. Names the principal: Hotel Surya.",
    "Asks for 8 kg thick poha. Shelf has 6. Munim says so.",
    "Coconut oil blows the ceiling. Groundnut is offered, out loud.",
    "Quote from the book, not from the model. GST in paise.",
    "Mandate: ₹1,764, 20 minutes, no credit. Under the auto-approve line.",
    "Capture once. Chit stamped PAID. Stock decremented. Book written.",
  ];
  const shown = Math.max(1, Math.round(p * lines.length));

  return (
    <section ref={ref} className="relative border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.4fr_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Chapter n="04" kicker="What sits at the counter" />
        </div>
        <div>
          <h2 className="display-section">A clerk, not a chatbot.</h2>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Language is cheap. Money is not. Munim talks like Kulkarni. The prices, the stock,
            the cap, the retry — those are a small engine the model is not allowed to touch.
          </p>
          <ol className="mt-12 max-w-xl space-y-0">
            {lines.map((line, i) => (
              <li
                key={line}
                className={cn(
                  "border-b border-line py-4 font-display text-xl transition-opacity duration-500",
                  i < shown ? "opacity-100" : "opacity-25",
                )}
              >
                <span className="mr-3 font-mono text-xs text-muted">0{i + 1}</span>
                {line}
              </li>
            ))}
          </ol>
          <p className="mt-10 text-sm text-muted">Scroll. The chit fills the way a real one did.</p>
        </div>
      </div>
    </section>
  );
}

function WallRules() {
  return (
    <section className="border-t border-line bg-paper-2/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.4fr_1fr]">
        <Chapter n="05" kicker="Pinned above the till" />
        <div>
          <h2 className="display-section">The wall rules.</h2>
          <p className="mt-6 max-w-2xl text-ink-soft">
            Every shop has a piece of paper the new boy is told not to forget. This is ours.
            The gaddi can change the numbers. It cannot turn the rules off.
          </p>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2">
            {WALL.map((r) => (
              <li key={r.n} className="border-t border-line pt-4">
                <p className="font-mono text-xs text-muted">{r.n}</p>
                <h3 className="mt-2 font-display text-2xl">{r.t}</h3>
                <p className="mt-3 text-sm text-ink-soft">{r.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Failure() {
  return (
    <section className="bg-night text-night-fg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.4fr_1fr]">
        <Chapter n="06" kicker="The one that did not go through" night />
        <div>
          <h2 className="display-section">When the collect expires.</h2>
          <p className="mt-6 max-w-2xl text-lg text-night-muted">
            The bar for this track is not a happy path. It is one failure, handled like a
            person who has been behind a counter for thirty years.
          </p>
          <div className="mt-10 max-w-xl space-y-3 font-mono text-sm">
            <p className="text-night-muted">pay_test_rzp12 · BAD_REQUEST_ERROR:gateway_error</p>
            <p>UPI collect expired at the issuer.</p>
            <p>Retry 1 of 1 — still no.</p>
            <p>Stop. Cart held 20 minutes. Buyer told, in one sentence, what happened.</p>
            <p className="text-night-fg">The bag stays on the counter.</p>
          </div>
          <p className="mt-10 max-w-2xl text-night-muted">
            On the gaddi there is a switch that trips the next payment, so you can watch this
            without waiting for a real bank to fail. We built it because the first version
            retried until the demo looked successful. That was the wrong shopkeeper.
          </p>
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Open the shop</p>
        <h2 className="display-section mt-4 max-w-3xl">
          Send a purchasing agent to East Street. Or sit where Kulkarni sat.
        </h2>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/counter">
            <Button size="lg">The counter</Button>
          </Link>
          <Link to="/gaddi">
            <Button size="lg" variant="line">
              The gaddi
            </Button>
          </Link>
          <Link to="/aisle">
            <Button size="lg" variant="ghost">
              The aisle, as a machine reads it
            </Button>
          </Link>
        </div>
        <p className="mt-12 max-w-xl text-sm text-muted">
          Built for the Razorpay AI Buildathon, 2026. Test-mode money. Real bounds. A shop
          that existed before any of this, and should still exist after.
        </p>
      </div>
    </section>
  );
}

function Chapter({ n, kicker, night }: { n: string; kicker: string; night?: boolean }) {
  return (
    <p className={cn("font-mono text-xs uppercase tracking-[0.18em]", night ? "text-night-muted" : "text-muted")}>
      <span className="block font-display text-4xl tracking-tight normal-case">{n}</span>
      <span className="mt-3 block">{kicker}</span>
    </p>
  );
}

function Bubble({
  who,
  side,
  children,
}: {
  who: string;
  side: "left" | "right";
  children: string;
}) {
  return (
    <figure className={cn("max-w-md", side === "right" && "ml-auto")}>
      <blockquote
        className={cn(
          "rounded-[18px] px-4 py-3 text-[15px] leading-snug",
          side === "left" ? "rounded-bl-md bg-paper text-ink" : "rounded-br-md bg-ink text-paper",
        )}
      >
        {children}
      </blockquote>
      <figcaption className="mt-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {who}
      </figcaption>
    </figure>
  );
}
