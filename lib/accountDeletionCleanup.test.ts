import * as SecureStore from "expo-secure-store";
import { clearAllOrThrow } from "./storage";
import { clearClerkTokenCache } from "./clerkTokenCache";
import {
  cancelAccountDeletionCleanup,
  finishAccountDeletionLocalCleanup,
  markAccountDeletionCleanupRequired,
  recoverPendingAccountDeletionCleanup,
} from "./accountDeletionCleanup";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock("./storage", () => ({
  clearAllOrThrow: jest.fn(),
}));

jest.mock("./clerkTokenCache", () => ({
  clearClerkTokenCache: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);
const mockedClearAllOrThrow = jest.mocked(clearAllOrThrow);
const mockedClearClerkTokenCache = jest.mocked(clearClerkTokenCache);

describe("account deletion local cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    mockedClearClerkTokenCache.mockResolvedValue(undefined);
  });

  it("persists intent before remote deletion and can cancel after refusal", async () => {
    await markAccountDeletionCleanupRequired();
    await cancelAccountDeletionCleanup();

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining("account-deletion"),
      "required",
    );
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      expect.stringContaining("account-deletion"),
    );
  });

  it("clears MMKV before removing the durable recovery marker", async () => {
    await finishAccountDeletionLocalCleanup();

    expect(mockedClearAllOrThrow).toHaveBeenCalledTimes(1);
    expect(mockedClearClerkTokenCache).toHaveBeenCalledTimes(1);
    expect(mockedClearAllOrThrow.mock.invocationCallOrder[0]).toBeLessThan(
      mockedClearClerkTokenCache.mock.invocationCallOrder[0],
    );
    expect(mockedClearClerkTokenCache.mock.invocationCallOrder[0]).toBeLessThan(
      mockedSecureStore.deleteItemAsync.mock.invocationCallOrder[0],
    );
  });

  it("recovers a pending cleanup before the app continues", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("required");

    await expect(recoverPendingAccountDeletionCleanup()).resolves.toBe(true);
    expect(mockedClearAllOrThrow).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  it("uses a SecureStore-compatible recovery key", async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (!/^[A-Za-z0-9._-]+$/.test(key)) {
        throw new Error("Invalid SecureStore key");
      }
      return null;
    });

    await expect(recoverPendingAccountDeletionCleanup()).resolves.toBe(false);
  });

  it("keeps the recovery marker when MMKV erasure fails", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("required");
    mockedClearAllOrThrow.mockImplementationOnce(() => {
      throw new Error("MMKV unavailable");
    });

    await expect(recoverPendingAccountDeletionCleanup()).rejects.toThrow(
      "MMKV unavailable",
    );
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
