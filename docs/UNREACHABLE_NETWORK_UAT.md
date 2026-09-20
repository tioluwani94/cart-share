# Connected phone without usable internet

## Cause and fix

The previous item hooks sent mutations directly when NetInfo reported a network
connection. That path waited for the server and had no local update. A phone
with an exhausted data allowance could therefore show unchanged items until
Wi-Fi returned, even though Convex had retained the requests in memory.

Item add, edit, remove, and check/uncheck now always use the existing persisted,
account/household-scoped queue and local cache. Stable client IDs and absolute
completion values preserve ordering and prevent duplicate additions during
replay. A reported `isInternetReachable: false` also selects offline behavior.
Local feedback does not depend on the accuracy or speed of network detection.

Routine fast syncs stay quiet; a delivery taking over a second shows sync
feedback. These are client changes and require an updated app build. No Convex
schema or deployment change is required for this fix.

## Physical-device checks (pending)

Use a previously loaded shopping list on the updated development/internal build.
Airplane mode alone does not reproduce the reported problem. Also test a Wi-Fi
network without internet access or cellular service with no usable allowance.

1. Add two items. Both should appear immediately and the input should clear.
2. Check an existing item, uncheck it, then check it again. Every tap should show
   immediately. Check one newly added item too.
3. Rename an item and remove another. Confirm the visible changes immediately.
4. Close and reopen the app while still without internet. Confirm the changes
   remain on the list.
5. Restore working Wi-Fi. Confirm pending indicators clear, additions are not
   duplicated, and the final check states match on the other household device.
6. Repeat several quick additions and check/uncheck taps while online. There
   should be no success banner/haptic for each ordinary fast server response.

## Automated coverage

Regression tests hold server promises unresolved while the network reports
online. They verify immediate additions/checkmarks, further edits during a
stalled save, durable recovery after remount, FIFO replay, and final server
state. Network tests cover cellular connectivity with unreachable internet.
Existing offline checkout, retry, account-scope, and item/session tests remain
part of validation.
