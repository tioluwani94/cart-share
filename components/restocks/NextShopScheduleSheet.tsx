import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSegmentedControl,
  GlassSheetHeader,
  Input,
  type GlassBottomSheetRef,
} from "@/components/ui";
import { themeColors } from "@/lib/theme";
import type { ShoppingMode } from "@/lib/shoppingList";
import {
  moveShopCalendarMonth,
  shopCalendarMonth,
  shopScheduleFields,
  shopScheduleTimestamp,
} from "@/lib/shopSchedule";

interface Props {
  plannedFor?: number;
  shoppingMode: ShoppingMode;
  timeZone: string;
  locale: string;
  isOnline: boolean;
  onSave: (plannedFor: number, shoppingMode: ShoppingMode) => Promise<void>;
  onClose: () => void;
}

/** Mounted afresh for each edit so Cancel never leaks an unsaved draft. */
export function NextShopScheduleSheet({
  plannedFor,
  shoppingMode,
  timeZone,
  locale,
  isOnline,
  onSave,
  onClose,
}: Props) {
  const sheet = useRef<GlassBottomSheetRef>(null);
  useEffect(() => {
    sheet.current?.present();
  }, []);
  const initial = useMemo(
    () => shopScheduleFields(plannedFor ?? Date.now() + 86400000, timeZone),
    [plannedFor, timeZone],
  );
  const [date, setDate] = useState(initial.date);
  const [month, setMonth] = useState(initial.date.slice(0, 7));
  const [time, setTime] = useState(plannedFor ? initial.time : "10:00");
  const [mode, setMode] = useState(shoppingMode);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const today = shopScheduleFields(Date.now(), timeZone).date;
  const calendar = shopCalendarMonth(month);
  const save = async () => {
    if (savingRef.current || !isOnline) return;
    Keyboard.dismiss();
    const timestamp = shopScheduleTimestamp(date, time.trim(), timeZone);
    if (timestamp === null) {
      setError(
        "Enter a valid time in 24-hour format, like 10:30. This time must exist in your household’s time zone.",
      );
      return;
    }
    if (timestamp <= Date.now()) {
      setError("Choose a date and time in the future.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(timestamp, mode);
      sheet.current?.dismiss();
    } catch {
      setError("We couldn’t save your next shop. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <GlassBottomSheet
      ref={sheet}
      snapPoints={["85%"]}
      dismissible={!saving}
      onDismiss={onClose}
    >
      <GlassBottomSheetScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <GlassSheetHeader
          title="When’s your next shop?"
          description="Choose a date, time and how you’ll shop."
          icon={<CalendarDays size={21} color={themeColors.coral} />}
          onClose={() => sheet.current?.dismiss()}
          closeDisabled={saving}
          closeAccessibilityLabel="Close shopping plan editor"
        />
        <View className="rounded-2xl border border-separator bg-white p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Pressable
              disabled={saving || month <= today.slice(0, 7)}
              onPress={() => setMonth(moveShopCalendarMonth(month, -1))}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              className="h-12 w-12 items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft size={20} color={themeColors.ink} />
            </Pressable>
            <Text
              accessibilityRole="header"
              className="flex-1 text-center font-heading text-lg text-ink"
            >
              {new Intl.DateTimeFormat(locale, {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(calendar.timestamp)}
            </Text>
            <Pressable
              disabled={saving}
              onPress={() => setMonth(moveShopCalendarMonth(month, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              className="h-12 w-12 items-center justify-center"
            >
              <ChevronRight size={20} color={themeColors.ink} />
            </Pressable>
          </View>
          <View className="flex-row">
            {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
              <Text
                key={i}
                accessible={false}
                style={{ width: `${100 / 7}%` }}
                className="py-2 text-center text-xs text-ink-secondary"
              >
                {label}
              </Text>
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {calendar.cells.map((day, i) =>
              day ? (
                <Pressable
                  key={day}
                  disabled={saving || day < today}
                  accessibilityRole="button"
                  accessibilityLabel={new Intl.DateTimeFormat(locale, {
                    dateStyle: "full",
                    timeZone: "UTC",
                  }).format(Date.parse(`${day}T12:00:00Z`))}
                  accessibilityState={{
                    selected: date === day,
                    disabled: saving || day < today,
                  }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setDate(day);
                    setError(null);
                  }}
                  style={{ width: `${100 / 7}%`, minHeight: 44 }}
                  className={`items-center justify-center rounded-full ${date === day ? "bg-coral" : ""} ${day < today ? "opacity-30" : ""}`}
                >
                  <Text
                    className={`py-2 text-base ${date === day ? "font-semibold text-white" : "text-ink"}`}
                  >
                    {Number(day.slice(-2))}
                  </Text>
                </Pressable>
              ) : (
                <View key={`blank-${i}`} style={{ width: `${100 / 7}%` }} />
              ),
            )}
          </View>
        </View>
        <Input
          label="Time (24-hour)"
          value={time}
          onChangeText={setTime}
          placeholder="10:30"
          maxLength={5}
          autoCorrect={false}
          autoCapitalize="none"
          editable={!saving}
          containerClassName="mt-5"
        />
        <Text className="mt-2 text-sm leading-5 text-ink-secondary">
          {timeZone.replace(/_/g, " ")} · household time
        </Text>
        <Text className="mb-2 mt-5 font-semibold text-ink">
          How will you shop?
        </Text>
        <GlassSegmentedControl
          value={mode}
          options={[
            { label: "In store", value: "in_store" },
            { label: "Online", value: "online" },
          ]}
          onValueChange={setMode}
          disabled={saving}
          accessibilityLabel="Shopping method"
        />
        {(!isOnline || error) && (
          <Text
            accessibilityRole="alert"
            className="mt-3 text-sm leading-5 text-coral"
          >
            {!isOnline ? "Reconnect to save your shopping plan." : error}
          </Text>
        )}
        <Button
          onPress={() => void save()}
          disabled={!isOnline || saving}
          loading={saving}
          className="mt-5"
        >
          Save plan
        </Button>
      </GlassBottomSheetScrollView>
    </GlassBottomSheet>
  );
}
