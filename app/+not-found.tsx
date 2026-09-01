import { EmptyStateCard } from "@/components/ui";
import { useRouter, Stack } from "expo-router";
import { SearchX } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Page not found" }} />
      <SafeAreaView className="flex-1 bg-background-light">
        <EmptyStateCard
          title="Page not found"
          description="This page may have moved. Return to your household plan to keep going."
          icon={<SearchX size={30} color="#C94A4A" strokeWidth={2} />}
          actionLabel="Back to Plan"
          onAction={() => router.replace("/(tabs)")}
          variant="embedded"
          className="flex-1 justify-center pb-10"
        />
      </SafeAreaView>
    </>
  );
}
