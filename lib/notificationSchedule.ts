const QUIET_HOURS_START_MINUTES = 20 * 60;
const QUIET_HOURS_END_MINUTES = 8 * 60;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function localParts(timestamp: number, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function addLocalDays(parts: LocalParts, days: number): LocalParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return {
    ...parts,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function localDateTimeToUtc(parts: LocalParts, timeZone: string): number {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  let candidate = targetAsUtc;

  // Iteratively correct the UTC guess by comparing how that instant renders
  // in the target IANA zone. Evening reminder times avoid DST ambiguity.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rendered = localParts(candidate, timeZone);
    const renderedAsUtc = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
    );
    const correction = targetAsUtc - renderedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return candidate;
}

export function nextLocalDeliveryTime({
  notBefore,
  timeMinutesLocal,
  timeZone,
}: {
  notBefore: number;
  timeMinutesLocal: number;
  timeZone: string;
}): number {
  const requestedMinutes = Math.round(timeMinutesLocal);
  const afterQuietStart = requestedMinutes >= QUIET_HOURS_START_MINUTES;
  const beforeQuietEnd = requestedMinutes < QUIET_HOURS_END_MINUTES;
  const deliveryMinutes =
    afterQuietStart || beforeQuietEnd
      ? QUIET_HOURS_END_MINUTES
      : requestedMinutes;
  let target = localParts(notBefore, timeZone);
  if (afterQuietStart) target = addLocalDays(target, 1);
  target.hour = Math.floor(deliveryMinutes / 60);
  target.minute = deliveryMinutes % 60;

  let candidate = localDateTimeToUtc(target, timeZone);
  if (candidate < notBefore) {
    target = addLocalDays(target, 1);
    candidate = localDateTimeToUtc(target, timeZone);
  }
  return candidate;
}
