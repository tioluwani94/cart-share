import type { Id } from "./_generated/dataModel";
import { ensureCurrent, syncExistingFromClerk, updateDisplayName } from "./users";

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

const saveDisplayName = (
  updateDisplayName as unknown as {
    _handler: (ctx: unknown, args: { name: string }) => Promise<void>;
  }
)._handler;

describe("display name persistence", () => {
  function fixture({ signedIn = true, deleted = false, missing = false } = {}) {
    const user: { _id: string; name?: string; hasCustomName?: boolean } = {
      _id: "user_1",
      name: "Provider name",
    };
    const eq = jest.fn();
    const patch = jest.fn(async (_id, changes) => Object.assign(user, changes));
    const ctx = {
      auth: {
        getUserIdentity: async () => signedIn
          ? { subject: "clerk_1", email: "member@example.com", name: "Old provider name" }
          : null,
      },
      db: {
        query: (table: string) => ({
          withIndex: (_index: string, filter: (q: { eq: typeof eq }) => unknown) => {
            filter({ eq });
            return { unique: async () => table === "accountDeletionTombstones"
              ? (deleted ? { _id: "tombstone" } : null)
              : (missing ? null : user) };
          },
        }),
        patch,
      },
    };
    return { ctx, user, patch, eq };
  }

  it("saves the authenticated user's name and retains it across login and webhooks", async () => {
    const { ctx, user, patch, eq } = fixture();
    await saveDisplayName(ctx, { name: "  Tíolu   Kolawole  " });
    expect(eq).toHaveBeenCalledWith("clerkId", "clerk_1");
    expect(patch).toHaveBeenCalledWith("user_1", expect.objectContaining({
      name: "Tíolu Kolawole", hasCustomName: true,
    }));
    await ensureSignedInUser(ctx, {});
    await syncExistingUser(ctx, { clerkId: "clerk_1", email: "member@example.com", name: "Old provider name" });
    await syncExistingUser(ctx, { clerkId: "clerk_1", email: "member@example.com" });
    expect(user.name).toBe("Tíolu Kolawole");
  });

  it("preserves a provider name when a later Apple webhook omits it", async () => {
    const { ctx, user } = fixture();
    await syncExistingUser(ctx, { clerkId: "clerk_1", email: "member@example.com" });
    expect(user.name).toBe("Provider name");
  });

  it("still refreshes names for users who have not chosen their own", async () => {
    const { ctx, user } = fixture();
    await syncExistingUser(ctx, { clerkId: "clerk_1", email: "member@example.com", name: "Updated provider name" });
    expect(user.name).toBe("Updated provider name");
  });

  it.each(["", "   ", "a".repeat(61)])("rejects invalid names without writing", async (name) => {
    const { ctx, patch } = fixture();
    await expect(saveDisplayName(ctx, { name })).rejects.toThrow("between 1 and 60");
    expect(patch).not.toHaveBeenCalled();
  });

  it.each([
    [{ signedIn: false }, "Not authenticated"],
    [{ deleted: true }, "Account is being deleted"],
    [{ missing: true }, "User not found"],
  ] as const)("refuses unavailable accounts: %j", async (options, message) => {
    const { ctx, patch } = fixture(options);
    await expect(saveDisplayName(ctx, { name: "Tio" })).rejects.toThrow(message);
    expect(patch).not.toHaveBeenCalled();
  });
});

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
