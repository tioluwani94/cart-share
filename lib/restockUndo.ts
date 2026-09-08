/** Stable comparison of server-owned flat Convex records, including optional fields. */
export function restockSnapshot(record: object): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(record)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}
