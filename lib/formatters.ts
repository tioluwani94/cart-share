export const APP_LOCALE = "en-GB";
export const APP_CURRENCY = "GBP";
export const APP_TIME_ZONE = "Europe/London";

export interface MarketFormattingContext {
  locale: string;
  currency: string;
  timeZone: string;
}

type DateFormattingOptions = Partial<
  Pick<MarketFormattingContext, "locale" | "timeZone">
>;

function dateContext(options?: DateFormattingOptions) {
  return {
    locale: options?.locale ?? APP_LOCALE,
    timeZone: options?.timeZone ?? APP_TIME_ZONE,
  };
}

export function formatMoneyFromMinorUnits(
  minorUnits: number,
  options: Pick<MarketFormattingContext, "locale" | "currency">,
): string {
  return new Intl.NumberFormat(options.locale, {
    style: "currency",
    currency: options.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function formatCurrencyFromPence(pence: number): string {
  return formatMoneyFromMinorUnits(pence, {
    locale: APP_LOCALE,
    currency: APP_CURRENCY,
  });
}

export function formatChartCurrencyFromPence(pence: number): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
    notation: Math.abs(pence) >= 100_000 ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(pence) >= 100_000 ? 1 : 0,
  }).format(pence / 100);
}

export function parseCurrencyInputToPence(value: string): number | null {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized || (normalized.match(/\./g)?.length ?? 0) > 1) {
    return null;
  }
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function formatDate(
  timestamp: number,
  options?: DateFormattingOptions,
): string {
  const context = dateContext(options);
  return new Intl.DateTimeFormat(context.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: context.timeZone,
  }).format(timestamp);
}

export function formatDateWithWeekday(
  timestamp: number,
  options?: DateFormattingOptions,
): string {
  const context = dateContext(options);
  return new Intl.DateTimeFormat(context.locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: context.timeZone,
  }).format(timestamp);
}

export function formatMonthName(
  timestamp: number,
  options?: DateFormattingOptions,
): string {
  const context = dateContext(options);
  return new Intl.DateTimeFormat(context.locale, {
    month: "long",
    timeZone: context.timeZone,
  }).format(timestamp);
}

export function formatMonthShort(
  timestamp: number,
  options?: DateFormattingOptions,
): string {
  const context = dateContext(options);
  return new Intl.DateTimeFormat(context.locale, {
    month: "short",
    timeZone: context.timeZone,
  }).format(timestamp);
}

function calendarSerial(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone,
  }).formatToParts(timestamp);
  const part = (type: "year" | "month" | "day") =>
    Number(parts.find((entry) => entry.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

export function formatFriendlyDate(
  timestamp: number,
  nowTimestamp = Date.now(),
  options?: DateFormattingOptions,
): string {
  const context = dateContext(options);
  const diffDays = Math.round(
    (calendarSerial(nowTimestamp, context.timeZone) -
      calendarSerial(timestamp, context.timeZone)) /
      (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  if (diffDays > 1 && diffDays < 7) {
    const weekday = new Intl.DateTimeFormat(context.locale, {
      weekday: "long",
      timeZone: context.timeZone,
    }).format(timestamp);
    return `Last ${weekday}`;
  }

  return formatDate(timestamp, context);
}

export function createMarketFormatters(context: MarketFormattingContext) {
  return {
    money: (minorUnits: number) =>
      formatMoneyFromMinorUnits(minorUnits, context),
    date: (timestamp: number) => formatDate(timestamp, context),
    dateWithWeekday: (timestamp: number) =>
      formatDateWithWeekday(timestamp, context),
    friendlyDate: (timestamp: number, nowTimestamp = Date.now()) =>
      formatFriendlyDate(timestamp, nowTimestamp, context),
  };
}
