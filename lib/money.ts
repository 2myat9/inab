const MONEY_RE = /^\d+(\.\d{1,2})?$/;

export function parseMoney(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!MONEY_RE.test(cleaned)) return null;
  const [dollars, cents = ""] = cleaned.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0") || "0");
}

export function formatMoney(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rest = String(abs % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}$${dollars}.${rest}`;
}
