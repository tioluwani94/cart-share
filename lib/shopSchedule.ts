const pad = (value: number) => String(value).padStart(2, "0");

export function shopScheduleFields(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

/** Interpret the calendar and clock in the household zone, not the device zone. */
export function shopScheduleTimestamp(
  date: string,
  time: string,
  timeZone: string,
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (
    hour > 23 ||
    minute > 59 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const local = shopScheduleFields(candidate, timeZone);
    if (local.date === date && local.time === time) return candidate;
    const [y, m, d] = local.date.split("-").map(Number);
    const [h, min] = local.time.split(":").map(Number);
    candidate += target - Date.UTC(y, m - 1, d, h, min);
  }
  // Reject invalid calendar dates and clocks skipped by daylight-saving changes.
  return null;
}

export function shopCalendarMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return {
    timestamp: first.getTime(),
    cells: [
      ...Array<string | null>((first.getUTCDay() + 6) % 7).fill(null),
      ...Array.from(
        { length: count },
        (_, index) => `${year}-${pad(number)}-${pad(index + 1)}`,
      ),
    ],
  };
}

export function moveShopCalendarMonth(month: string, delta: number) {
  const [year, number] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`;
}
