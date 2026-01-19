import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
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
  const animatedProgress = useSharedValue(0);
  const messageIndex = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate progress changes
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  // Pulse animation when uploading
  useEffect(() => {
    if (isUploading) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isUploading, pulseScale]);

  // Rotate through messages
  useEffect(() => {
    if (isUploading) {
      const interval = setInterval(() => {
        messageIndex.value = (messageIndex.value + 1) % UPLOAD_MESSAGES.length;
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isUploading, messageIndex]);

  // Animated stroke dash offset for progress
  const strokeDashoffset = useDerivedValue(() => {
    const progressFraction = animatedProgress.value / 100;
    return circumference * (1 - progressFraction);
  });

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  // Get current message
  const currentMessage =
    message ||
    (isUploading ? UPLOAD_MESSAGES[Math.floor(messageIndex.value)] : "");

  return (
    <View className="items-center justify-center">
      {/* Progress Ring */}
      <Animated.View
        style={{
          transform: [{ scale: pulseScale }],
        }}
      >
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
          <Text className="text-3xl font-bold text-warm-gray-800">
            {Math.round(progress)}%
          </Text>
        </View>
      </Animated.View>

      {/* Message below ring */}
      {currentMessage ? (
        <Text className="mt-4 text-base text-warm-gray-600 text-center">
          {currentMessage}
        </Text>
      ) : null}
    </View>
  );
}
