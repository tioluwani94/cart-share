import * as Linking from "expo-linking";
import { expo } from "../app.json";
import { redirectPath } from "../lib/oauthConfig.json";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    executionEnvironment: "standalone",
    expoConfig: jest.requireActual("../app.json").expo,
  },
  ExecutionEnvironment: {
    Standalone: "standalone",
    Bare: "bare",
    StoreClient: "storeClient",
  },
}));

it("checks the real standalone Expo callback, including its leading slash", () => {
  const actualCallback = Linking.createURL(redirectPath);
  expect(actualCallback).toBe("ourpantry:///(auth)/welcome");
  // The live preflight must send the URL produced by the installed Expo SDK.
  expect(`${expo.scheme}://${redirectPath}`).toBe(actualCallback);
});
