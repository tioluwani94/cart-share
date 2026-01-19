import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, RotateCcw, Receipt, CheckCircle2 } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  withSpring,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UploadProgressRing, Button } from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";

type UploadState = "idle" | "uploading" | "success" | "error";

/**
 * Receipt confirmation screen with upload progress animation.
 * Uploads the receipt image to Convex storage and shows progress.
 */
export default function ReceiptConfirmScreen() {
  const { photoUri, listId } = useLocalSearchParams<{
    photoUri?: string;
    listId?: string;
  }>();

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  // Success animation scale
  const successScale = useSharedValue(0);

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  // Upload the receipt image
  const uploadReceipt = useCallback(async () => {
    if (!photoUri) return;

    setUploadState("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      // Step 1: Generate upload URL (10%)
      setUploadProgress(10);
      const uploadUrl = await generateUploadUrl();

      // Step 2: Read the image file (20%)
      setUploadProgress(20);
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Step 3: Upload to Convex storage (20-90%)
      // Simulate progress since XMLHttpRequest progress events
      // aren't available with fetch
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 85) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 200);

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Step 4: Get storage ID (95%)
      setUploadProgress(95);
      const { storageId: newStorageId } = await uploadResponse.json();

      // Step 5: Complete (100%)
      setUploadProgress(100);
      setStorageId(newStorageId);

      // Brief pause to show 100%
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Success!
      setUploadState("success");
      successScale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again!"
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [photoUri, generateUploadUrl]);

  // Auto-start upload when screen loads
  useEffect(() => {
    if (photoUri && uploadState === "idle") {
      // Small delay to let the screen animate in
      const timer = setTimeout(() => {
        uploadReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [photoUri, uploadState, uploadReceipt]);

  // Continue to next step (OCR processing in US-036/037)
  const handleContinue = () => {
    // Pass the storageId to the next screen for OCR processing
    router.replace({
      pathname: "/(tabs)",
      params: storageId ? { storageId, listId } : { listId },
    });
  };

  // Render based on upload state
  const renderContent = () => {
    switch (uploadState) {
      case "idle":
      case "uploading":
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            className="items-center"
          >
            {/* Receipt preview thumbnail */}
            {photoUri && (
              <View className="mb-8 h-32 w-32 overflow-hidden rounded-2xl shadow-md">
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Progress Ring */}
            <UploadProgressRing
              progress={uploadProgress}
              isUploading={uploadState === "uploading"}
              size={140}
              strokeWidth={10}
            />

            {/* Helper text */}
            <Text className="mt-6 text-center text-sm text-warm-gray-500">
              Please wait while we process your receipt
            </Text>
          </Animated.View>
        );

      case "success":
        return (
          <Animated.View
            entering={FadeInUp.springify().damping(12)}
            className="items-center"
          >
            {/* Success icon */}
            <Animated.View
              style={successAnimatedStyle}
              className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-teal/20"
            >
              <CheckCircle2 size={56} color="#4ECDC4" strokeWidth={2} />
            </Animated.View>

            <Text className="text-center text-2xl font-bold text-warm-gray-900">
              Upload complete!
            </Text>

            <Text className="mt-2 text-center text-base text-warm-gray-600">
              Your receipt has been saved successfully.
            </Text>

            {/* Preview of uploaded receipt */}
            {photoUri && (
              <View className="mt-6 h-40 w-40 overflow-hidden rounded-2xl shadow-md">
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            )}

            <Button
              variant="primary"
              size="lg"
              onPress={handleContinue}
              className="mt-8 w-full"
            >
              Continue
            </Button>
          </Animated.View>
        );

      case "error":
        return (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="items-center"
          >
            {/* Error illustration */}
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-coral/20">
              <Receipt size={48} color="#FF6B6B" strokeWidth={1.5} />
            </View>

            <Text className="text-center text-2xl font-bold text-warm-gray-900">
              Oops! Something went wrong
            </Text>

            <Text className="mt-2 text-center text-base text-warm-gray-600">
              {errorMessage || "We couldn't upload your receipt. Let's try again!"}
            </Text>

            {/* Retry button */}
            <Button
              variant="primary"
              size="lg"
              onPress={() => {
                setUploadState("idle");
                setUploadProgress(0);
                setTimeout(uploadReceipt, 100);
              }}
              className="mt-8 w-full"
            >
              <View className="flex-row items-center">
                <RotateCcw size={20} color="white" strokeWidth={2} />
                <Text className="ml-2 text-base font-semibold text-white">
                  Try Again
                </Text>
              </View>
            </Button>

            {/* Skip option */}
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.replace("/(tabs)")}
              className="mt-4"
            >
              Skip for now
            </Button>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      {/* Header */}
      <View className="flex-row items-center border-b border-warm-gray-100 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#57534E" strokeWidth={2} />
        </Pressable>
        <Text className="text-xl font-bold text-warm-gray-900">
          {uploadState === "success" ? "Receipt Saved" : "Processing Receipt"}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-8">
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}
