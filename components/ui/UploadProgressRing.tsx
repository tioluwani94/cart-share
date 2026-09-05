import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  ReduceMotion,
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface UploadProgressRingProps {
  /** Progress value from 0 to 100 */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Whether upload is in progress (shows animated state) */
  isUploading?: boolean;
  /** Custom message to display */
  message?: string;
}

// Playful messages that rotate during upload
const UPLOAD_MESSAGES = [
  "Crunching numbers...",
  "Reading your receipt...",
  "Almost there...",
  "Working on it...",
  "Scanning details...",
];

export function UploadProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  isUploading = false,
  message,
}: UploadProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const animatedProgress = useSharedValue(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate progress changes
  useEffect(() => {
    cancelAnimation(animatedProgress);
    animatedProgress.set(
      reduceMotion
        ? clampedProgress
        : withTiming(clampedProgress, {
            duration: 220,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.System,
          }),
    );

    return () => cancelAnimation(animatedProgress);
  }, [animatedProgress, clampedProgress, reduceMotion]);

  // Rotate through messages
  useEffect(() => {
    if (isUploading) {
      const interval = setInterval(() => {
        setMessageIndex((current) => (current + 1) % UPLOAD_MESSAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
    setMessageIndex(0);
  }, [isUploading]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.get() / 100),
  }));

  // Get current message
  const currentMessage =
    message || (isUploading ? UPLOAD_MESSAGES[messageIndex] : "");

  return (
    <View className="items-center justify-center">
      {/* Progress Ring */}
      <View>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E5E5E0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <G rotation="-90" origin={`${center}, ${center}`}>
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke="#FF6B6B"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* Percentage text in center */}
        <View
          className="absolute items-center justify-center"
          style={{
            width: size,
            height: size,
          }}
        >
          <Text className="text-3xl font-heading text-warm-gray-800">
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      </View>

      {/* Message below ring */}
      {currentMessage ? (
        <Text className="mt-4 text-base text-warm-gray-600 text-center">
          {currentMessage}
        </Text>
      ) : null}
    </View>
  );
}
