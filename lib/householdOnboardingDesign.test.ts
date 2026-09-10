import fs from "node:fs";

function readSource(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

describe("household onboarding design", () => {
  it("uses the shared keyboard-safe frame and generated household artwork", () => {
    const createSource = readSource("app/household-setup.tsx");
    const joinSource = readSource("app/join-household.tsx");
    const frameSource = readSource(
      "components/onboarding/OnboardingFormScreen.tsx",
    );

    expect(createSource).toContain("<OnboardingFormScreen");
    expect(joinSource).toContain("<OnboardingFormScreen");
    expect(createSource).toContain("create-household.png");
    expect(joinSource).toContain("join-household.png");
    expect(frameSource).toContain("KeyboardAvoidingView");
    expect(frameSource).toContain("font-heading");
    expect(frameSource).toContain("accessibilityElementsHidden");

    expect(
      fs.existsSync("assets/onboarding/household/create-household.png"),
    ).toBe(true);
    expect(
      fs.existsSync("assets/onboarding/household/join-household.png"),
    ).toBe(true);
  });

  it("lets native navigation own route motion and keeps only short state fades", () => {
    const createSource = readSource("app/household-setup.tsx");
    const joinSource = readSource("app/join-household.tsx");
    const codeInputSource = readSource("components/ui/CodeInput.tsx");

    expect(createSource).not.toMatch(/FadeIn(?:Up|Down)|springify\(\)/);
    expect(joinSource).not.toMatch(/FadeIn(?:Up|Down)|ZoomIn|Confetti/);
    expect(codeInputSource).not.toMatch(/withSequence|withSpring|Haptics/);

    expect(joinSource).toContain("FadeIn.duration(150)");
    expect(joinSource).toContain("Easing.bezier(0.23, 1, 0.32, 1)");
  });
});
