import * as SecureStore from "expo-secure-store";
import { clearClerkTokenCache, clerkTokenCache } from "./clerkTokenCache";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe("Clerk token cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it("durably tracks every provider token key it reads", async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key) =>
      key === "future_clerk_key" ? "jwt" : null,
    );

    await expect(clerkTokenCache.getToken("future_clerk_key")).resolves.toBe(
      "jwt",
    );
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining("token-cache-keys"),
      JSON.stringify(["future_clerk_key"]),
    );
  });

  it("removes current and previously observed provider tokens", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify(["future_clerk_key"]),
    );

    await clearClerkTokenCache();

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "__clerk_client_jwt",
    );
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "future_clerk_key",
    );
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      expect.stringContaining("token-cache-keys"),
    );
  });

  it("uses only SecureStore-compatible bookkeeping keys", async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (!/^[A-Za-z0-9._-]+$/.test(key)) {
        throw new Error("Invalid SecureStore key");
      }
      return null;
    });

    await expect(clearClerkTokenCache()).resolves.toBeUndefined();
  });
});
