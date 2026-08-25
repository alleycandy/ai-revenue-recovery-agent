import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pitch")({ component: PitchPage });

function PitchPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        Razorpay AI Buildathon · Track 01
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        What it solves, how it is built, what broke.
      </h1>
      <p className="mt-5 text-lg text-ink-soft">
        The form asks for twelve answers. This page is the three they said they read: problem
        taste, build quality, and the failure we actually had.
      </p>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Problem</h2>
        <p className="mt-4 text-ink-soft">
          Agentic commerce is being discussed as a payments problem. For a kirana or a
          speciality counter it is a <em>visibility</em> problem. Rao & Sons already takes
          UPI. Hotel Surya's purchasing agent cannot find the shop, cannot know that
          “poha” means thick, and cannot be told when the shelf has six kilos instead of eight.
          The rupee is not the bottleneck. The description is.
        </p>
        <p className="mt-4 text-ink-soft">
          Munim makes one merchant transactable by an AI buyer, end to end: an agent-readable
          aisle, a conversation at the counter, a bounded mandate, a capture, an audit trail,
          and one failure that stops.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Architecture</h2>
        <ol className="mt-6 space-y-5">
          <Step n="Language" d="A model (Grok) matches messy buyer language to SKUs and writes like the old munim. It is not shown the till keys. It may propose actions. It may not invent a price." />
          <Step n="Book" d="A deterministic engine owns stock, GST, caps, auto-approve, retries, and capture. Quote, mandate, payment are pure functions. The object graph is Razorpay test-mode shaped so a live key can sit down later." />
          <Step n="Gaddi" d="A human (or this demo's switch) can tighten the wall rules, arm a failure, approve a held mandate, and read the tape. Agents do not get this seat." />
        </ol>
        <p className="mt-6 text-sm text-muted">
          AI judgment, as the brief asked: the right tool in the right place, and where we
          chose not to use one. Money is the place we chose not to.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">The bar</h2>
        <ul className="mt-4 space-y-3 text-ink-soft">
          <li>
            <strong className="text-ink">Every money action explainable, bounded, gated.</strong>{" "}
            Mandate carries a ceiling, a purpose, a named buyer, an expiry. Capture refuses to
            exceed it. Credit is off.
          </li>
          <li>
            <strong className="text-ink">Audit trail.</strong> Quote, block, approve, capture,
            fail — each is a line on the tape, on the gaddi, and on the chit.
          </li>
          <li>
            <strong className="text-ink">One failure, handled.</strong> Arm “trip the next
            payment” on the gaddi. The collect expires. One retry. Then stop. The bag stays.
          </li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">What broke</h2>
        <p className="mt-4 text-ink-soft">
          The first counter let the model speak the total. It was fluent and wrong: it rounded
          GST, it invented a 1 kg coconut oil that we do not sell, and in one run it silently
          swapped thin poha to make the ceiling. The demo looked successful. The shop would
          have lost Mrs. Iyer.
        </p>
        <p className="mt-4 text-ink-soft">
          We took the till away from the model. It may add a SKU. The book prices the line.
          Substitutions must be a note on the chit. That is the whole product, in one
          humiliation.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">How to look</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-soft">
          <li>Read the story on the first page. It is the brief in a shop's voice.</li>
          <li>
            On the counter, run <em>the hotel breakfast</em>. Watch stock, substitution, bound,
            capture.
          </li>
          <li>On the gaddi, arm the trip. Run another order. Watch it stop.</li>
          <li>On the aisle, read one SKU as a human and as JSON.</li>
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/counter">
            <Button>Go to the counter</Button>
          </Link>
          <Link to="/">
            <Button variant="line">Back to the book</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

function Step({ n, d }: { n: string; d: string }) {
  return (
    <li className="border-t border-line pt-4">
      <p className="font-display text-xl">{n}</p>
      <p className="mt-2 text-ink-soft">{d}</p>
    </li>
  );
}
