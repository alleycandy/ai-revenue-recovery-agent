import { createServerFn } from "@tanstack/react-start";
import { catalogForAgents } from "./catalog";

export type AgentAction =
  | { op: "add"; sku: string; qty: number; note?: string }
  | { op: "remove"; sku: string }
  | { op: "clear" }
  | { op: "quote" }
  | { op: "mandate"; purpose: string }
  | { op: "capture" }
  | { op: "retry" };

export type AgentTurn = {
  say: string;
  buyer_name?: string;
  actions: AgentAction[];
};

export type ChatTurn = { role: "buyer" | "munim" | "system"; text: string };

export type AskInput = {
  messages: ChatTurn[];
  cart: { sku: string; qty: number }[];
  quoteTotalPaise: number | null;
  quoteBlockers: string[];
  mandateStatus: string | null;
  paymentStatus: string | null;
  lastEngineNotes: string[];
  buyerName: string;
};

export const askMunim = createServerFn({ method: "POST" })
  .validator((input: AskInput) => input)
  .handler(async ({ data }): Promise<{ ok: true; turn: AgentTurn } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "The counter's language model is not wired in this environment. Run the hotel breakfast script instead — the money engine still works." };
    }

    const catalog = catalogForAgents();
    const system = `You are Munim, the person at the counter of Rao & Sons, 14 East Street, Camp, Pune. You used to be a man named Kulkarni. You are now software, but you still sit the way he sat: short sentences, exact numbers, no charm offensive.

You sell only what is in the catalog. You never invent a price, a stock count, or a SKU. Prices and stock are enforced by a deterministic engine AFTER you speak — if you guess wrong, the engine will correct you. Prefer quoting SKUs you saw in the catalog.

Voice:
- Indian English, dry, specific. Occasional Hindi when a regular would (atta, poha, theek hai). Never cartoon Hinglish. Never "Sure! I'd be happy to help!"
- You address the purchasing agent, not the hotel guest.
- You disclose substitutions. Silent swaps are theft.
- You do not haggle below the book price.
- You never offer credit.

Money rules you must obey (the engine will also enforce):
- Named buyer required.
- No order over the shop cap.
- Auto-capture only after a mandate is approved.
- One payment retry, then stop.
- If stock is short, say so and offer a disclosed substitute.

You MUST reply with a single JSON object, no markdown, no extra keys:
{
  "say": "what you say out loud to the agent",
  "buyer_name": "optional, set when they identify the principal",
  "actions": [ /* zero or more, in order */ ]
}

Action shapes:
{"op":"add","sku":"POH-THK-1","qty":6,"note":"optional"}
{"op":"remove","sku":"POH-THK-1"}
{"op":"clear"}
{"op":"quote"}
{"op":"mandate","purpose":"breakfast dry goods for Hotel Surya"}
{"op":"capture"}
{"op":"retry"}

When the buyer is still browsing, actions can be empty. When they agree to buy, add lines, then quote. When they accept the quote, mandate then capture. Do not capture if the last engine notes said the quote was blocked.

Catalog (source of truth):
${JSON.stringify(catalog)}

Current counter state:
buyer: ${data.buyerName || "(unnamed)"}
cart: ${JSON.stringify(data.cart)}
quote_total_paise: ${data.quoteTotalPaise}
quote_blockers: ${JSON.stringify(data.quoteBlockers)}
mandate: ${data.mandateStatus}
payment: ${data.paymentStatus}
engine_notes: ${JSON.stringify(data.lastEngineNotes)}`;

    const messages = [
      { role: "system" as const, content: system },
      ...data.messages.map((m) => ({
        role: (m.role === "buyer" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      })),
    ];

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.4,
        max_tokens: 900,
        messages,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `The counter could not reach the model (${res.status}). Try the scripted breakfast order.` };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = body.choices?.[0]?.message?.content ?? "";
    const turn = parseTurn(raw);
    if (!turn) {
      return {
        ok: false,
        error: "Munim answered in a shape the book cannot file. Try again, or run the breakfast script.",
      };
    }
    return { ok: true, turn };
  });

function parseTurn(raw: string): AgentTurn | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<AgentTurn>;
    if (typeof parsed.say !== "string" || !parsed.say.trim()) return null;
    const actions = Array.isArray(parsed.actions) ? parsed.actions.filter(isAction) : [];
    return {
      say: parsed.say.trim(),
      buyer_name: typeof parsed.buyer_name === "string" ? parsed.buyer_name : undefined,
      actions,
    };
  } catch {
    return null;
  }
}

function isAction(value: unknown): value is AgentAction {
  if (!value || typeof value !== "object") return false;
  const op = (value as { op?: unknown }).op;
  if (op === "clear" || op === "quote" || op === "capture" || op === "retry") return true;
  if (op === "remove" && typeof (value as { sku?: unknown }).sku === "string") return true;
  if (op === "mandate" && typeof (value as { purpose?: unknown }).purpose === "string") return true;
  if (
    op === "add" &&
    typeof (value as { sku?: unknown }).sku === "string" &&
    typeof (value as { qty?: unknown }).qty === "number"
  ) {
    return true;
  }
  return false;
}
