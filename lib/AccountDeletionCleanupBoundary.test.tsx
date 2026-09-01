import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Text } from "react-native";
import { AccountDeletionCleanupBoundary } from "./AccountDeletionCleanupBoundary";
import { recoverPendingAccountDeletionCleanup } from "./accountDeletionCleanup";

jest.mock("./accountDeletionCleanup", () => ({
  recoverPendingAccountDeletionCleanup: jest.fn(),
}));

const mockedRecover = jest.mocked(recoverPendingAccountDeletionCleanup);

describe("AccountDeletionCleanupBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not mount app providers until pending deletion cleanup finishes", async () => {
    let resolveRecovery!: () => void;
    mockedRecover.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveRecovery = () => resolve(true);
      }),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <AccountDeletionCleanupBoundary>
          <Text>Protected app</Text>
        </AccountDeletionCleanupBoundary>,
      );
    });
    expect(() =>
      renderer.root.findByProps({ children: "Protected app" }),
    ).toThrow();

    await act(async () => {
      resolveRecovery();
    });
    expect(
      renderer.root.findByProps({ children: "Protected app" }),
    ).toBeDefined();
  });

  it("offers a blocking retry when startup cleanup fails transiently", async () => {
    mockedRecover
      .mockRejectedValueOnce(new Error("SecureStore unavailable"))
      .mockResolvedValueOnce(true);

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <AccountDeletionCleanupBoundary>
          <Text>Protected app</Text>
        </AccountDeletionCleanupBoundary>,
      );
    });

    const retry = renderer.root.findByProps({
      accessibilityLabel: "Retry account cleanup",
    });
    await act(async () => {
      const onPress = retry.props.onPress as () => void;
      onPress();
    });

    expect(mockedRecover).toHaveBeenCalledTimes(2);
    expect(
      renderer.root.findByProps({ children: "Protected app" }),
    ).toBeDefined();
  });
});
