import { UploadProgressRing } from "@/components/ui";
import { Image, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

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
    <Animated.View entering={FadeIn.duration(400)} className="items-center">
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
        isUploading={true}
        size={140}
        strokeWidth={10}
      />

      <Text className="mt-6 text-center text-sm text-warm-gray-500">
        Uploading your receipt...
      </Text>
    </Animated.View>
  );
};
