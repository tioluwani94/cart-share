import { useEffect, useState, type PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { recoverPendingAccountDeletionCleanup } from "./accountDeletionCleanup";

/** Blocks all app providers until interrupted account-deletion cleanup is safe. */
export function AccountDeletionCleanupBoundary({
  children,
}: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [cleanupError, setCleanupError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setCleanupError(null);
    void recoverPendingAccountDeletionCleanup()
      .then(() => {
        if (active) setIsReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCleanupError(
          error instanceof Error
            ? error
            : new Error("Could not remove deleted account data."),
        );
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (cleanupError) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light px-8">
        <Text className="text-center text-2xl font-bold text-ink">
          Finishing account cleanup
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-muted">
          We couldn't remove this device's local account data yet. Your account
          stays locked until cleanup succeeds.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry account cleanup"
          className="mt-7 min-h-14 w-full items-center justify-center rounded-full bg-coral px-6"
          onPress={() => setAttempt((current) => current + 1)}
        >
          <Text className="text-base font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }
  if (!isReady) return null;
  return children;
}
