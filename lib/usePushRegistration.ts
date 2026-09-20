import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { registerForPushNotifications } from "./pushNotifications";
import {
  restorePushRegistration,
  resumePushRegistration,
} from "./pushRegistrationLifecycle";

export function usePushRegistration({
  userId,
  authenticated,
  preference,
}: {
  userId: string | null | undefined;
  authenticated: boolean;
  preference:
    | {
        viewerClerkId?: string;
        restockNotificationsEnabled: boolean;
        householdActivityEnabled?: boolean;
      }
    | null
    | undefined;
}): void {
  const registerDevice = useMutation(api.notifications.registerDevice);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  // Only an actual auth transition may release the sign-out barrier.
  useEffect(() => {
    if (userId && authenticated) resumePushRegistration();
  }, [userId, authenticated]);
  const viewer = preference?.viewerClerkId;
  const reminders = preference?.restockNotificationsEnabled;
  const activity = preference?.householdActivityEnabled;
  useEffect(() => {
    if (!authenticated || !userId || viewer !== userId) return;
    let active = true;
    let running = false;
    const restore = async () => {
      if (running) return;
      running = true;
      try {
        await restorePushRegistration(async (isCurrent) => {
          const registration = await registerForPushNotifications({
            requestPermission: false,
          });
          if (
            !active ||
            !isCurrent() ||
            currentUser.current !== userId ||
            registration.status !== "granted"
          )
            return;
          await registerDevice({
            token: registration.token,
            platform: registration.platform,
            deviceId: registration.deviceId,
            expectedClerkId: userId,
            restoreOnly: true,
          });
        });
      } catch {
        // A later foreground transition retries transient token/network failures.
        console.warn(
          "Push registration could not refresh; it will retry when the app becomes active.",
        );
      } finally {
        running = false;
      }
    };
    void restore();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void restore();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [authenticated, userId, viewer, reminders, activity, registerDevice]);
}
