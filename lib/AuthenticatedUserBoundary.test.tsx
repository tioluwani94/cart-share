import { useAuth } from "@clerk/expo";
import { useConvexAuth, useMutation } from "convex/react";
import React from "react";
import { Text } from "react-native";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";
import { AuthenticatedUserBoundary } from "./AuthenticatedUserBoundary";

jest.mock("@/convex/_generated/api", () => ({
  api: { users: { ensureCurrent: "users.ensureCurrent" } },
}));

jest.mock("@clerk/expo", () => ({
  useAuth: jest.fn(),
}));

jest.mock("convex/react", () => ({
  useConvexAuth: jest.fn(),
  useMutation: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseConvexAuth = useConvexAuth as jest.MockedFunction<
  typeof useConvexAuth
>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe("AuthenticatedUserBoundary", () => {
  it("holds authenticated children until their Convex user is ensured", async () => {
    let resolveEnsure: ((userId: string) => void) | undefined;
    const ensureCurrent = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveEnsure = resolve;
        }),
    );
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "clerk_1",
    } as ReturnType<typeof useAuth>);
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseMutation.mockReturnValue(ensureCurrent as never);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <AuthenticatedUserBoundary>
          <Text>Protected app providers</Text>
        </AuthenticatedUserBoundary>,
      );
    });

    expect(ensureCurrent).toHaveBeenCalledTimes(1);
    expect(() =>
      renderer!.root.findByProps({ children: "Protected app providers" }),
    ).toThrow();

    await act(async () => {
      resolveEnsure?.("user_1");
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({ children: "Protected app providers" }),
    ).toBeDefined();
  });

  it("signs out a stale Clerk session blocked by an account deletion tombstone", async () => {
    const signOut = jest.fn(async () => undefined);
    const ensureCurrent = jest.fn(async () => null);
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "clerk_deleted",
      signOut,
    } as unknown as ReturnType<typeof useAuth>);
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseMutation.mockReturnValue(ensureCurrent as never);

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <AuthenticatedUserBoundary>
          <Text>Protected app providers</Text>
        </AuthenticatedUserBoundary>,
      );
      await Promise.resolve();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(() =>
      renderer!.root.findByProps({ children: "Protected app providers" }),
    ).toThrow();
  });
});
