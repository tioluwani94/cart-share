import type { Id } from "./_generated/dataModel";
import { ensureCurrent, syncExistingFromClerk } from "./users";

type EnsureCurrentHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<Id<"users"> | null>;

const ensureSignedInUser = (
  ensureCurrent as unknown as { _handler: EnsureCurrentHandler }
)._handler;

type SyncExistingUserHandler = (
  ctx: unknown,
  args: {
    clerkId: string;
    email: string;
    name?: string;
    imageUrl?: string;
  },
) => Promise<Id<"users"> | null>;

const syncExistingUser = (
  syncExistingFromClerk as unknown as { _handler: SyncExistingUserHandler }
)._handler;

describe("users.ensureCurrent", () => {
  it("recreates the authenticated user from verified identity claims", async () => {
    const userId = "user_1" as Id<"users">;
    const insert = jest.fn(async () => userId);
    const ctx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "clerk_1",
          email: "tiolu@example.com",
          name: "Tiolu",
          pictureUrl: "https://example.com/avatar.png",
        }),
      },
      db: {
        query: () => ({
          withIndex: () => ({ unique: async () => null }),
        }),
        insert,
      },
    };

    await expect(ensureSignedInUser(ctx, {})).resolves.toBe(userId);
    expect(insert).toHaveBeenCalledWith(
      "users",
      expect.objectContaining({
        clerkId: "clerk_1",
        email: "tiolu@example.com",
        name: "Tiolu",
        imageUrl: "https://example.com/avatar.png",
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      }),
    );
  });

  it("does not recreate a user for a stale session after account deletion", async () => {
    const insert = jest.fn();
    const patch = jest.fn();
    const ctx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "clerk_deleted",
          email: "former@example.com",
        }),
      },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "accountDeletionTombstones"
                ? { _id: "tombstone_1", clerkIdDigest: "digest" }
                : { _id: "user_deleting", clerkId: "clerk_deleted" },
          }),
        }),
        insert,
        patch,
      },
    };

    await expect(ensureSignedInUser(ctx, {})).resolves.toBeNull();
    expect(insert).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });
});

describe("users.syncExistingFromClerk", () => {
  it("does not resurrect a user when an upsert webhook arrives after deletion", async () => {
    const insert = jest.fn();
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({ unique: async () => null }),
        }),
        insert,
        patch: jest.fn(),
      },
    };

    await expect(
      syncExistingUser(ctx, {
        clerkId: "clerk_deleted",
        email: "former@example.com",
        name: "Former member",
      }),
    ).resolves.toBeNull();
    expect(insert).not.toHaveBeenCalled();
  });
});
