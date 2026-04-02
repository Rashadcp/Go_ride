# Fix: Resolving Inactive Driver "Rihaan Shehariyar"

## Analysis
The driver **Rihaan Shehariyar** (ID: `69bad8ffbb456b3d29d02674`) is appearing on the map but identified as inactive for two reasons:
1.  **Presence Leak**: He was added to the `active-drivers` pool in Redis, but his session either crashed or was never properly cleared.
2.  **Stale Data**: The real-time tracking system (Redis Hash) currently lacks a "heartbeat" cleanup, so any driver added to the map stays there indefinitely until an explicit `disconnect` or `remove` event occurs.

## Planned Fixes

### 🏆 1. Stale Presence Filtering (`backend/src/sockets/state.ts`)
Update `getAvailableDrivers` to filter out any driver whose `lastSeen` timestamp is older than **2 minutes**. This ensures that even if a server crashes, "zombie" icons like Rihaan will disappear naturally.

### 🛡️ 2. Driver Role Verification (`backend/src/config/socket.ts`)
Add a check in the `driver-online` handler to verify that the user's role is `DRIVER` and their account status is `APPROVED` or `ACTIVE` in the MongoDB `User` model. This prevents `USER` accounts or unapproved drivers from appearing as available car icons.

### 🧹 3. Explicit Session Cleanup (`backend/src/sockets/handlers/carpool.handler.ts`)
Ensure the `driver:session:end` event explicitly removes the driver from the Redis active pool to clear the map icon immediately upon trip completion.
