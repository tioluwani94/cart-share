import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  parseRestockNotificationResponse,
  type RestockNotificationResponse,
} from "./notificationResponse";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushRegistrationResult =
  | {
      status: "granted";
      token: string;
      platform: "ios" | "android";
      deviceId?: string;
    }
  | { status: "denied" | "unavailable"; reason?: string };

export async function getCurrentDeviceId(): Promise<string | undefined> {
  if (Platform.OS === "ios") {
    return (await Application.getIosIdForVendorAsync()) ?? undefined;
  }
  if (Platform.OS === "android") return Application.getAndroidId();
  return undefined;
}

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { status: "unavailable", reason: "Push is mobile-only" };
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("restock-reminders", {
      name: "Restock reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: "#C94A4A",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return { status: "denied" };

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return {
      status: "unavailable",
      reason: "EAS project ID is not configured",
    };
  }
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  return {
    status: "granted",
    token,
    platform: Platform.OS,
    deviceId: await getCurrentDeviceId(),
  };
}

export function listenForNotificationResponses(
  onRestockReminder: (response: RestockNotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const restockResponse = parseRestockNotificationResponse({
      data: response.notification.request.content.data,
      identifier: response.notification.request.identifier,
    });
    if (restockResponse) onRestockReminder(restockResponse);
  });
}

export async function getLastRestockNotificationResponse(): Promise<
  RestockNotificationResponse | null
> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  const restockResponse = parseRestockNotificationResponse({
    data: response.notification.request.content.data,
    identifier: response.notification.request.identifier,
  });
  return restockResponse;
}

export async function clearLastRestockNotificationResponse(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync();
}
