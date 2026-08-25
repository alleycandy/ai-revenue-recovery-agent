export type ScriptBeat = {
  wait: number;
  who: "buyer" | "munim" | "system";
  text: string;
  act?:
    | { op: "buyerName"; name: string }
    | { op: "add"; sku: string; qty: number; note?: string }
    | { op: "quote" }
    | { op: "mandate"; purpose: string }
    | { op: "capture" };
};

/**
 * A recorded morning at the counter. Not a fake model —
 * the same money engine the live agent uses, played in order.
 * Hotel Surya's purchasing agent wants breakfast dry goods under ₹2,000.
 * Thick poha is short. Munim discloses, substitutes, re-quotes, takes a bounded payment.
 */
export const HOTEL_BREAKFAST: ScriptBeat[] = [
  {
    wait: 400,
    who: "system",
    text: "A purchasing agent for Hotel Surya, Koregaon Park, is at the counter.",
  },
  {
    wait: 900,
    who: "buyer",
    text: "Hotel Surya. Breakfast for forty rooms. 8 kg thick poha, 2 litres cold-pressed coconut oil, a kilo of the cutting chai. Stay under two thousand. Prefer the same shop as last Thursday.",
    act: { op: "buyerName", name: "Hotel Surya purchasing agent" },
  },
  {
    wait: 1400,
    who: "munim",
    text: "Surya, theek hai. Thick poha is ₹95 a kilo. I have six on the shelf, not eight. Coconut oil is ₹420 a litre — two litres is ₹840. Cutting chai is ₹180 per 250g, four packs for a kilo is ₹720. That is already ₹2,320 before tax, over your two thousand, and I am two kilos short on poha.",
  },
  {
    wait: 700,
    who: "munim",
    text: "I will not silently fill the last two kilos with thin poha. Thin is for chivda. If you accept six thick and two thin, I will write it on the chit. For the bill: groundnut oil is ₹280 a litre and the kitchen will not notice in poha. Drop the tea to 500g. Then we are inside two thousand.",
  },
  {
    wait: 1100,
    who: "buyer",
    text: "Six thick, two thin, write it down. Groundnut oil, two litres. Tea, 500g. Go.",
  },
  {
    wait: 500,
    who: "munim",
    text: "On the chit: 6 × thick poha, 2 × thin poha (disclosed), 2 × groundnut oil, 2 × cutting chai.",
    act: { op: "add", sku: "POH-THK-1", qty: 6, note: "as requested" },
  },
  {
    wait: 280,
    who: "system",
    text: "Substitution disclosed on the chit.",
    act: { op: "add", sku: "POH-THN-1", qty: 2, note: "disclosed substitute for short thick poha" },
  },
  {
    wait: 280,
    who: "system",
    text: "Groundnut oil added.",
    act: { op: "add", sku: "OIL-GNT-1", qty: 2 },
  },
  {
    wait: 280,
    who: "system",
    text: "Tea, 500g.",
    act: { op: "add", sku: "TEA-CUT-250", qty: 2 },
  },
  {
    wait: 700,
    who: "munim",
    text: "Quoting from the book. Not from memory.",
    act: { op: "quote" },
  },
  {
    wait: 900,
    who: "munim",
    text: "I am requesting a mandate for the book total — under two thousand — purpose: breakfast dry goods, Hotel Surya. Bound, 20 minutes, no credit. Under the auto-approve line, so the gaddi will not be woken.",
    act: { op: "mandate", purpose: "Breakfast dry goods for Hotel Surya, Koregaon Park" },
  },
  {
    wait: 800,
    who: "munim",
    text: "Capturing once.",
    act: { op: "capture" },
  },
];
