const PENCE_PER_POUND = 100;
const MAX_PLAUSIBLE_GROCERY_TOTAL_PENCE = 500_000;
const AMOUNT = "£?\\s*([\\d,]+\\.\\d{2})";

const RECEIPT_TOTAL_PATTERNS = [
  new RegExp(
    `(?:^|\\n)\\s*(?!SUB\\s*TOTAL)(?:TOTAL(?:\\s+TO\\s+PAY)?|BALANCE(?:\\s+DUE)?|AMOUNT\\s+DUE)\\s*${AMOUNT}\\s*(?:$|\\n)`,
    "im",
  ),
  new RegExp(
    `(?:^|\\n)\\s*(?:VISA|MASTERCARD|DEBIT|CREDIT|CARD)(?:\\s+(?:DEBIT|CREDIT|PAYMENT|TOTAL))*\\s*${AMOUNT}\\s*(?:$|\\n)`,
    "im",
  ),
];

/**
 * Extract a receipt total from OCR text and return it in pence.
 */
export function parseReceiptTotalPence(
  text: string,
  { market }: { market: string },
): number | null {
  if (market !== "GB") {
    throw new Error(`Unsupported receipt market: ${market}`);
  }
  for (const pattern of RECEIPT_TOTAL_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const pounds = Number.parseFloat(match[1].replace(/,/g, ""));
    if (Number.isFinite(pounds) && pounds > 0) {
      const pence = Math.round(pounds * PENCE_PER_POUND);
      if (pence <= MAX_PLAUSIBLE_GROCERY_TOTAL_PENCE) return pence;
    }
  }

  return null;
}

export function extractReceiptTotalPence(text: string): number | null {
  return parseReceiptTotalPence(text, { market: "GB" });
}
