import fs from "node:fs";
import path from "node:path";

import appConfig from "../app.json";

const expectedCollectedTypes = [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypePhotosorVideos",
  "NSPrivacyCollectedDataTypeOtherUserContent",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypePurchaseHistory",
  "NSPrivacyCollectedDataTypeOtherFinancialInfo",
  "NSPrivacyCollectedDataTypeProductInteraction",
];

describe("iOS privacy manifest", () => {
  it("declares the current app data flows without tracking", () => {
    const manifest = appConfig.expo.ios.privacyManifests;

    expect(manifest.NSPrivacyTracking).toBe(false);
    expect(manifest.NSPrivacyTrackingDomains).toEqual([]);
    expect(
      manifest.NSPrivacyCollectedDataTypes.map(
        (entry) => entry.NSPrivacyCollectedDataType,
      ),
    ).toEqual(expectedCollectedTypes);

    for (const entry of manifest.NSPrivacyCollectedDataTypes) {
      expect(entry.NSPrivacyCollectedDataTypeLinked).toBe(true);
      expect(entry.NSPrivacyCollectedDataTypeTracking).toBe(false);
      expect(entry.NSPrivacyCollectedDataTypePurposes.length).toBeGreaterThan(0);
    }
  });

  it("keeps the checked-in native manifest aligned with the Expo config", () => {
    const nativeManifest = fs.readFileSync(
      path.join(__dirname, "../ios/CartShare/PrivacyInfo.xcprivacy"),
      "utf8",
    );

    for (const dataType of expectedCollectedTypes) {
      expect(nativeManifest).toContain(`<string>${dataType}</string>`);
    }

    for (const accessedType of appConfig.expo.ios.privacyManifests
      .NSPrivacyAccessedAPITypes) {
      expect(nativeManifest).toContain(
        `<string>${accessedType.NSPrivacyAccessedAPIType}</string>`,
      );
      for (const reason of accessedType.NSPrivacyAccessedAPITypeReasons) {
        expect(nativeManifest).toContain(`<string>${reason}</string>`);
      }
    }

    expect(
      appConfig.expo.ios.privacyManifests.NSPrivacyAccessedAPITypes.find(
        ({ NSPrivacyAccessedAPIType }) =>
          NSPrivacyAccessedAPIType ===
          "NSPrivacyAccessedAPICategoryUserDefaults",
      )?.NSPrivacyAccessedAPITypeReasons,
    ).toEqual(["CA92.1", "C56D.1"]);
  });
});
