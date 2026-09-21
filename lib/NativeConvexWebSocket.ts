import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { AppState } from "react-native";

/**
 * Convex's supported WebSocket constructor adapter for native network changes.
 * Keep the same Convex client (and its mutation request IDs/auth/subscriptions).
 * Only retire the transport; Convex owns reconnect backoff and request replay.
 */
export class NativeConvexWebSocket extends WebSocket {
  private previousNetwork: NetInfoState | null = null;
  private lastMessageAt = Date.now();
  private retired = false;
  private unsubscribeNetwork?: () => void;
  private unsubscribeAppState?: () => void;

  constructor(url: string | URL, protocols?: string | string[]) {
    super(url, protocols);
    this.addEventListener("message", this.recordMessage);
    this.addEventListener("close", this.cleanup);
    this.unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const previous = this.previousNetwork;
      this.previousNetwork = state;
      const reachable = (network: NetInfoState) =>
        network.isConnected === true && network.isInternetReachable !== false;
      if (
        previous && reachable(state) &&
        (!reachable(previous) || previous.type !== state.type)
      ) {
        this.retireTransport();
      }
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void NetInfo.refresh().catch(() => undefined);
      // Server pings arrive every 15 seconds. After a long suspension, do not
      // wait for the SDK's 60-second silence timeout on an old native socket.
      if (Date.now() - this.lastMessageAt > 30000) this.retireTransport();
    });
    this.unsubscribeAppState = () => subscription.remove();
  }

  private recordMessage = () => { this.lastMessageAt = Date.now(); };

  private cleanup = () => {
    this.unsubscribeNetwork?.();
    this.unsubscribeAppState?.();
    this.removeEventListener("message", this.recordMessage);
    this.removeEventListener("close", this.cleanup);
  };

  private retireTransport() {
    if (this.retired || this.readyState >= WebSocket.CLOSING || !this.onclose) return;
    this.retired = true;
    const notifyConvex = this.onclose;
    // A native close handshake can itself stall on the lost network. Detach
    // late callbacks and notify Convex once, without waiting for that handshake.
    this.onopen = this.onmessage = this.onerror = this.onclose = null;
    this.close(1000, "Native network changed");
    // This adapter is used only by Convex, whose close handler reads code and
    // reason. RN doesn't expose a global CloseEvent constructor on this SDK.
    notifyConvex.call(this, {
      type: "close", code: 1000, reason: "Native network changed", wasClean: false,
    } as CloseEvent);
  }

  override close(code?: number, reason?: string) {
    this.cleanup();
    super.close(code, reason);
  }
}
