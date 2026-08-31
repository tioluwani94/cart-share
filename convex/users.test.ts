import type { Id } from "./_generated/dataModel";
import { ensureCurrent } from "./users";

type EnsureCurrentHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<Id<"users">>;

const ensureSignedInUser = (
  ensureCurrent as unknown as { _handler: EnsureCurrentHandler }
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
});
