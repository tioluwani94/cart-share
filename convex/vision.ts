import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Result type for receipt processing
 */
interface ProcessReceiptResult {
  success: boolean;
  extractedTotal: number | null; // Total in cents
  rawText: string | null;
  error?: string;
}

/**
 * Common regex patterns for extracting totals from receipt text.
 * Ordered by specificity - most specific patterns first.
 */
const TOTAL_PATTERNS = [
  // "TOTAL" followed by dollar amount (most common)
  /(?:GRAND\s*)?TOTAL[:\s]*\$?\s*(\d+[.,]\d{2})/i,
  // "TOTAL DUE" pattern
  /TOTAL\s*DUE[:\s]*\$?\s*(\d+[.,]\d{2})/i,
  // "AMOUNT DUE" pattern
  /AMOUNT\s*DUE[:\s]*\$?\s*(\d+[.,]\d{2})/i,
  // "BALANCE DUE" pattern
  /BALANCE\s*DUE[:\s]*\$?\s*(\d+[.,]\d{2})/i,
  // "SUBTOTAL" as fallback (some receipts only show this)
  /SUB\s*TOTAL[:\s]*\$?\s*(\d+[.,]\d{2})/i,
  // Dollar amount at end of line after "TOTAL" keyword somewhere before
  /TOTAL.*?\$?\s*(\d+[.,]\d{2})\s*$/im,
  // Credit/debit card total
  /(?:CREDIT|DEBIT|CARD)\s*(?:TOTAL)?[:\s]*\$?\s*(\d+[.,]\d{2})/i,
  // "AMOUNT" followed by dollar amount
  /AMOUNT[:\s]*\$?\s*(\d+[.,]\d{2})/i,
];

/**
 * Convert a dollar string (e.g., "45.67") to cents (4567)
 */
function dollarsToCents(dollarString: string): number {
  // Replace comma with period for international formats
  const normalized = dollarString.replace(",", ".");
  const dollars = parseFloat(normalized);
  return Math.round(dollars * 100);
}

/**
 * Extract the total amount from receipt text using regex patterns.
 * Returns the amount in cents, or null if no total found.
 */
function extractTotalFromText(text: string): number | null {
  // Try each pattern in order of specificity
  for (const pattern of TOTAL_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cents = dollarsToCents(match[1]);
      // Sanity check: receipt totals should be reasonable (between $0.01 and $10,000)
      if (cents > 0 && cents <= 1000000) {
        return cents;
      }
    }
  }

  // Fallback: look for the largest dollar amount on the receipt
  // This is a heuristic - the total is usually the largest amount
  const allAmounts = text.match(/\$?\s*(\d+[.,]\d{2})/g);
  if (allAmounts && allAmounts.length > 0) {
    let maxCents = 0;
    for (const amount of allAmounts) {
      const numMatch = amount.match(/(\d+[.,]\d{2})/);
      if (numMatch) {
        const cents = dollarsToCents(numMatch[1]);
        if (cents > maxCents && cents <= 1000000) {
          maxCents = cents;
        }
      }
    }
    if (maxCents > 0) {
      return maxCents;
    }
  }

  return null;
}

/**
 * Process a receipt image using Google Cloud Vision OCR.
 * Extracts text and attempts to identify the total amount.
 */
export const processReceipt = action({
  args: {
    imageId: v.id("_storage"),
  },
  handler: async (ctx, { imageId }): Promise<ProcessReceiptResult> => {
    // Get the API key from environment variables
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_CLOUD_VISION_API_KEY is not configured");
      return {
        success: false,
        extractedTotal: null,
        rawText: null,
        error: "OCR service not configured",
      };
    }

    // Get the storage URL for the image
    const imageUrl = await ctx.storage.getUrl(imageId);
    if (!imageUrl) {
      console.error("Could not get URL for storage ID:", imageId);
      return {
        success: false,
        extractedTotal: null,
        rawText: null,
        error: "Could not retrieve image",
      };
    }

    try {
      // Call Google Cloud Vision API
      const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

      const requestBody = {
        requests: [
          {
            image: {
              source: {
                imageUri: imageUrl,
              },
            },
            features: [
              {
                type: "TEXT_DETECTION",
                maxResults: 1,
              },
            ],
          },
        ],
      };

      const response = await fetch(visionApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Vision API error:", response.status, errorText);
        return {
          success: false,
          extractedTotal: null,
          rawText: null,
          error: "OCR service error",
        };
      }

      const data = await response.json();

      // Check for Vision API errors in the response
      if (data.responses?.[0]?.error) {
        const apiError = data.responses[0].error;
        console.error("Vision API response error:", apiError);
        return {
          success: false,
          extractedTotal: null,
          rawText: null,
          error: apiError.message || "OCR processing failed",
        };
      }

      // Extract the full text annotation
      const textAnnotations = data.responses?.[0]?.textAnnotations;
      if (!textAnnotations || textAnnotations.length === 0) {
        console.log("No text found in image");
        return {
          success: false,
          extractedTotal: null,
          rawText: null,
          error: "No text found in image",
        };
      }

      // The first annotation contains the full text
      const rawText = textAnnotations[0].description || "";
      console.log("Extracted text length:", rawText.length);

      // Extract the total amount
      const extractedTotal = extractTotalFromText(rawText);

      if (extractedTotal !== null) {
        console.log("Extracted total (cents):", extractedTotal);
        return {
          success: true,
          extractedTotal,
          rawText,
        };
      } else {
        console.log("Could not extract total from text");
        return {
          success: true, // OCR worked, just couldn't find total
          extractedTotal: null,
          rawText,
          error: "Could not identify total amount",
        };
      }
    } catch (error) {
      console.error("Error processing receipt:", error);
      return {
        success: false,
        extractedTotal: null,
        rawText: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
