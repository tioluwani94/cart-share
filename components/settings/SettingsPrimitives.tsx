import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import { Check, ChevronRight } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import {
  Pressable,
  Switch,
  Text,
  View,
  type AccessibilityState,
} from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type SettingsIconTone = "coral" | "teal" | "neutral" | "danger";

const iconToneClasses: Record<SettingsIconTone, string> = {
  coral: "bg-coral-soft",
  teal: "bg-teal-soft",
  neutral: "bg-warm-gray-100",
  danger: "bg-red-50",
};

const DISCLOSURE_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const SECTION_LAYOUT = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  children,
  footer,
  className,
}: SettingsSectionProps) {
  return (
    <View className={cn("mt-7", className)}>
      <Text
        accessibilityRole="header"
        className="mb-2 px-1 text-[15px] font-semibold leading-5 text-ink-secondary"
      >
        {title}
      </Text>
      <Animated.View
        layout={SECTION_LAYOUT}
        className="overflow-hidden rounded-2xl border border-separator bg-surface"
      >
        {children}
      </Animated.View>
      {footer ? (
        typeof footer === "string" ? (
          <Text className="mt-2 px-1 text-[13px] leading-[18px] text-ink-secondary">
            {footer}
          </Text>
        ) : (
          <View className="mt-2 px-1">{footer}</View>
        )
      ) : null}
    </View>
  );
}

interface DisclosureIndicatorProps {
  expanded?: boolean;
}

function DisclosureIndicator({ expanded }: DisclosureIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(expanded ? 90 : 0);

  useEffect(() => {
    const target = expanded ? 90 : 0;
    rotation.set(
      reduceMotion
        ? target
        : withTiming(target, {
            duration: 160,
            easing: DISCLOSURE_EASING,
          }),
    );
  }, [expanded, reduceMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ChevronRight
        size={20}
        color={themeColors.secondaryInk}
        strokeWidth={2}
      />
    </Animated.View>
  );
}

export interface SettingsRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  icon?: ReactNode;
  iconTone?: SettingsIconTone;
  trailing?: ReactNode;
  trailingValue?: string;
  disclosure?: boolean;
  expanded?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: "button" | "radio";
  accessibilityState?: AccessibilityState;
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
}

export function SettingsRow({
  title,
  subtitle,
  leading,
  icon,
  iconTone = "neutral",
  trailing,
  trailingValue,
  disclosure = false,
  expanded,
  onPress,
  disabled = false,
  destructive = false,
  isLast = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  accessibilityState,
  titleClassName,
  subtitleClassName,
  className,
}: SettingsRowProps) {
  const contents = (
    <>
      {leading ? (
        <View className="mr-3 h-10 w-10 items-center justify-center">
          {leading}
        </View>
      ) : icon ? (
        <View
          className={cn(
            "mr-3 h-9 w-9 items-center justify-center rounded-xl",
            iconToneClasses[iconTone],
          )}
        >
          {icon}
        </View>
      ) : null}

      <View className="min-w-0 flex-1 py-0.5">
        {typeof title === "string" ? (
          <Text
            className={cn(
              "font-heading text-[17px] leading-[22px]",
              destructive ? "text-red-700" : "text-ink",
              titleClassName,
            )}
          >
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text
              className={cn(
                "mt-0.5 text-[14px] leading-5 text-ink-secondary",
                subtitleClassName,
              )}
            >
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>

      {trailingValue ? (
        <Text className="ml-3 text-[15px] leading-5 text-ink-secondary">
          {trailingValue}
        </Text>
      ) : null}
      {trailing ? <View className="ml-3">{trailing}</View> : null}
      {disclosure ? (
        <View className="ml-2">
          <DisclosureIndicator expanded={expanded} />
        </View>
      ) : null}
    </>
  );
  const rowClassName = cn(
    "min-h-16 flex-row items-center px-4 py-3",
    !isLast && "border-b border-separator",
    disabled && "opacity-50",
    className,
  );

  if (!onPress) {
    return <View className={rowClassName}>{contents}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      pressRetentionOffset={16}
      className={cn(rowClassName, "active:bg-warm-gray-50")}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        disabled,
        ...(expanded === undefined ? {} : { expanded }),
        ...accessibilityState,
      }}
    >
      {contents}
    </Pressable>
  );
}

interface SettingsToggleRowProps
  extends Omit<
    SettingsRowProps,
    "accessibilityLabel" | "accessibilityRole" | "onPress" | "trailing"
  > {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  switchTint?: "coral" | "teal";
}

export function SettingsToggleRow({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  switchTint = "coral",
  ...rowProps
}: SettingsToggleRowProps) {
  const tint = switchTint === "teal" ? themeColors.teal : themeColors.coral;
  const tintSoft =
    switchTint === "teal" ? themeColors.tealSoft : themeColors.coralSoft;

  return (
    <SettingsRow
      {...rowProps}
      disabled={disabled}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: themeColors.disabled, true: tintSoft }}
          thumbColor={value ? tint : themeColors.surface}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled }}
        />
      }
    />
  );
}

interface SettingsChoiceRowProps {
  label: string;
  supportingText?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
}

export function SettingsChoiceRow({
  label,
  supportingText,
  selected,
  onPress,
  disabled = false,
  isLast = false,
  accessibilityLabel,
}: SettingsChoiceRowProps) {
  return (
    <SettingsRow
      title={label}
      subtitle={supportingText}
      onPress={onPress}
      disabled={disabled}
      isLast={isLast}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      trailing={
        selected ? (
          <View className="h-7 w-7 items-center justify-center rounded-full bg-coral">
            <Check size={17} color={themeColors.surface} strokeWidth={2.5} />
          </View>
        ) : (
          <View className="h-7 w-7 rounded-full border-2 border-separator" />
        )
      }
    />
  );
}
