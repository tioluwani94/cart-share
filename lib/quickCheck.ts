export function quickCheckProgress(
  sessionIds: readonly string[],
  remainingIds: readonly string[],
) {
  const remaining = new Set(remainingIds);
  return {
    total: sessionIds.length,
    checked: sessionIds.filter((id) => !remaining.has(id)).length,
  };
}

export function quickCheckEmptyKind({
  total,
  tracked,
  active,
  learning,
}: {
  total: number;
  tracked: number;
  active: number;
  learning: number;
}): "done" | "new" | "learning" | "paused" | "quiet" {
  if (total > 0) return "done";
  if (!tracked) return learning > 0 ? "learning" : "new";
  return active === 0 ? "paused" : "quiet";
}
