import {
  extractReceiptTotalPence,
  parseReceiptTotalPence,
} from "./receiptTotal";

describe("extractReceiptTotalPence", () => {
  it("extracts a sterling total from a UK receipt", () => {
    const receipt = `
      FRESH FOOD MARKET
      SUBTOTAL £48.17
      DISCOUNT £2.50
      TOTAL £45.67
    `;

    expect(extractReceiptTotalPence(receipt)).toBe(4567);
  });

  it("handles TOTAL TO PAY when the amount is on the next OCR line", () => {
    const receipt = `
      SUBTOTAL 32.15
      SAVINGS 4.00
      TOTAL TO PAY
      £28.15
    `;

    expect(extractReceiptTotalPence(receipt)).toBe(2815);
  });

  it("recognises a BALANCE label used on UK receipts", () => {
    expect(extractReceiptTotalPence("BALANCE £18.20")).toBe(1820);
  });

  it("recognises an AMOUNT DUE label", () => {
    expect(extractReceiptTotalPence("AMOUNT DUE £45.67")).toBe(4567);
  });

  it("uses a completed card payment when the receipt has no total label", () => {
    const receipt = "CARD PAYMENT\nVISA DEBIT £38.50\nAPPROVED";

    expect(extractReceiptTotalPence(receipt)).toBe(3850);
  });

  it("does not mistake subtotals or large reference numbers for the total", () => {
    const receipt = `
      LOYALTY REFERENCE 9876.54
      SUBTOTAL £52.00
      DISCOUNT -£7.00
      VAT £0.00
    `;

    expect(extractReceiptTotalPence(receipt)).toBeNull();
  });

  it("rejects implausibly large labelled grocery totals", () => {
    expect(extractReceiptTotalPence("TOTAL £98,765.43")).toBeNull();
  });

  it("fails clearly for an unsupported market", () => {
    expect(() =>
      parseReceiptTotalPence("TOTAL $45.67", { market: "US" }),
    ).toThrow("Unsupported receipt market: US");
  });
});
