import { type Href, Redirect, useLocalSearchParams } from "expo-router";
import { getNotificationDestination } from "@/lib/notificationResponse";

/** Keep previously delivered notifications and saved links working. */
export default function LegacyRestockReviewRedirect() {
  const { source, notificationId } = useLocalSearchParams<{
    source?: string;
    notificationId?: string;
  }>();
  const destination =
    source === "notification"
      ? getNotificationDestination("restock_review", notificationId)
      : "/(tabs)";

  return <Redirect href={destination as Href} />;
}
