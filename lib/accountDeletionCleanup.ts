import * as SecureStore from "expo-secure-store";
import { clearClerkTokenCache } from "./clerkTokenCache";
import { clearAllOrThrow } from "./storage";

const ACCOUNT_DELETION_CLEANUP_KEY =
  "ourpantry.account-deletion-cleanup-required";

/** Persist deletion intent before the irreversible provider request begins. */
export async function markAccountDeletionCleanupRequired(): Promise<void> {
  await SecureStore.setItemAsync(ACCOUNT_DELETION_CLEANUP_KEY, "required");
}

/** Remove the marker when the provider definitively refuses deletion. */
export async function cancelAccountDeletionCleanup(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCOUNT_DELETION_CLEANUP_KEY);
}

/** Erase local app data, then remove the recovery marker only after verification. */
export async function finishAccountDeletionLocalCleanup(): Promise<void> {
  clearAllOrThrow();
  await clearClerkTokenCache();
  await SecureStore.deleteItemAsync(ACCOUNT_DELETION_CLEANUP_KEY);
}

/** Finish interrupted deletion cleanup before auth or protected providers mount. */
export async function recoverPendingAccountDeletionCleanup(): Promise<boolean> {
  const cleanupRequired = await SecureStore.getItemAsync(
    ACCOUNT_DELETION_CLEANUP_KEY,
  );
  if (cleanupRequired === null) return false;

  await finishAccountDeletionLocalCleanup();
  return true;
}
