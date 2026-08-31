import type { Id } from "./_generated/dataModel";
import { deleteFile, getUrl } from "./storage";
import { processReceipt } from "./vision";

type GetUrlHandler = (
  ctx: unknown,
  args: { receiptUploadId: Id<"receiptUploads"> },
) => Promise<string | null>;

const getReceiptUrl = (getUrl as unknown as { _handler: GetUrlHandler })
  ._handler;

type DeleteFileHandler = (
  ctx: unknown,
  args: { receiptUploadId: Id<"receiptUploads"> },
) => Promise<void>;

const deleteReceiptFile = (
  deleteFile as unknown as { _handler: DeleteFileHandler }
)._handler;

type ProcessReceiptHandler = (
  ctx: unknown,
  args: { receiptUploadId: Id<"receiptUploads"> },
) => Promise<unknown>;

const processAuthorizedReceipt = (
  processReceipt as unknown as { _handler: ProcessReceiptHandler }
)._handler;

describe("receipt storage authorization", () => {
  it("rejects a signed-in user outside the receipt household", async () => {
    const receiptUploadId = "receipt_1" as Id<"receiptUploads">;
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;

    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({
          _id: receiptUploadId,
          householdId,
          uploadedBy: "user_2" as Id<"users">,
          storageId: "storage_1" as Id<"_storage">,
        }),
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : null,
          }),
        }),
      },
      storage: { getUrl: jest.fn(async () => "https://receipt.test") },
    };

    await expect(getReceiptUrl(ctx, { receiptUploadId })).rejects.toThrow(
      "You do not have access to this receipt",
    );
    expect(ctx.storage.getUrl).not.toHaveBeenCalled();
  });

  it("rejects OCR processing without an authenticated caller", async () => {
    await expect(
      processAuthorizedReceipt(
        {
          auth: { getUserIdentity: async () => null },
          runQuery: jest.fn(),
          storage: { getUrl: jest.fn() },
        },
        {
          receiptUploadId:
            "receipt_1" as Id<"receiptUploads">,
        },
      ),
    ).rejects.toThrow("Not authenticated");
  });

  it("rejects deleting a receipt from another household", async () => {
    const receiptUploadId = "receipt_1" as Id<"receiptUploads">;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({
          _id: receiptUploadId,
          householdId: "household_1" as Id<"households">,
          uploadedBy: "user_2" as Id<"users">,
          storageId: "storage_1" as Id<"_storage">,
        }),
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: "user_1" as Id<"users"> }
                : null,
          }),
        }),
        delete: jest.fn(),
      },
      storage: { delete: jest.fn() },
    };

    await expect(
      deleteReceiptFile(ctx, { receiptUploadId }),
    ).rejects.toThrow("You do not have access to this receipt");
    expect(ctx.storage.delete).not.toHaveBeenCalled();
    expect(ctx.db.delete).not.toHaveBeenCalled();
  });

  it("rejects OCR processing for a receipt from another household", async () => {
    const authorizationError = new Error(
      "You do not have access to this receipt",
    );
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      runQuery: jest.fn(async () => {
        throw authorizationError;
      }),
      storage: { getUrl: jest.fn() },
    };

    await expect(
      processAuthorizedReceipt(ctx, {
        receiptUploadId: "receipt_1" as Id<"receiptUploads">,
      }),
    ).rejects.toThrow("You do not have access to this receipt");
    expect(ctx.storage.getUrl).not.toHaveBeenCalled();
  });
});
