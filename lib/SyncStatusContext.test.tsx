import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { SyncStatusProvider, useSyncStatus } from "./SyncStatusContext";

it("reports a partial replay failure as an error, rather than all synced", () => {
  jest.useFakeTimers();
  let status!: ReturnType<typeof useSyncStatus>;
  function Consumer() { status = useSyncStatus(); return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<SyncStatusProvider><Consumer /></SyncStatusProvider>); });
  act(() => status.finishSyncing({ success: 1, failed: 0 }));
  expect(status.status).toBe("synced");
  act(() => status.finishSyncing({ success: 1, failed: 1 }));
  expect(status.status).toBe("error");
  act(() => jest.advanceTimersByTime(3000));
  expect(status.status).toBe("error");
  act(() => tree.unmount());
  jest.useRealTimers();
});
