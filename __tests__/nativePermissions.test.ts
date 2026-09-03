import fs from "node:fs";
import path from "node:path";

import appConfig from "../app.json";

describe("native permission configuration", () => {
  it("keeps unused microphone and Face ID permissions disabled", () => {
    const configuredPlugins = appConfig.expo.plugins.filter(
      Array.isArray,
    ) as [string, Record<string, unknown>][];
    const secureStorePlugin = configuredPlugins.find(
      ([name]) => name === "expo-secure-store",
    );
    const cameraPlugin = configuredPlugins.find(
      ([name]) => name === "expo-camera",
    );

    expect(secureStorePlugin?.[1].faceIDPermission).toBe(false);
    expect(cameraPlugin?.[1].microphonePermission).toBe(false);
    expect(cameraPlugin?.[1].recordAudioAndroid).toBe(false);

    const infoPlist = fs.readFileSync(
      path.join(__dirname, "../ios/CartShare/Info.plist"),
      "utf8",
    );
    const androidManifest = fs.readFileSync(
      path.join(__dirname, "../android/app/src/main/AndroidManifest.xml"),
      "utf8",
    );

    expect(infoPlist).not.toContain("NSFaceIDUsageDescription");
    expect(infoPlist).not.toContain("NSMicrophoneUsageDescription");
    expect(androidManifest).not.toContain("android.permission.RECORD_AUDIO");
  });
});
