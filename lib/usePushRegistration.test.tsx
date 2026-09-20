import React from "react";
import { AppState, type AppStateStatus } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { usePushRegistration } from "./usePushRegistration";
import {
  resumePushRegistration,
  suspendPushRegistration,
} from "./pushRegistrationLifecycle";

const mockRegister = jest.fn(async (_args: unknown) => ({}));
const mockToken = jest.fn();
let mockForeground: (state: AppStateStatus) => void;
jest.mock("convex/react", () => ({ useMutation: () => mockRegister }));
jest.mock("@/convex/_generated/api", () => ({
  api: { notifications: { registerDevice: "register" } },
}));
jest.mock("./pushNotifications", () => ({
  registerForPushNotifications: (args: unknown) => mockToken(args),
}));
jest
  .spyOn(AppState, "addEventListener")
  .mockImplementation((_event, callback) => {
    mockForeground = callback;
    return { remove: jest.fn() };
  });

type Props = Parameters<typeof usePushRegistration>[0];
function Harness(props: Props) {
  usePushRegistration(props);
  return null;
}
const ready: Props = {
  userId: "c1",
  authenticated: true,
  preference: { viewerClerkId: "c1", restockNotificationsEnabled: true },
};
let renderer: ReactTestRenderer;
const granted = {
  status: "granted",
  token: "ExpoPushToken[test]",
  platform: "ios",
  deviceId: "d1",
};
beforeEach(() => {
  jest.clearAllMocks();
  resumePushRegistration();
  mockToken.mockResolvedValue(granted);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  await suspendPushRegistration();
});

it("restores at authenticated startup without prompting, and refreshes on foreground", async () => {
  await act(async () => {
    renderer = TestRenderer.create(<Harness {...ready} />);
  });
  expect(mockToken).toHaveBeenCalledWith({ requestPermission: false });
  expect(mockRegister).toHaveBeenCalledWith({
    token: granted.token,
    platform: "ios",
    deviceId: "d1",
    expectedClerkId: "c1",
    restoreOnly: true,
  });
  await act(async () => mockForeground("active"));
  expect(mockRegister).toHaveBeenCalledTimes(2);
});

it("waits for matching preferences and Convex authentication", async () => {
  await act(async () => {
    renderer = TestRenderer.create(
      <Harness {...ready} authenticated={false} />,
    );
  });
  expect(mockToken).not.toHaveBeenCalled();
  await act(async () =>
    renderer.update(
      <Harness
        {...ready}
        preference={{ viewerClerkId: "old", restockNotificationsEnabled: true }}
      />,
    ),
  );
  expect(mockToken).not.toHaveBeenCalled();
  await act(async () => renderer.update(<Harness {...ready} />));
  expect(mockRegister).toHaveBeenCalledTimes(1);
});

it("discards a token lookup completed after an account switch", async () => {
  let resolve!: (value: typeof granted) => void;
  mockToken.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await act(async () => {
    renderer = TestRenderer.create(<Harness {...ready} />);
  });
  await act(async () =>
    renderer.update(
      <Harness
        userId="c2"
        authenticated
        preference={{ viewerClerkId: "c2", restockNotificationsEnabled: false }}
      />,
    ),
  );
  await act(async () => resolve(granted));
  expect(mockRegister).toHaveBeenCalledTimes(1);
  expect(mockRegister).toHaveBeenCalledWith(
    expect.objectContaining({ expectedClerkId: "c2", restoreOnly: true }),
  );
});

it("does not re-register after sign-out cleanup begins", async () => {
  let resolve!: (value: typeof granted) => void;
  mockToken.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await act(async () => {
    renderer = TestRenderer.create(<Harness {...ready} />);
  });
  const draining = suspendPushRegistration();
  await act(async () => resolve(granted));
  await draining;
  await act(async () => mockForeground("active"));
  expect(mockRegister).not.toHaveBeenCalled();
});

it("waits for a dispatched registration before permitting sign-out cleanup", async () => {
  let resolve!: () => void;
  mockRegister.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = () => done({});
      }),
  );
  await act(async () => {
    renderer = TestRenderer.create(<Harness {...ready} />);
  });
  let drained = false;
  const draining = suspendPushRegistration().then(() => {
    drained = true;
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(drained).toBe(false);
  await act(async () => resolve());
  await draining;
  expect(drained).toBe(true);
});

it("leaves denied permissions untouched", async () => {
  mockToken.mockResolvedValue({ status: "denied" });
  await act(async () => {
    renderer = TestRenderer.create(<Harness {...ready} />);
  });
  expect(mockToken).toHaveBeenCalledWith({ requestPermission: false });
  expect(mockRegister).not.toHaveBeenCalled();
});
