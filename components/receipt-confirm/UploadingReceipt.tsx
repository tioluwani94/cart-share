import { UploadProgressRing } from "@/components/ui";
import { Image, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

interface UploadingReceiptProps {
  /** URI of the receipt photo to display */
  photoUri?: string;
  /** Upload progress from 0 to 100 */
  uploadProgress: number;
}

export const UploadingReceipt = ({
  photoUri,
  uploadProgress,
}: UploadingReceiptProps) => {
  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="items-center">
      {photoUri && (
        <View className="mb-8 h-32 w-32 overflow-hidden rounded-2xl border border-separator bg-surface">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      <UploadProgressRing
        progress={uploadProgress}
        isUploading={true}
        size={140}
        strokeWidth={10}
      />

      <Text className="mt-6 text-center text-[17px] leading-6 text-ink-secondary">
        Uploading your receipt…
      </Text>
    </Animated.View>
  );
};
