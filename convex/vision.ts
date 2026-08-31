import { action } from "./_generated/server";
import { v } from "convex/values";
import { extractReceiptTotalPence } from "./receiptTotal";
import { internal } from "./_generated/api";

/**
 * Result type for receipt processing
 */
interface ProcessReceiptResult {
  success: boolean;
  extractedTotal: number | null; // Total in pence
  error?: string;
}

/**
 * Process a receipt image using Google Cloud Vision OCR.
 * Extracts text and attempts to identify the total amount.
 */
export const processReceipt = action({
  args: {
    receiptUploadId: v.id("receiptUploads"),
  },
  handler: async (ctx, { receiptUploadId }): Promise<ProcessReceiptResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const receiptUpload = await ctx.runQuery(
      internal.storage.getAuthorizedUploadForProcessing,
      { receiptUploadId, clerkId: identity.subject },
    );
    if (!receiptUpload.storageId) {
      throw new Error("Receipt upload is not complete");
    }

    // Get the API key from environment variables
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_CLOUD_VISION_API_KEY is not configured");
      return {
        success: false,
        extractedTotal: null,
        error: "OCR service not configured",
      };
    }

    // Get the storage URL for the image
    const imageUrl = await ctx.storage.getUrl(receiptUpload.storageId);
    if (!imageUrl) {
      console.error("Could not get URL for receipt upload:", receiptUploadId);
      return {
        success: false,
        extractedTotal: null,
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
          error: "No text found in image",
        };
      }

      // The first annotation contains the full text
      const rawText = textAnnotations[0].description || "";
      console.log("Extracted text length:", rawText.length);

      // Extract the total amount
      const extractedTotal = extractReceiptTotalPence(rawText);

      if (extractedTotal !== null) {
        console.log("Extracted total (pence):", extractedTotal);
        return {
          success: true,
          extractedTotal,
        };
      } else {
        console.log("Could not extract total from text");
        return {
          success: true, // OCR worked, just couldn't find total
          extractedTotal: null,
          error: "Could not identify total amount",
        };
      }
    } catch (error) {
      console.error("Error processing receipt:", error);
      return {
        success: false,
        extractedTotal: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
