import { ManualEntry } from "@/components/receipt-confirm/ManualEntry";
import { OcrError } from "@/components/receipt-confirm/OcrError";
import { ProcessingReceipt } from "@/components/receipt-confirm/ProcessingReceipt";
import { SavingSession } from "@/components/receipt-confirm/SavingSession";
import { ScanningOverlay } from "@/components/receipt-confirm/ScanningOverlay";
import { ScanSuccess } from "@/components/receipt-confirm/ScanSuccess";
import { SessionSaved } from "@/components/receipt-confirm/SessionSaved";
import { UploadError } from "@/components/receipt-confirm/UploadError";
import { UploadingReceipt } from "@/components/receipt-confirm/UploadingReceipt";
import { Button, PageHeader, usePageHeaderHeight } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { getItemCountBucket } from "@/lib/analytics";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import {
  formatCurrencyInput,
  parseCurrencyInputToPence,
} from "@/lib/formatters";
import {
  buildReceiptSessionInput,
  getInitialReceiptScreenState,
} from "@/lib/receiptFlow";
import { themeColors } from "@/lib/theme";
import { ScreenState } from "@/types";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Receipt confirmation screen with upload, OCR processing, and celebratory UI.
 */
export default function ReceiptConfirmScreen() {
  const { photoUri, listId, entry } = useLocalSearchParams<{
    photoUri?: string;
    listId?: string;
    entry?: string;
  }>();

  const analytics = useAnalytics();
  const pageHeaderHeight = usePageHeaderHeight();
  const [screenState, setScreenState] = useState<ScreenState>(() =>
    getInitialReceiptScreenState(entry),
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [receiptUploadId, setReceiptUploadId] =
    useState<Id<"receiptUploads"> | null>(null);
  const [extractedTotal, setExtractedTotal] = useState<number | null>(null); // In pence
  const [manualAmount, setManualAmount] = useState("");
  const [monthlySessionCount, setMonthlySessionCount] = useState(0);
  const [paidBy, setPaidBy] = useState<"joint" | Id<"users">>("joint");
  const [storeName, setStoreName] = useState("");
  const originatingListId = listId ? (listId as Id<"lists">) : undefined;

  // Queries and mutations
  const household = useQuery(api.households.getCurrentHousehold);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const completeUpload = useMutation(api.storage.completeUpload);
  const deleteReceipt = useMutation(api.storage.deleteFile);
  const processReceipt = useAction(api.vision.processReceipt);
  const createSession = useMutation(api.sessions.create);
  const monthlyCount = useQuery(
    api.sessions.getMonthlySessionCount,
    household?._id ? { householdId: household._id } : "skip",
  );
  const sessionItems = useQuery(
    api.items.getByList,
    originatingListId ? { listId: originatingListId } : "skip",
  );

  const inputRef = useRef<TextInput>(null);

  // Process OCR
  const runOCR = useCallback(
    async (authorizedReceiptUploadId: Id<"receiptUploads">) => {
      setScreenState("processing");

      try {
        const result = await processReceipt({
          receiptUploadId: authorizedReceiptUploadId,
        });

        if (result.success && result.extractedTotal !== null) {
          // Success! Found the total
          setExtractedTotal(result.extractedTotal);
          setScreenState("success");

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        setScreenState("ocr_error");
        setErrorMessage("Something went wrong while reading your receipt.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [processReceipt],
  );

  // Upload the receipt image
  const uploadReceipt = useCallback(async () => {
    if (!photoUri || !household?._id) return;

    setScreenState("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      // Step 1: Generate upload URL (10%)
      setUploadProgress(10);
      const upload = await generateUploadUrl({ householdId: household._id });
      setReceiptUploadId(upload.receiptUploadId);

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

      const uploadResponse = await fetch(upload.uploadUrl, {
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

      await completeUpload({
        receiptUploadId: upload.receiptUploadId,
        storageId: newStorageId,
      });

      // Step 5: Complete (100%)
      setUploadProgress(100);

      // Brief pause then start OCR
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Start OCR processing
      runOCR(upload.receiptUploadId);
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
  }, [
    completeUpload,
    generateUploadUrl,
    household?._id,
    photoUri,
    runOCR,
  ]);

  // Auto-start upload when screen loads
  useEffect(() => {
    if (photoUri && household?._id && screenState === "uploading") {
      const timer = setTimeout(() => {
        uploadReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [household?._id, photoUri, screenState, uploadReceipt]);

  const saveShoppingSession = async ({
    fallbackState,
    paymentSource,
    receiptForSession,
    storeForSession,
    totalPence,
  }: {
    fallbackState: ScreenState;
    paymentSource?: "joint" | Id<"users">;
    receiptForSession?: Id<"receiptUploads">;
    storeForSession?: string;
    totalPence?: number;
  }) => {
    if (!originatingListId) {
      setErrorMessage(
        "We couldn't find the shopping list for this trip. Go back and try again.",
      );
      setScreenState(fallbackState);
      return;
    }
    if (household === undefined || sessionItems === undefined) {
      setErrorMessage("We're still loading this trip. Please try again in a moment.");
      setScreenState(fallbackState);
      return;
    }
    if (!household) {
      setErrorMessage("We couldn't find your household. Your list is still available.");
      setScreenState(fallbackState);
      return;
    }

    setErrorMessage("");
    setScreenState("saving_session");

    try {
      await createSession(buildReceiptSessionInput({
        householdId: household._id,
        totalPence,
        listId: originatingListId,
        receiptUploadId: receiptForSession,
        paidBy: paymentSource,
        storeName: storeForSession ?? "",
      }));

      try {
        if (receiptForSession) {
          analytics.track("receipt attached", {
            household_id: household._id,
            source: "camera",
          });
        }
        analytics.track("shop completed", {
          household_id: household._id,
          item_count_bucket: getItemCountBucket(sessionItems?.length ?? 0),
          total_present: totalPence !== undefined,
          receipt_present: Boolean(receiptForSession),
        });
      } catch (analyticsError) {
        console.error("Couldn't record completion analytics:", analyticsError);
      }

      setMonthlySessionCount((monthlyCount?.count ?? 0) + 1);
      setExtractedTotal(totalPence ?? null);
      setScreenState("session_saved");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.replace("/(tabs)/analytics"), 2500);
    } catch (error) {
      console.error("Error creating session:", error);
      setErrorMessage(
        "We couldn't save this trip. Your shopping list is still available.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScreenState(fallbackState);
    }
  };

  // Handle confirm button - create session and show celebration
  const handleConfirm = async () => {
    const totalPence = extractedTotal;
    if (!totalPence) return;
    await saveShoppingSession({
      fallbackState: "success",
      paymentSource: paidBy,
      receiptForSession: receiptUploadId ?? undefined,
      storeForSession: storeName,
      totalPence,
    });
  };

  const handleSkipFinancialDetails = async () => {
    if (receiptUploadId) {
      try {
        await deleteReceipt({ receiptUploadId });
        setReceiptUploadId(null);
      } catch (error) {
        console.error("Failed to remove skipped receipt:", error);
        setErrorMessage(
          "We couldn't remove this receipt yet. Your list is still available.",
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    await saveShoppingSession({ fallbackState: "manual_entry" });
  };

  // Handle manual entry submission
  const handleManualSubmit = () => {
    setErrorMessage("");
    const totalPence = parseCurrencyInputToPence(manualAmount);
    if (totalPence === null || totalPence <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setExtractedTotal(totalPence);
    setScreenState("success");

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
  };

  // Switch to manual entry
  const handleNotQuite = () => {
    setScreenState("manual_entry");
    // Pre-fill with extracted amount if available
    if (extractedTotal) {
      setManualAmount(
        formatCurrencyInput((extractedTotal / 100).toFixed(2)),
      );
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleTryAgain = async () => {
    if (receiptUploadId) {
      try {
        await deleteReceipt({ receiptUploadId });
      } catch (error) {
        console.error("Failed to clean up failed receipt:", error);
      }
      setReceiptUploadId(null);
    }
    setScreenState("uploading");
    setUploadProgress(0);
  };

  const handleCancel = useCallback(async () => {
    if (receiptUploadId && screenState !== "session_saved") {
      try {
        await deleteReceipt({ receiptUploadId });
      } catch (error) {
        console.error("Failed to clean up cancelled receipt:", error);
      }
    }
    router.back();
  }, [deleteReceipt, receiptUploadId, screenState]);

  const renderScanningOverlay = () => <ScanningOverlay />;

  // Render content based on state
  const renderContent = () => {
    if (!originatingListId) {
      return (
        <View className="w-full items-center px-4">
          <Text className="text-center text-xl font-heading text-warm-gray-900">
            Trip details missing
          </Text>
          <Text className="mt-2 text-center text-base leading-6 text-warm-gray-600">
            Go back to your shopping list and choose Finish again.
          </Text>
          <Button
            onPress={() => router.back()}
            className="mt-6 w-full"
            accessibilityLabel="Back to shopping list"
          >
            Back to shop
          </Button>
        </View>
      );
    }

    if (household === undefined || sessionItems === undefined) {
      return (
        <View className="items-center">
          <ActivityIndicator color={themeColors.coral} />
          <Text className="mt-3 text-sm text-warm-gray-600">
            Loading trip details...
          </Text>
        </View>
      );
    }

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
            paidBy={paidBy}
            onPaidByChange={setPaidBy}
            paymentOptions={[
              { value: "joint", label: "Joint account" },
              ...(household?.members.flatMap((member) =>
                member.user
                  ? [
                      {
                        value: member.user._id,
                        label: member.user.name || "Household member",
                      },
                    ]
                  : [],
              ) ?? []),
            ]}
            storeName={storeName}
            onStoreNameChange={setStoreName}
            errorMessage={errorMessage}
          />
        );

      case "manual_entry":
        return (
          <ManualEntry
            inputRef={inputRef}
            manualAmount={manualAmount}
            setManualAmount={setManualAmount}
            handleManualSubmit={handleManualSubmit}
            handleSkip={handleSkipFinancialDetails}
            errorMessage={errorMessage}
          />
        );

      case "ocr_error":
        return (
          <OcrError
            photoUri={photoUri}
            errorMessage={errorMessage}
            inputRef={inputRef}
            setScreenState={setScreenState}
            handleRetake={handleCancel}
            handleSkip={handleSkipFinancialDetails}
          />
        );

      case "upload_error":
        return (
          <UploadError
            errorMessage={errorMessage}
            handleTryAgain={handleTryAgain}
            handleSkip={handleSkipFinancialDetails}
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
        return "Uploading receipt";
      case "processing":
        return "Reading receipt";
      case "success":
        return "Receipt total";
      case "manual_entry":
        return "Enter total";
      case "saving_session":
        return "Saving trip";
      case "session_saved":
        return "Trip saved";
      case "ocr_error":
      case "upload_error":
        return "Receipt help";
      default:
        return "Receipt";
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right", "bottom"]}
    >
      <PageHeader
        title={getHeaderTitle()}
        onBack={handleCancel}
        backLabel="Back to shopping list"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          {...keyboardDismissScrollProps}
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 pb-10"
          contentContainerStyle={{ paddingTop: pageHeaderHeight + 32 }}
          scrollIndicatorInsets={{ top: pageHeaderHeight }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-xl self-center">{renderContent()}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
