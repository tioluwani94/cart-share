# Shopping sync recovery — September 21, 2026

Investigated against the supplied 78-second recording of TestFlight build 13.
Local additions/checks appeared immediately, but normal online writes flashed a
pending warning. After Wi-Fi returned, pending indicators persisted for roughly
45–50 seconds.

## Repairs

- Native network changes retire the old Convex WebSocket rather than waiting for
  its 60-second silence timeout. Returning to the foreground after a long silent
  period also refreshes network state and retires the stale connection.
- The existing Convex client retains authentication, subscriptions and mutation
  request IDs. Convex still owns retry backoff; no parallel HTTP replay is added.
- Acknowledged operations leave durable storage immediately, even while later
  operations are waiting. Newer local edits remain overlaid in FIFO order.
- Online row/header pending feedback has a one-second grace period. Offline
  feedback remains immediate; local saves never wait for connectivity.
- New work queued during replay no longer causes an intermediate “All synced”.
  Partial failures remain errors and retry after 15 seconds while connected.
- The Shop message correctly explains that locally saved work can be finished
  and synced later. Receipt scanning still requires pending work to clear.

## Automated and simulator verification

- Real Convex React client against a controlled WebSocket: Wi-Fi restoration
  replaces a silent connection within a two-second simulated window, even when
  the old native close handshake never returns. The same mutation request and
  session IDs are retained; late old-socket callbacks cannot corrupt the new one.
- Queue regressions cover immediate check/uncheck, pending feedback timing,
  successful-prefix retirement, partner edits during a stalled replay, new work
  between batches, bounded retries, partial failure and persisted offline edits.
- iOS simulator launched the updated development bundle and loaded the signed-in
  Plan screen without a runtime error.

## Physical iPhone UAT

The owner tested the standalone local iPhone 13 build and confirmed the sync
fixes look good on 21 September 2026. The following checklist is retained for
production TestFlight regression testing.

1. With working Wi-Fi, add several items and rapidly check/uncheck them. The
   item state must change immediately; quick saves should not flash a warning.
2. Turn off Wi-Fi while keeping cellular enabled without usable data. Add items,
   check/uncheck existing and newly added items, and move between Shop and Plan.
   Local state must survive navigation; delayed sync feedback must appear.
3. Restore Wi-Fi. Observe when pending indicators disappear and verify final
   names/check states on the partner's phone. No duplicate items should appear.
4. Repeat in Airplane Mode. Close/reopen the app offline before reconnecting and
   verify that locally saved edits survive.
5. Reconnect while continuing to add/check/uncheck. “All synced” must wait until
   all queued work completes, and the last intended checked state must win.
6. Finish a shop with offline edits pending, then reconnect. The completion and
   item states should appear once on both phones.
7. Background the app without usable data for at least 30 seconds, restore Wi-Fi
   and reopen it. Verify that sync resumes without the previous minute-long wait.

Actual recovery time still depends on network quality and Convex retry backoff.
A simulator cannot reproduce an exhausted cellular allowance. These client-only
changes are included in internal TestFlight 1.0.0 (14). No Convex source changes
were needed; both existing backend deployments were confirmed current.
