import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/expo";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState, type PropsWithChildren } from "react";

/**
 * Keeps authenticated app providers unmounted until the caller's Convex user
 * record exists. Signed-out content remains available for the welcome flow.
 */
export function AuthenticatedUserBoundary({
  children,
}: PropsWithChildren) {
  const { isLoaded, isSignedIn, signOut, userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrent);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !isAuthenticated) {
      setReadyUserId(null);
      setBootstrapError(null);
      return;
    }

    let active = true;
    setBootstrapError(null);
    void ensureCurrentUser()
      .then(async (ensuredUserId) => {
        if (!active) return;
        if (!ensuredUserId) {
          await signOut();
          return;
        }
        setReadyUserId(userId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBootstrapError(
          error instanceof Error
            ? error
            : new Error("Could not prepare your account."),
        );
      });

    return () => {
      active = false;
    };
  }, [ensureCurrentUser, isAuthenticated, isLoaded, isSignedIn, signOut, userId]);

  if (bootstrapError) throw bootstrapError;
  if (isSignedIn && (!isAuthenticated || readyUserId !== userId)) return null;

  return children;
}
