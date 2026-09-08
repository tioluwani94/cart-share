import fs from "node:fs";
import path from "node:path";

import appConfig from "../app.json";
import easConfig from "../eas.json";
import packageJson from "../package.json";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

describe("OurPantry application identity", () => {
  it("uses one public product identity across Expo and package metadata", () => {
    expect(packageJson.name).toBe("ourpantry");
    expect(appConfig.expo.name).toBe("OurPantry");
    expect(appConfig.expo.slug).toBe("ourpantry");
    expect(appConfig.expo.scheme).toBe("ourpantry");
    expect(appConfig.expo.ios.bundleIdentifier).toBe("app.ourpantry");
    expect(appConfig.expo.android.package).toBe("app.ourpantry");
    expect(appConfig.expo.owner).toBe("jtioluwani");
    expect(appConfig.expo.extra.eas.projectId).toBe(
      "c2227d67-2e66-4150-88c0-7944fe0dffd2",
    );
  });

  it("pins release tooling and provides an Apple-account-free preview build", () => {
    expect(easConfig.build.base.node).toBe("22.23.2");
    expect(easConfig.build.base.pnpm).toBe("10.6.4");
    expect(read(".node-version").trim()).toBe(easConfig.build.base.node);
    expect(easConfig.build.development).toMatchObject({
      extends: "base",
      environment: "development",
    });
    expect(easConfig.build.preview).toMatchObject({
      extends: "base",
      environment: "preview",
    });
    expect(easConfig.build["preview-simulator"]).toMatchObject({
      extends: "preview",
      ios: { simulator: true },
    });
    expect(easConfig.build.production).toMatchObject({
      extends: "base",
      environment: "production",
    });
  });

  it("keeps checked-in native projects aligned with Expo configuration", () => {
    const androidBuild = read("android/app/build.gradle");
    const androidManifest = read("android/app/src/main/AndroidManifest.xml");
    const iosProject = read("ios/CartShare.xcodeproj/project.pbxproj");
    const iosInfo = read("ios/CartShare/Info.plist");

    expect(androidBuild).toContain("namespace 'app.ourpantry'");
    expect(androidBuild).toContain("applicationId 'app.ourpantry'");
    expect(androidManifest).toContain('android:scheme="ourpantry"');
    expect(androidManifest).toContain('android:scheme="exp+ourpantry"');

    expect(iosProject).toContain("PRODUCT_BUNDLE_IDENTIFIER = app.ourpantry;");
    expect(iosProject).toContain("PRODUCT_NAME = OurPantry;");
    expect(iosInfo).toContain("<string>OurPantry</string>");
    expect(iosInfo).toContain("<string>ourpantry</string>");
    expect(iosInfo).toContain("<string>exp+ourpantry</string>");
  });

  it("targets iPhone only in Expo and every native build configuration", () => {
    expect(appConfig.expo.ios.supportsTablet).toBe(false);
    const deviceFamilies = Array.from(
      read("ios/CartShare.xcodeproj/project.pbxproj").matchAll(
        /TARGETED_DEVICE_FAMILY\s*=\s*([^;]+);/g,
      ),
      (match) => match[1].replaceAll('"', "").trim(),
    );
    expect(deviceFamilies.length).toBeGreaterThanOrEqual(2);
    expect(deviceFamilies.every((family) => family === "1")).toBe(true);
    expect(read("ios/CartShare/Info.plist")).not.toContain(
      "UISupportedInterfaceOrientations~ipad",
    );
  });

  it("configures Clerk Core 3 without an unused native Apple entitlement", () => {
    const clerkPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "@clerk/expo",
    );
    const iosProperties = JSON.parse(
      read("ios/Podfile.properties.json"),
    ) as Record<string, string>;
    const iosInfo = read("ios/CartShare/Info.plist");
    const entitlements = read("ios/CartShare/CartShare.entitlements");

    expect(clerkPlugin).toEqual(["@clerk/expo", { appleSignIn: false }]);
    expect(iosProperties["ios.deploymentTarget"]).toBe("17.0");
    expect(iosInfo).toContain("<key>ClerkExpoVersion</key>");
    expect(entitlements).not.toContain("com.apple.developer.applesignin");
  });
});
