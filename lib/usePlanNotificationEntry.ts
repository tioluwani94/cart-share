import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

/** Consume each notification entry once; attribution ends when Plan loses focus. */
export function usePlanNotificationEntry() {
  const { source, notificationId } = useLocalSearchParams<{
    source?: string;
    notificationId?: string;
  }>();
  const router = useRouter();
  const isFocused = useIsFocused();
  const sequence = useRef(0);
  const [entryId, setEntryId] = useState<string | null>(null);
  const isEnteringNotification = isFocused && source === "notification";

  useEffect(() => {
    if (!isFocused) {
      setEntryId(null);
    } else if (source === "notification") {
      setEntryId(`${notificationId ?? "link"}:${++sequence.current}`);
      router.setParams({ source: undefined, notificationId: undefined });
    }
  }, [isFocused, notificationId, router, source]);

  const entrySource: "notification" | "plan" =
    isFocused && (entryId !== null || isEnteringNotification)
      ? "notification"
      : "plan";
  return {
    entryId: isFocused ? entryId : null,
    isFocused,
    isEnteringNotification,
    source: entrySource,
  };
}
