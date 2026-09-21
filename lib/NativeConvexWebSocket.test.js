const mockNetworkListeners = new Set();
const mockAppListeners = new Set();
let mockNetwork = { type: "cellular", isConnected: true, isInternetReachable: true };
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: (listener) => {
      mockNetworkListeners.add(listener);
      listener(mockNetwork);
      return () => mockNetworkListeners.delete(listener);
    },
    refresh: jest.fn(async () => mockNetwork),
  },
}));
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_, listener) => {
      mockAppListeners.add(listener);
      return { remove: () => mockAppListeners.delete(listener) };
    },
  },
}));

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static sockets = [];
  readyState = 0;
  sent = [];
  listeners = new Map();
  constructor() { FakeWebSocket.sockets.push(this); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  open() { this.readyState = 1; this.onopen?.({}); }
  message(data) {
    const event = { data: JSON.stringify(data) };
    this.listeners.get("message")?.forEach((fn) => fn(event));
    this.onmessage?.(event);
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  // Deliberately never acknowledge a close: native close can stall on a dead path.
  close() { this.readyState = 2; }
  closed() {
    this.readyState = 3;
    this.listeners.get("close")?.forEach((fn) => fn());
    this.onclose?.({ code: 1000, reason: "" });
  }
}
const originalWebSocket = global.WebSocket;
global.WebSocket = FakeWebSocket;
const { NativeConvexWebSocket } = jest.requireActual("./NativeConvexWebSocket");
const { ConvexReactClient } = jest.requireActual("convex/react");
const { makeFunctionReference } = jest.requireActual("convex/server");
function network(state) {
  mockNetwork = state;
  [...mockNetworkListeners].forEach((listener) => listener(state));
}
beforeEach(() => {
  jest.useFakeTimers();
  FakeWebSocket.sockets = [];
  mockNetworkListeners.clear();
  mockAppListeners.clear();
  mockNetwork = { type: "cellular", isConnected: true, isInternetReachable: true };
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
afterAll(() => { global.WebSocket = originalWebSocket; });

it("recovers a real Convex mutation on Wi-Fi without waiting for the silent socket or its close handshake", async () => {
  const client = new ConvexReactClient("https://example.convex.cloud", {
    webSocketConstructor: NativeConvexWebSocket, unsavedChangesWarning: false, logger: false,
  });
  const pending = client.mutation(makeFunctionReference("items:setCompleted"), { isCompleted: true });
  const old = FakeWebSocket.sockets[0];
  old.open();
  const mutation = old.sent.find((message) => message.type === "Mutation");
  const connect = old.sent.find((message) => message.type === "Connect");
  network({ type: "wifi", isConnected: true, isInternetReachable: true });
  expect(old.readyState).toBe(2);
  expect(mockNetworkListeners.size).toBe(0);
  jest.advanceTimersByTime(2000);
  expect(FakeWebSocket.sockets).toHaveLength(2);
  const replacement = FakeWebSocket.sockets[1];
  replacement.open();
  expect(replacement.sent.find((message) => message.type === "Mutation")).toEqual(mutation);
  expect(replacement.sent.find((message) => message.type === "Connect").sessionId).toBe(connect.sessionId);
  // Late callbacks from the discarded connection must not change SDK state.
  old.open(); old.message({ type: "Ping" }); old.closed();
  expect(client.connectionState().isWebSocketConnected).toBe(true);
  replacement.message({ type: "MutationResponse", requestId: mutation.requestId, success: true,
    result: null, ts: "AQAAAAAAAAA=", logLines: [] });
  replacement.message({ type: "Transition", startVersion: { querySet: 0, identity: 0, ts: "AAAAAAAAAAA=" },
    endVersion: { querySet: 0, identity: 0, ts: "AQAAAAAAAAA=" }, modifications: [] });
  await expect(pending).resolves.toBeNull();
  const closing = client.close(); replacement.closed(); await closing;
  expect(mockNetworkListeners.size).toBe(0);
  expect(mockAppListeners.size).toBe(0);
});

it("ignores repeated network reports and retires once when reachability returns on the same network", () => {
  const socket = new NativeConvexWebSocket("wss://example.com");
  socket.open();
  const onClose = jest.fn(); socket.onclose = onClose;
  network({ ...mockNetwork });
  expect(onClose).not.toHaveBeenCalled();
  network({ ...mockNetwork, isInternetReachable: false });
  expect(onClose).not.toHaveBeenCalled();
  network({ ...mockNetwork, isInternetReachable: true });
  network({ ...mockNetwork });
  socket.closed();
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("leaves a healthy foreground connection alone, but retires one silent through a long suspension", () => {
  const socket = new NativeConvexWebSocket("wss://example.com");
  socket.open(); socket.onclose = jest.fn();
  const closed = socket.onclose;
  mockAppListeners.forEach((listener) => listener("active"));
  expect(closed).not.toHaveBeenCalled();
  jest.advanceTimersByTime(31000);
  [...mockAppListeners].forEach((listener) => listener("active"));
  expect(closed).toHaveBeenCalledTimes(1);
});
