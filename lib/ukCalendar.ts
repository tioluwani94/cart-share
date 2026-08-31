const UK_TIME_ZONE = "Europe/London";

const ukDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getParts(timestamp: number): Record<string, number> {
  return Object.fromEntries(
    ukDateTimeFormatter
      .formatToParts(timestamp)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function getUkOffsetMs(timestamp: number): number {
  const parts = getParts(timestamp);
  const wholeSecondTimestamp = Math.floor(timestamp / 1000) * 1000;
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) - wholeSecondTimestamp
  );
}

function getLondonMidnight(year: number, month: number): number {
  const normalized = new Date(Date.UTC(year, month, 1));
  const utcGuess = Date.UTC(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth(),
    1,
  );
  let timestamp = utcGuess;
  // A second pass handles offsets where the first UTC guess falls on the
  // other side of a clock change.
  for (let pass = 0; pass < 2; pass += 1) {
    timestamp = utcGuess - getUkOffsetMs(timestamp);
  }
  return timestamp;
}

export function getUkMonthRange(year: number, month: number): {
  start: number;
  endExclusive: number;
} {
  return {
    start: getLondonMidnight(year, month),
    endExclusive: getLondonMidnight(year, month + 1),
  };
}

export function getUkYearMonth(timestamp: number): {
  year: number;
  month: number;
} {
  const parts = getParts(timestamp);
  return { year: parts.year, month: parts.month - 1 };
}
