import { ManualEntry } from "@/components/receipt-confirm/ManualEntry";
import { OcrError } from "@/components/receipt-confirm/OcrError";
import { ProcessingReceipt } from "@/components/receipt-confirm/ProcessingReceipt";
import { SavingSession } from "@/components/receipt-confirm/SavingSession";
import { ScanningOverlay } from "@/components/receipt-confirm/ScanningOverlay";
import { ScanSuccess } from "@/components/receipt-confirm/ScanSuccess";
import { UploadError } from "@/components/receipt-confirm/UploadError";
import { UploadingReceipt } from "@/components/receipt-confirm/UploadingReceipt";
import {
  Button,
  PageHeader,
  usePageHeaderHeight,
  useToast,
} from "@/components/ui";
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
 * Receipt upload, OCR review, and trip saving.
 */
export default function ReceiptConfirmScreen() {
  const { photoUri, listId, entry } = useLocalSearchParams<{
    photoUri?: string;
    listId?: string;
    entry?: string;
  }>();

  const analytics = useAnalytics();
  const { showToast } = useToast();
  const mounted = useRef(true);
  const saving = useRef(false);
  const saved = useRef(false);
  const uploadStarted = useRef(false);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      uploadAbort.current?.abort();
    };
  }, []);
  const pageHeaderHeight = usePageHeaderHeight();
  const [screenState, setScreenState] = useState<ScreenState>(() =>
    getInitialReceiptScreenState(entry),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [receiptUploadId, setReceiptUploadId] =
    useState<Id<"receiptUploads"> | null>(null);
  const [extractedTotal, setExtractedTotal] = useState<number | null>(null); // In pence
  const [manualAmount, setManualAmount] = useState("");
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

        if (!mounted.current) return;
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
        if (!mounted.current) return;
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
    if (!photoUri || !household?._id || uploadStarted.current) return;
    uploadStarted.current = true;
    const controller = new AbortController();
    uploadAbort.current = controller;

    setScreenState("uploading");
    setErrorMessage("");

    try {
      // Create an upload owned by this household.
      const upload = await generateUploadUrl({ householdId: household._id });
      if (!mounted.current || controller.signal.aborted) {
        await deleteReceipt({ receiptUploadId: upload.receiptUploadId });
        return;
      }
      setReceiptUploadId(upload.receiptUploadId);

      // Read the captured image.
      const response = await fetch(photoUri, { signal: controller.signal });
      const blob = await response.blob();

      const uploadResponse = await fetch(upload.uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
        signal: controller.signal,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Attach the stored image before OCR.
      const { storageId: newStorageId } = await uploadResponse.json();

      await completeUpload({
        receiptUploadId: upload.receiptUploadId,
        storageId: newStorageId,
      });

      if (mounted.current && !controller.signal.aborted) {
        await runOCR(upload.receiptUploadId);
      }
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
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
    deleteReceipt,
    generateUploadUrl,
    household?._id,
    photoUri,
    runOCR,
  ]);

  // Auto-start upload when screen loads
  useEffect(() => {
    if (photoUri && household?._id && screenState === "uploading") {
      void uploadReceipt();
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
    if (saving.current) return;
    if (!originatingListId) {
      setErrorMessage(
        "We couldn't find the shopping list for this trip. Go back and try again.",
      );
      setScreenState(fallbackState);
      return;
    }
    if (household === undefined || sessionItems === undefined) {
      setErrorMessage(
        "We're still loading this trip. Please try again in a moment.",
      );
      setScreenState(fallbackState);
      return;
    }
    if (!household) {
      setErrorMessage(
        "We couldn't find your household. Your list is still available.",
      );
      setScreenState(fallbackState);
      return;
    }

    setErrorMessage("");
    saving.current = true;
    setScreenState("saving_session");

    try {
      await createSession(
        buildReceiptSessionInput({
          householdId: household._id,
          totalPence,
          listId: originatingListId,
          receiptUploadId: receiptForSession,
          paidBy: paymentSource,
          storeName: storeForSession ?? "",
        }),
      );

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

      saved.current = true;
      if (!mounted.current) return;
      showToast({ message: "Trip saved", tone: "success" });
      router.replace("/(tabs)/analytics");
    } catch (error) {
      if (!mounted.current) return;
      console.error("Error creating session:", error);
      setErrorMessage(
        "We couldn't save this trip. Your shopping list is still available.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScreenState(fallbackState);
    } finally {
      saving.current = false;
    }
  };

  // Save the confirmed trip and open Spending.
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
      setManualAmount(formatCurrencyInput((extractedTotal / 100).toFixed(2)));
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
    uploadStarted.current = false;
    setScreenState("uploading");
  };

  const handleCancel = useCallback(async () => {
    if (saving.current) return;
    mounted.current = false;
    uploadAbort.current?.abort();
    if (receiptUploadId && !saved.current) {
      try {
        await deleteReceipt({ receiptUploadId });
      } catch (error) {
        console.error("Failed to clean up cancelled receipt:", error);
      }
    }
    router.back();
  }, [deleteReceipt, receiptUploadId]);

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
        return <UploadingReceipt photoUri={photoUri} />;

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
        backDisabled={screenState === "saving_session"}
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
