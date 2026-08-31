export function routeOwnsForegroundQueue(
  rootSegment: string | undefined,
  childSegment: string | undefined,
): boolean {
  if (rootSegment === "list" || rootSegment === "restock-review") return true;
  return (
    rootSegment === "(tabs)" &&
    (childSegment === undefined ||
      childSegment === "index" ||
      childSegment === "shop")
  );
}
