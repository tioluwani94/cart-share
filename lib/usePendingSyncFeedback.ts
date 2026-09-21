import { useEffect, useState } from "react";
import type { OfflineOperation } from "./offlineQueue";

/** Show saved-on-device feedback immediately offline, with a grace period online. */
export function usePendingSyncFeedback(queue: OfflineOperation[], isOnline: boolean) {
  const oldestId = queue[0]?.id;
  const queuedAt = queue[0]?.queuedAt;
  const [announcedId, setAnnouncedId] = useState<string | null>(null);
  useEffect(() => {
    if (!oldestId || queuedAt === undefined) return;
    const timer = setTimeout(
      () => setAnnouncedId(oldestId),
      Math.max(0, queuedAt + 1000 - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [oldestId, queuedAt]);
  return Boolean(oldestId && queuedAt !== undefined && (
    !isOnline || announcedId === oldestId || Date.now() - queuedAt >= 1000
  ));
}
