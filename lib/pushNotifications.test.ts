import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "./pushNotifications";
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("expo-application", () => ({
  getIosIdForVendorAsync: async () => "device",
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { easConfig: { projectId: "project" } },
}));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({
    data: "ExpoPushToken[token]",
  })),
}));

beforeEach(() => jest.clearAllMocks());
it.each(["denied", "undetermined"])(
  "silent restoration never prompts for %s permission",
  async (status) => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status,
    });
    expect(
      await registerForPushNotifications({ requestPermission: false }),
    ).toEqual({ status: "denied" });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  },
);
it("refreshes already granted permission without another prompt", async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "granted",
  });
  expect(
    await registerForPushNotifications({ requestPermission: false }),
  ).toMatchObject({
    status: "granted",
    token: "ExpoPushToken[token]",
    deviceId: "device",
  });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
it("preserves the explicit permission flow", async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "undetermined",
  });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "granted",
  });
  expect(await registerForPushNotifications()).toMatchObject({
    status: "granted",
  });
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});
