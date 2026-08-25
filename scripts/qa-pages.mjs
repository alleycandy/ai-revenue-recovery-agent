import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});

async function shot(path, file) {
  await page.goto("http://127.0.0.1:8080" + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: file, fullPage: false });
  const text = (await page.locator("body").innerText()).slice(0, 180).replace(/\n/g, " | ");
  console.log(path, "=>", text);
}

await shot("/counter", "/workspace/screenshots/counter.png");
await shot("/gaddi", "/workspace/screenshots/gaddi.png");
await shot("/aisle", "/workspace/screenshots/aisle.png");
await shot("/pitch", "/workspace/screenshots/pitch.png");

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 1400));
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/story-ch1.png" });
await page.evaluate(() => window.scrollTo(0, 2800));
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/story-ch2.png" });

await page.goto("http://127.0.0.1:8080/counter", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Run the hotel breakfast/i }).click();
await page.waitForTimeout(9000);
await page.screenshot({ path: "/workspace/screenshots/counter-running.png" });
const stamp = await page.locator("body").innerText();
console.log("COUNTER_HAS_PAID", /Paid/i.test(stamp));
console.log("COUNTER_HAS_MANDATE", /Mandate/i.test(stamp));
console.log("COUNTER_SNIP", stamp.slice(0, 500).replace(/\n/g, " | "));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:8080/counter", { waitUntil: "networkidle" });
await page.screenshot({ path: "/workspace/screenshots/counter-mobile.png" });
await page.goto("http://127.0.0.1:8080/gaddi", { waitUntil: "networkidle" });
await page.screenshot({ path: "/workspace/screenshots/gaddi-mobile.png" });

await browser.close();
console.log("done");
