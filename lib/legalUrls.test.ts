import { OUR_PANTRY_URLS } from "./legalUrls";

describe("OUR_PANTRY_URLS", () => {
  it("uses the verified HTTPS pages on the branded domain", () => {
    expect(OUR_PANTRY_URLS).toEqual({
      privacy: "https://ourpantry.app/privacy",
      terms: "https://ourpantry.app/terms",
      support: "https://ourpantry.app/support",
      accountDeletion: "https://ourpantry.app/account-deletion",
    });

    for (const url of Object.values(OUR_PANTRY_URLS)) {
      expect(url.startsWith("https://ourpantry.app/")).toBe(true);
    }
  });
});
