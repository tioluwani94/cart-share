import { View, Text, Pressable } from "react-native";
import { useState, useEffect } from "react";
import Svg, { Rect, Line, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// Create animated version of Rect
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface MonthData {
  month: number;
  year: number;
  label: string;
  totalCents: number;
  totalDollars: number;
  sessionCount: number;
}

interface SpendingChartProps {
  data: MonthData[];
}

// Chart dimensions
const CHART_HEIGHT = 200;
const CHART_WIDTH = 320;
const BAR_WIDTH = 36;
const BAR_GAP = 16;
const PADDING_LEFT = 45;
const PADDING_BOTTOM = 30;
const PADDING_TOP = 20;
const CORNER_RADIUS = 6;

/**
 * Format cents to dollar string.
 */
function formatDollars(cents: number): string {
  if (cents === 0) return "$0";
  if (cents >= 100000) {
    // $1000+ - show as $1.2k
    return `$${(cents / 100000).toFixed(1)}k`;
  }
  return `$${Math.round(cents / 100)}`;
}

/**
 * Individual animated bar component with tooltip.
 */
function AnimatedBar({
  x,
  maxHeight,
  barHeight,
  index,
  data,
  onPress,
  isSelected,
}: {
  x: number;
  maxHeight: number;
  barHeight: number;
  index: number;
  data: MonthData;
  onPress: () => void;
  isSelected: boolean;
}) {
  // Animated height value - starts at 0 and animates to target height
  const animatedHeight = useSharedValue(0);
  const y = PADDING_TOP + maxHeight - barHeight;

  // Animate bar height on mount with sequential delay
  useEffect(() => {
    animatedHeight.value = withDelay(
      index * 100, // Stagger each bar by 100ms
      withSpring(barHeight, {
        damping: 12,
        stiffness: 80,
        mass: 1,
      })
    );
  }, [barHeight, index]);

  const animatedProps = useAnimatedProps(() => {
    return {
      height: animatedHeight.value,
      y: PADDING_TOP + maxHeight - animatedHeight.value,
    };
  });

  // Coral color with lighter variant for hover/selected state
  const fillColor = isSelected ? "#FF8585" : "#FF6B6B";

  return (
    <G>
      {/* Pressable overlay for touch detection */}
      <Rect
        x={x}
        y={PADDING_TOP}
        width={BAR_WIDTH}
        height={maxHeight}
        fill="transparent"
        onPress={onPress}
      />
      {/* Animated bar with rounded top corners */}
      <AnimatedRect
        animatedProps={animatedProps}
        x={x}
        width={BAR_WIDTH}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
        fill={fillColor}
      />
    </G>
  );
}

/**
 * Tooltip component showing exact amount.
 */
function Tooltip({
  data,
  x,
  onClose,
}: {
  data: MonthData;
  x: number;
  onClose: () => void;
}) {
  const formattedAmount = (data.totalCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      className="absolute bg-warm-gray-900 rounded-xl px-3 py-2 shadow-lg"
      style={{
        top: -10,
        left: Math.min(Math.max(x - 40, 10), CHART_WIDTH - 100),
      }}
    >
      <Pressable onPress={onClose}>
        <Text className="text-white font-bold text-sm">{formattedAmount}</Text>
        <Text className="text-warm-gray-400 text-xs mt-0.5">
          {data.label} {data.year}
          {data.sessionCount > 0 && ` · ${data.sessionCount} trip${data.sessionCount === 1 ? "" : "s"}`}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Animated spending bar chart for the analytics screen.
 * Shows last 6 months of spending with coral bars and rounded tops.
 * Bars animate in sequentially on load.
 */
export function SpendingChart({ data }: SpendingChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map((d) => d.totalCents), 100); // Minimum 100 cents to avoid division by 0
  const maxBarHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Calculate Y-axis labels (0, mid, max)
  const yLabels = [0, Math.round(maxValue / 2), maxValue];

  // Handle bar press
  const handleBarPress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  // Calculate bar positions
  const totalBarsWidth = data.length * BAR_WIDTH + (data.length - 1) * BAR_GAP;
  const startX = PADDING_LEFT + (CHART_WIDTH - PADDING_LEFT - totalBarsWidth) / 2;

  return (
    <View
      className="relative"
      accessibilityRole="image"
      accessibilityLabel={`Spending chart showing ${data.length} months. ${
        data.filter((d) => d.totalCents > 0).length > 0
          ? `Highest spending was ${formatDollars(maxValue)} in ${
              data.find((d) => d.totalCents === maxValue)?.label ?? ""
            }.`
          : "No spending data available."
      }`}
    >
      {/* Tooltip */}
      {selectedIndex !== null && (
        <Tooltip
          data={data[selectedIndex]}
          x={startX + selectedIndex * (BAR_WIDTH + BAR_GAP)}
          onClose={() => setSelectedIndex(null)}
        />
      )}

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Y-axis gridlines and labels */}
        {yLabels.map((value, i) => {
          const y =
            PADDING_TOP +
            maxBarHeight -
            (value / maxValue) * maxBarHeight;
          return (
            <G key={`grid-${i}`}>
              {/* Gridline */}
              <Line
                x1={PADDING_LEFT}
                y1={y}
                x2={CHART_WIDTH - 10}
                y2={y}
                stroke="#E5E5E0"
                strokeWidth={1}
                strokeDasharray={i === 0 ? "0" : "4,4"}
              />
            </G>
          );
        })}

        {/* Y-axis labels */}
        {yLabels.map((value, i) => {
          const y =
            PADDING_TOP +
            maxBarHeight -
            (value / maxValue) * maxBarHeight;
          return (
            <G key={`label-y-${i}`}>
              {/* Use a foreign object for text with NativeWind styling isn't possible in SVG */}
            </G>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.totalCents / maxValue) * maxBarHeight;
          const x = startX + index * (BAR_WIDTH + BAR_GAP);

          return (
            <AnimatedBar
              key={`bar-${item.month}-${item.year}`}
              x={x}
              maxHeight={maxBarHeight}
              barHeight={Math.max(barHeight, 4)} // Minimum 4px height for visibility
              index={index}
              data={item}
              onPress={() => handleBarPress(index)}
              isSelected={selectedIndex === index}
            />
          );
        })}
      </Svg>

      {/* Y-axis labels (rendered as React Native Text for better styling) */}
      <View
        className="absolute left-0"
        style={{ top: PADDING_TOP, height: maxBarHeight }}
        pointerEvents="none"
      >
        {yLabels
          .slice()
          .reverse()
          .map((value, i) => (
            <Text
              key={`y-label-${i}`}
              className="text-xs text-warm-gray-500 absolute right-1"
              style={{
                top: i * (maxBarHeight / 2) - 6,
              }}
            >
              {formatDollars(value)}
            </Text>
          ))}
      </View>

      {/* X-axis labels */}
      <View
        className="absolute flex-row"
        style={{
          bottom: 0,
          left: startX,
          width: totalBarsWidth,
        }}
        pointerEvents="none"
      >
        {data.map((item, index) => (
          <Text
            key={`x-label-${item.month}-${item.year}`}
            className={`text-xs ${
              selectedIndex === index
                ? "text-coral font-semibold"
                : "text-warm-gray-500"
            }`}
            style={{
              width: BAR_WIDTH,
              marginRight: index < data.length - 1 ? BAR_GAP : 0,
              textAlign: "center",
            }}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
