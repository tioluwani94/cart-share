import { ConfettiParticle } from "@/components/receipt-confirm/ConfettiParticle";
import { ManualEntry } from "@/components/receipt-confirm/ManualEntry";
import { OcrError } from "@/components/receipt-confirm/OcrError";
import { ProcessingReceipt } from "@/components/receipt-confirm/ProcessingReceipt";
import { SavingSession } from "@/components/receipt-confirm/SavingSession";
import { ScanningOverlay } from "@/components/receipt-confirm/ScanningOverlay";
import { ScanSuccess } from "@/components/receipt-confirm/ScanSuccess";
import { SessionSaved } from "@/components/receipt-confirm/SessionSaved";
import { UploadError } from "@/components/receipt-confirm/UploadError";
import { UploadingReceipt } from "@/components/receipt-confirm/UploadingReceipt";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ScreenState } from "@/types";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import {
  Easing,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Confetti emoji particles for celebration
const CONFETTI_EMOJIS = ["🎉", "✨", "🎊", "💫", "🌟", "⭐", "🥳", "💸"];

/**
 * Receipt confirmation screen with upload, OCR processing, and celebratory UI.
 */
export default function ReceiptConfirmScreen() {
  const { photoUri, listId } = useLocalSearchParams<{
    photoUri?: string;
    listId?: string;
  }>();

  const [screenState, setScreenState] = useState<ScreenState>("uploading");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [extractedTotal, setExtractedTotal] = useState<number | null>(null); // In cents
  const [manualAmount, setManualAmount] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [monthlySessionCount, setMonthlySessionCount] = useState(0);

  // Queries and mutations
  const household = useQuery(api.households.getCurrentHousehold);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const processReceipt = useAction(api.vision.processReceipt);
  const createSession = useMutation(api.sessions.create);
  const monthlyCount = useQuery(
    api.sessions.getMonthlySessionCount,
    household?._id ? { householdId: household._id } : "skip",
  );

  const inputRef = useRef<TextInput>(null);

  // Animation values
  const scanLinePosition = useSharedValue(0);
  const scanOpacity = useSharedValue(0);
  const successScale = useSharedValue(0);
  const totalScale = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkRotation = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  // Start scanning animation
  const startScanningAnimation = useCallback(() => {
    scanOpacity.value = withTiming(1, { duration: 300 });
    // Animate scan line up and down repeatedly
    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // Infinite repeat
      false, // Don't reverse
    );
  }, [scanLinePosition, scanOpacity]);

  // Stop scanning animation
  const stopScanningAnimation = useCallback(() => {
    scanOpacity.value = withTiming(0, { duration: 200 });
    scanLinePosition.value = 0;
  }, [scanLinePosition, scanOpacity]);

  // Process OCR
  const runOCR = useCallback(
    async (imageStorageId: Id<"_storage">) => {
      setScreenState("processing");
      startScanningAnimation();

      try {
        const result = await processReceipt({ imageId: imageStorageId });

        stopScanningAnimation();

        if (result.success && result.extractedTotal !== null) {
          // Success! Found the total
          setExtractedTotal(result.extractedTotal);
          setScreenState("success");
          setShowConfetti(true);

          // Animate success elements
          successScale.value = withSequence(
            withSpring(1.1, { damping: 8, stiffness: 150 }),
            withSpring(1, { damping: 10, stiffness: 200 }),
          );

          totalScale.value = withSequence(
            withTiming(0, { duration: 0 }),
            withSpring(1.2, { damping: 6, stiffness: 120 }),
            withSpring(1, { damping: 8, stiffness: 150 }),
          );

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Hide confetti after 3 seconds
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          // OCR worked but couldn't find total, or failed
          setScreenState("ocr_error");
          setErrorMessage(
            result.error || "We couldn't read the total from your receipt.",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } catch (error) {
        console.error("OCR error:", error);
        stopScanningAnimation();
        setScreenState("ocr_error");
        setErrorMessage("Something went wrong while reading your receipt.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [
      processReceipt,
      startScanningAnimation,
      stopScanningAnimation,
      successScale,
      totalScale,
    ],
  );

  // Upload the receipt image
  const uploadReceipt = useCallback(async () => {
    if (!photoUri) return;

    setScreenState("uploading");
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

      // Step 3: Upload to Convex storage (20-85%)
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

      // Brief pause then start OCR
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Start OCR processing
      runOCR(newStorageId);
    } catch (error) {
      console.error("Upload error:", error);
      setScreenState("upload_error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again!",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [photoUri, generateUploadUrl, runOCR]);

  // Auto-start upload when screen loads
  useEffect(() => {
    if (photoUri && screenState === "uploading") {
      const timer = setTimeout(() => {
        uploadReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [photoUri, screenState, uploadReceipt]);

  // Handle confirm button - create session and show celebration
  const handleConfirm = async () => {
    const totalCents = extractedTotal;
    if (!totalCents || !household?._id) return;

    setScreenState("saving_session");

    try {
      // Create the shopping session
      await createSession({
        householdId: household._id,
        totalAmount: totalCents,
        listId: listId ? (listId as Id<"lists">) : undefined,
        receiptImageId: storageId ?? undefined,
      });

      // Update monthly count for display (current count + 1 for the new session)
      const currentCount = monthlyCount?.count ?? 0;
      setMonthlySessionCount(currentCount + 1);

      // Transition to session saved state
      setScreenState("session_saved");
      setShowConfetti(true);

      // Animate checkmark
      checkmarkScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 120 }),
        withSpring(1, { damping: 8, stiffness: 150 }),
      );
      checkmarkRotation.value = withSequence(
        withTiming(-15, { duration: 100 }),
        withSpring(0, { damping: 10, stiffness: 200 }),
      );

      // Fade in stats after checkmark
      setTimeout(() => {
        statsOpacity.value = withTiming(1, { duration: 500 });
      }, 400);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-navigate to home after 2 seconds
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2500);

      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error("Error creating session:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // On error, go back to success state so user can try again
      setScreenState("success");
    }
  };

  // Handle manual entry submission
  const handleManualSubmit = () => {
    const amount = parseFloat(manualAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const totalCents = Math.round(amount * 100);
    setExtractedTotal(totalCents);
    setScreenState("success");
    setShowConfetti(true);

    successScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 150 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );

    totalScale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withSpring(1.2, { damping: 6, stiffness: 120 }),
      withSpring(1, { damping: 8, stiffness: 150 }),
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();

    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Switch to manual entry
  const handleNotQuite = () => {
    setScreenState("manual_entry");
    // Pre-fill with extracted amount if available
    if (extractedTotal) {
      setManualAmount((extractedTotal / 100).toFixed(2));
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleTryAgain = () => {
    setScreenState("uploading");
    setUploadProgress(0);
    setTimeout(uploadReceipt, 100);
  };

  // Render confetti particles
  const renderConfetti = () => {
    if (!showConfetti) return null;

    return (
      <View
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 100 }}
      >
        {Array.from({ length: 20 }).map((_, index) => {
          const emoji = CONFETTI_EMOJIS[index % CONFETTI_EMOJIS.length];
          const startX = Math.random() * 100;
          const delay = index * 80;

          return (
            <ConfettiParticle
              key={index}
              emoji={emoji}
              startX={startX}
              delay={delay}
            />
          );
        })}
      </View>
    );
  };

  const renderScanningOverlay = () => <ScanningOverlay />;

  // Render content based on state
  const renderContent = () => {
    switch (screenState) {
      case "uploading":
        return (
          <UploadingReceipt
            photoUri={photoUri}
            uploadProgress={uploadProgress}
          />
        );

      case "processing":
        return (
          <ProcessingReceipt photoUri={photoUri}>
            {renderScanningOverlay()}
          </ProcessingReceipt>
        );

      case "success":
        return (
          <ScanSuccess
            photoUri={photoUri}
            extractedTotal={extractedTotal}
            handleConfirm={handleConfirm}
            handleNotQuite={handleNotQuite}
          />
        );

      case "manual_entry":
        return (
          <ManualEntry
            inputRef={inputRef}
            manualAmount={manualAmount}
            setManualAmount={setManualAmount}
            handleManualSubmit={handleManualSubmit}
          />
        );

      case "ocr_error":
        return (
          <OcrError
            photoUri={photoUri}
            errorMessage={errorMessage}
            inputRef={inputRef}
            setScreenState={setScreenState}
          />
        );

      case "upload_error":
        return (
          <UploadError
            errorMessage={errorMessage}
            handleTryAgain={handleTryAgain}
          />
        );

      case "saving_session":
        return <SavingSession />;

      case "session_saved":
        return (
          <SessionSaved
            extractedTotal={extractedTotal}
            monthlySessionCount={monthlySessionCount}
          />
        );

      default:
        return null;
    }
  };

  // Get header title based on state
  const getHeaderTitle = () => {
    switch (screenState) {
      case "uploading":
        return "Uploading Receipt";
      case "processing":
        return "Scanning Receipt";
      case "success":
        return "Receipt Total";
      case "manual_entry":
        return "Enter Total";
      case "saving_session":
        return "Saving Trip";
      case "session_saved":
        return "All Done!";
      case "ocr_error":
      case "upload_error":
        return "Hmm...";
      default:
        return "Receipt";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      {/* Confetti overlay */}
      {renderConfetti()}

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
          {getHeaderTitle()}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-8">
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}
