# StreamBoost Single-Protocol Mock Specification

This document captures the latest conversation output: a focused mock specification applying the core essences (workflow, data design, status tracking, lists, protocol-specific panels, transaction transparency, error handling, network awareness, data freshness, security cues, composability, user context) to a single streaming & vesting protocol.

---

## 1. Sender-Recipient Relationship Model

### Stream Configuration & Token Support

**One-to-One Relationship**: Each stream establishes a direct one-to-one relationship between a single sender and a single recipient. The current design enforces this constraint at the smart contract level where:

- Each stream (`Stream` struct) contains exactly one `sender` address and one `recipient` address
- A sender can create multiple streams to different recipients, but each individual stream targets only one recipient
- Each stream is configured for a single ERC-20 token (specified via the `token` address field)

**Token Specification**: When creating a stream, the sender must specify:

- The exact token contract address (`_token` parameter in `createStream()`)
- The total amount of that specific token to be streamed
- Only one token type per stream (no multi-token streams in current design)

### Access Rights & Control

**Sender Rights**: The stream creator (sender) maintains control over stream lifecycle:

- **Stop/Pause**: Only the sender can pause an active stream (`pauseStream()` - requires `msg.sender == stream.sender`)
- **Resume**: Only the sender can resume a paused stream (`resumeStream()` - requires `msg.sender == stream.sender`)
- **Stream Management**: Full control over stream state transitions (except claiming)

**Recipient Rights**: The designated recipient has exclusive claiming privileges:

- **Claim Rights**: Only the specific recipient can claim vested tokens (`claimStream()` - requires `msg.sender == stream.recipient`)
- **No Control Rights**: Recipients cannot pause, resume, or modify stream parameters
- **Exclusive Access**: No other address can claim tokens from the recipient's stream

This model ensures clear ownership boundaries and prevents unauthorized access to either sender controls or recipient funds.

---

## 2. Linear Vesting System

The StreamBoost protocol implements **linear vesting** where tokens are gradually released over time according to a predefined schedule.

### Vesting Calculation

**Principal Stream (Linear Vesting)**:

```solidity
// Linear vesting of deposited tokens
vestedAmount = (totalAmount * elapsedTime) / duration
```

- **Source**: Original deposited tokens (`totalAmount`)
- **Rate**: Linear vesting over stream `duration`
- **Example**: 10,000 USDC over 365 days = ~27.4 USDC/day

### Claiming

**Single Claiming Option**:

1. **`claimStream(_streamId, _amount)`** - Vested Principal

   - Claims only vested principal tokens
   - Recipients can claim up to the vested amount minus what they've already claimed
   - Claiming is subject to cliff restrictions if a cliff period is active

### Example Scenario

After 6 months of a 1-year, 10,000 USDC stream:

| Progress | Vested Amount | Available to Claim (if nothing claimed yet) |
| -------- | ------------- | ------------------------------------------- |
| 50%      | 5,000 USDC    | 5,000 USDC                                  |

**Recipient Claiming Strategy**:

- `claimStream(streamId, 2000)` → Receive 2,000 USDC from vested amount
- Remaining claimable: 3,000 USDC (5,000 - 2,000)

This simplified vesting system provides **predictable linear token release** with clear cliff period controls when configured.

---

## 3. Stream Completion Model

The StreamBoost protocol uses a **natural completion model** where streams run until their designated end time or until all tokens are claimed by the recipient.

### Stream Lifecycle

**Stream States**:

- **ACTIVE**: Stream is running and tokens are vesting
- **PAUSED**: Stream temporarily paused by sender (vesting stops)
- **COMPLETED**: All tokens have been claimed or stream duration has ended
- **CANCELLED**: Stream was cancelled (only via mock functions for testing)

### Completion Scenarios

**Natural Completion**:

- Stream reaches its `endTime` - all tokens become fully vested
- Recipient claims all remaining tokens - stream marked as COMPLETED
- No penalties or fees are applied to natural completion

**Pause/Resume Functionality**:

- **Sender Control**: Only the stream sender can pause or resume streams
- **Vesting Impact**: Pausing stops vesting progress; resuming extends `endTime` by pause duration
- **Recipient Impact**: Recipients cannot claim while stream is paused

### Example Scenarios

**Scenario 1: Complete Natural Stream**

- Stream: 10,000 USDC over 365 days
- Day 365: All 10,000 USDC vested and available to claim
- Recipient claims full amount → Stream status: COMPLETED

**Scenario 2: Early Full Claim**

- Stream: 10,000 USDC over 365 days
- Day 200: 5,479 USDC vested (200/365 \* 10,000)
- Recipient claims all available 5,479 USDC
- Stream continues until day 365 when remaining 4,521 USDC can be claimed

**Scenario 3: Pause/Resume**

- Stream paused on day 100, resumed on day 150 (50-day pause)
- Original end time: Day 365 → New end time: Day 415 (365 + 50)
- Vesting continues normally from pause point

This simplified completion model provides **predictable stream behavior** without complex penalty calculations while maintaining sender control through pause/resume functionality.

---

## 4. Cliff Vesting System

The StreamBoost protocol implements a **cliff vesting mechanism** that allows senders to create streams with an initial lock-up period during which principal tokens cannot be claimed.

### Cliff Configuration & Validation

**Cliff Duration Setup**:

```solidity
function createStream(
    string memory _id,
    address _recipient,
    address _token,
    uint256 _totalAmount,
    uint256 _duration,
    uint256 _cliffDuration   // Optional cliff period
) external
```

**Validation Rules**:

- **Duration Constraint**: `_cliffDuration <= _duration` (cliff cannot exceed stream duration)
- **Practical Limits**: Cliff duration must be at least 1 hour if specified (minimum 3600 seconds)
- **Edge Case Prevention**: Cliff duration cannot equal stream duration (no claimable period would exist)
- **Zero Cliff Allowed**: `_cliffDuration = 0` creates a stream without cliff (immediate claiming enabled)

### Cliff Mechanics & Behavior

**Dual Progress Tracking**:

```solidity
// Overall stream progress (vesting continues during cliff)
function getStreamProgress(streamId) returns (uint256 progressPct)

// Claimable progress (0% during cliff, normal after)
function getClaimableProgress(streamId) returns (uint256 claimablePct)

// Cliff-specific progress tracking
function getCliffProgress(streamId) returns (uint256 cliffProgress, bool cliffPassed)
```

**Vesting vs Claiming Separation**:

- **Vesting Continues**: Principal tokens vest linearly throughout entire stream duration, including cliff period
- **Claiming Blocked**: Recipients cannot claim principal tokens until cliff period ends

### Cliff Impact on Core Functions

**Claiming Behavior During Cliff**:

```solidity
function getClaimableAmount(streamId) public view returns (uint256) {
    // Returns 0 if cliff is active, normal calculation after cliff
    if (cliffTime > 0 && getCurrentTimestamp() < cliffTime) {
        return 0;  // No principal claimable during cliff
    }
    return vestedAmount - claimedAmount;
}

function canClaimDuringCliff(streamId) public view returns (bool canClaimPrincipal) {
    bool cliffActive = stream.cliffTime > 0 && currentTime < stream.cliffTime;
    canClaimPrincipal = !cliffActive;        // Principal blocked during cliff
}
```

**Cliff Integration with Stream Lifecycle**:

- **No Termination Penalties**: Streams complete naturally or through pause/resume functionality
- **Cliff Respect**: All stream operations respect cliff periods
- **Clean Completion**: Streams run until natural completion without penalty complications

### Cliff Information & Monitoring

**Cliff Status Functions**:

```solidity
function getCliffInfo(streamId) public view returns (
    uint256 cliffTime,      // Absolute cliff end timestamp
    uint256 timeUntilCliff, // Seconds remaining until cliff ends
    bool hasCliff,          // Whether stream has cliff configuration
    bool cliffPassed        // Whether cliff period has ended
)
```

**Progress Tracking**:

- **Cliff Progress**: Tracks progress through cliff period (0% → 100%)
- **Time Remaining**: Countdown to cliff end for UI display
- **Status Integration**: Cliff status integrated with overall stream monitoring

### Example Cliff Scenarios

**Scenario 1: Standard Cliff Setup**

- Stream: 10,000 USDC, 365-day duration, 90-day cliff
- During cliff (days 0-90): 0 USDC claimable principal
- After cliff (days 90-365): Normal linear claiming of principal

**Scenario 2: Cliff with Pause/Resume**

- Stream paused on day 60 (during 90-day cliff)
- Stream resumed on day 90 (cliff end extended to day 120)
- Recipients can claim principal starting day 120
- Clean pause/resume functionality without penalties

**Scenario 3: Mixed Claiming Strategy**

```
Day 30 (cliff active):  Cannot claim principal (cliff still active)
Day 100 (cliff ended):  claimStream() → Claim available principal
```

### Cliff Integration with Vesting

**Principal Stream During Cliff**:

- Vesting continues normally: `vestedAmount = totalAmount * elapsed / duration`
- Claiming blocked: `claimableAmount = 0` until cliff ends
- Progress tracking: Separate cliff progress vs overall stream progress

**Principal Stream During Cliff**:

- **Vesting continues**: Tokens continue vesting during cliff period
- **Claiming blocked**: Recipients cannot claim until cliff ends
- **Clean integration**: Simple cliff logic without complex boost interactions

### Cliff Validation & Edge Cases

**Input Validation**:

```solidity
function validateCliffSetup(uint256 _duration, uint256 _cliffDuration)
    public pure returns (bool isValid, string memory reason) {

    if (_cliffDuration > _duration) {
        return (false, "Cliff duration exceeds stream duration");
    }
    if (_cliffDuration == _duration) {
        return (false, "Cliff duration equals stream duration - no claimable period");
    }
    if (_duration > 0 && _cliffDuration > 0 && _cliffDuration < 3600) {
        return (false, "Cliff duration too short (minimum 1 hour)");
    }
    return (true, "Valid cliff setup");
}
```

**Edge Case Handling**:

- **Zero Cliff**: `cliffTime = 0` indicates no cliff (immediate claiming enabled)
- **Cliff Boundary**: Exact cliff end timestamp enables claiming
- **Paused Streams**: Cliff timing unaffected by pause/resume (absolute timestamps)
- **Mock Time**: Cliff calculations respect mock timestamp for testing

### UI/UX Considerations

**Progress Visualization**:

- **Dual Progress Bars**: Cliff progress (0-100%) + overall stream progress (0-100%)
- **Status Indicators**: "Cliff Active", "Cliff Ended", visual countdown timers
- **Claiming Hints**: Clear messaging about principal availability

**User Guidance**:

- **Cliff Warning**: Clear disclosure during stream creation about claiming restrictions
- **Strategic Options**: Educate users about timing of claims post-cliff

### Test Coverage

**Comprehensive Test Suite**:

- **Validation Tests**: Cliff duration boundary conditions and edge cases
- **Functional Tests**: Claiming behavior during and after cliff periods
- **Progress Tests**: Cliff vs stream progress calculations
- **Integration Tests**: Cliff interaction with pause/resume functionality
- **Edge Case Tests**: Zero cliff, boundary timestamps, mock time scenarios

This cliff system provides **flexible vesting controls** for stream creators while maintaining **clear user expectations** and **straightforward claiming** throughout the stream lifecycle.

---

## 5. Clear Workflow (User → Contract Sequence)

Primary user goal: Create and manage token streams that vest linearly (optionally with a cliff).

Main flows (conceptual steps only):

1. Create Stream Draft (select token, recipient, total amount, duration, cliff?)
2. Approve Token (if allowance insufficient)
3. Start Stream (deploy/register)
4. Monitor Stream (progress %, claimable amount, cliff status)
5. (Optional) Pause / Resume
6. Recipient Claims (partial or full vested / claimable portion)
7. Stream Closure (natural completion)

Recipient flow:

1. View Incoming Streams
2. Monitor Cliff Status & Progress
3. Claim Available Tokens (principal after cliff)
4. Track Stream Progress
5. Acknowledge Expired / Closed Streams

UI: Stepper always shows current position, including cliff progress.

---

## 6. Minimal Data Structures

```ts
type UserState = {
  address: string;
  balances: Record<string, number>;
  activeStreamIds: string[];
  incomingStreamIds: string[];
  lastUpdated: number;
  flags?: { isNew?: boolean; hasUnclaimed?: boolean };
};

type AssetState = {
  symbol: string;
  price: number;
  decimals: number;
  lastUpdated: number;
};

type ProtocolState = {
  name: "StreamBoost";
  type: "streaming";
  stats: {
    totalValueLocked: number;
    totalActiveStreams: number;
    averageAPR: number;
    avgDurationDays: number;
  };
  systemHealth?: { oracleFresh: boolean; yieldEngineSynced: boolean };
  lastUpdated: number;
};

type StreamStatus =
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

type Stream = {
  id: string;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: number;
  startTime: number;
  endTime: number;
  cliffTime?: number;
  createdAt: number;
  claimedAmount: number;
  pausedAt?: number;
  status: StreamStatus;
  vestedAmount: number;
  claimableAmount: number;
  progressPct: number; // 0–100
  cliffProgressPct?: number; // 0–100 cliff completion
  timeRemainingSec: number;
  timeUntilCliffSec?: number; // seconds until cliff ends
  hasCliff: boolean;
  cliffPassed: boolean;
  canClaimPrincipal: boolean;
};

type TxRecord = {
  id: string;
  label: string;
  type: "approve" | "createStream" | "claim" | "pause" | "resume" | "topUp";
  status: "idle" | "signing" | "pending" | "confirmed" | "failed";
  errorCode?: string;
  timestamps: Partial<Record<"submitted" | "confirmed" | "failed", number>>;
};
```

---

## 7. Core Status Tracking

Indicators:

- Global: TVL, Active Streams, Average Duration, Oracle Freshness
- Per Stream: Progress %, Claimable, Time Remaining
- Risk Flags: Oracle stale, Stream paused, Low Sender Balance

Thresholds (examples):

- Progress <25% neutral, 25–75% info, >75% accent
- Oracle stale >60s warn, >300s danger

---

## 8. List Data Display

Lists:

- Outgoing Streams (sortable by amount, progress, end date)
- Incoming Streams (sortable by claimable, sender, end date)
- Completed Streams
- Pending Actions (top-up needed, near cliff)
  Features: filtering (status, token), quick row actions (Claim, Pause, Resume, Top Up).

---

## 9. Protocol-Specific Panels

- Stream Composer (form wizard with cliff configuration)
- Cliff Setup Panel (duration validation, UI warnings)
- Stream Detail Drawer (timeline view with cliff markers)
- Claim Console (batch claim with cliff awareness)
- Progress Tracking Panel (dual cliff/stream progress bars)
- Adjustment Panel (extend, top-up)

---

## 10. Transaction State Transparency

States: idle → signing → pending → confirmed | failed
Multi-step (Create): Approve → Create Stream.
Activity feed: timeline with icons & status badges.
Failures show suggestion (e.g. increase allowance).

---

## 11. Error & Edge Case Handling

Error codes:

- ALLOWANCE_MISSING
- INSUFFICIENT_BALANCE
- ORACLE_STALE
- STREAM_ALREADY_PAUSED
- NOT_CLAIMABLE_YET
- CLIFF_EXCEEDS_DURATION
- CLIFF_TOO_SHORT
- CLAIMING_DURING_CLIFF
- INVALID_CLIFF_SETUP

Behaviors:

- Cliff gate: principal claim disabled pre-cliff
- Cliff validation: duration constraints and minimum thresholds enforced
- Paused: progress freeze, cliff timing unaffected
- Oracle stale: hide price information
- Cliff progress: dual progress tracking for cliff vs overall stream completion

---

## 12. Network Awareness

Supported Chains: 1 (Mainnet mock), 8453 (L2 mock)
Mismatch prompt before creation if chain unsupported.

---

## 13. Data Freshness & Real-Time Updates

Intervals:

- Stream progress recalculation: 5s
- Prices: 20s
  Staleness:
- progressStale >10s
- priceStale >60s
  UI: subtle pulse / grey overlay when stale.

---

## 14. Security / Trust Cues

Pre-action review modal: token, total, duration, cliff, gas (mock).
Warnings: Long duration, Oracle stale.
Simulation badge when using mock engine.

---

## 15. Composability / Reusability

Primitives:

- Stepper
- DataList
- StatusIndicator bar
- TransactionQueue panel
- ErrorBanner / InlineHint

Protocol logic stays separate from presentation.

---

## 16. User Context

New User: Onboarding panel + educational cards.
Existing User: Dashboard with totals & quick claims.
Power User: Batch actions (claim all, pause selected), alerts (near completion, underfunded).

---

## Supplemental Mock Dynamics

- Linear vesting: vested = total \* elapsed / duration (unless paused)
- Oracle price jitter ±1% every 20s
- Random pause injection (flagged as simulated)

Latency (mock): Approve 1–2s, Create 3–4s, Claim 2–3s, Pause/Resume 1–2s
Failure injection: 5% revert

---

## Key Derived Formulas

- vestedAmount = clamp(totalAmount \* (now - start) / (end - start), 0, totalAmount) if !paused
- claimable = vested - claimed (0 if now < cliff)
- progressPct = vested / total \* 100

---

## Minimal JSON Snapshot

```json
{
  "protocol": {
    "name": "StreamBoost",
    "type": "streaming",
    "stats": {
      "totalValueLocked": 125000.42,
      "totalActiveStreams": 48,
      "avgDurationDays": 92
    },
    "lastUpdated": 1699999999
  },
  "streams": [
    {
      "id": "strm_01",
      "sender": "0xSenderA",
      "recipient": "0xRecipZ",
      "token": "USDC",
      "totalAmount": 10000,
      "startTime": 1700000000,
      "endTime": 1707776000,
      "claimedAmount": 1800,
      "vestedAmount": 2500,
      "claimableAmount": 700,
      "progressPct": 25,
      "status": "active",
      "timeRemainingSec": 7776000
    }
  ]
}
```

---

## Essence Mapping

1. Workflow: Stream lifecycle stepper
2. Data Structures: Minimal plus stream-specific fields
3. Status Tracking: Progress, claimable indicators
4. Lists: Outgoing / Incoming / Completed / Pending
5. Protocol Panels: Composer, Detail, Claim Console
6. Transactions: Multi-step with transparent states
7. Errors: Normalized codes & actionable hints
8. Network: Chain support & mismatch handling
9. Freshness: Timed recalculation & stale flags
10. Security Cues: Review modal, risk warnings
11. Reusability: Shared UI primitives
12. User Context: Onboarding vs active vs power user

---

End of specification.
