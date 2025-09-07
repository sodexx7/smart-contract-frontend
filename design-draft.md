# StreamBoost Single-Protocol Mock Specification

This document captures the latest conversation output: a focused mock specification applying the core essences (workflow, data design, status tracking, lists, protocol-specific panels, transaction transparency, error handling, network awareness, data freshness, security cues, composability, user context) to a single streaming & vesting yield protocol.

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

## 2. Dual Earnings System: Principal + Boost Rewards

The StreamBoost protocol implements **two separate and independent earning streams** that recipients can claim individually or together.

### Stream Types & Calculations

**Principal Stream (Normal Earnings)**:
```solidity
// Linear vesting of deposited tokens
vestedAmount = (totalAmount * elapsedTime) / duration
```
- **Source**: Original deposited tokens (`totalAmount`)
- **Rate**: Linear vesting over stream `duration`
- **Example**: 10,000 USDC over 365 days = ~27.4 USDC/day

**Boost Stream (Yield Rewards)**:
```solidity
// APR-based yield on average locked principal
boostEarnings = (avgUnclaimed * boostAPR * elapsedTime) / (10000 * yearInSeconds)
```
- **Source**: Yield generated on locked principal
- **Rate**: APR-based calculation (e.g., 720 basis points = 7.2% annually)
- **Example**: 7.2% on avg 7,500 USDC locked = ~540 USDC/year

### Independent Tracking & Claiming

**Separate Accounting**:
- `claimedAmount`: Tracks claimed principal
- `claimedBoostAmount`: Tracks claimed boost rewards
- `totalBoostEarned`: Accumulates total boost rewards over time

**Three Claiming Options**:

1. **`claimStream(_streamId, _amount)`** - Principal Only
   - Claims only vested principal tokens
   - Updates boost tracking but doesn't transfer boost rewards
   - Boost rewards remain unclaimed and continue accumulating

2. **`claimStreamWithBoost(_streamId, _amount)`** - Principal + Boost
   - Claims both vested principal AND accumulated boost rewards
   - Transfers: `_amount` (principal) + `claimableBoost` (yield)
   - Most efficient for recipients wanting both earnings

3. **`claimBoostOnly(_streamId)`** - Yield Only
   - Claims only boost rewards, leaves principal untouched
   - Useful for harvesting yield while keeping principal locked
   - Principal continues vesting normally

### Example Scenario

After 6 months of a 1-year, 10,000 USDC boosted stream (7.2% APR):

| Earning Type | Available Amount | Calculation |
|--------------|------------------|-------------|
| **Principal** | ~5,000 USDC | 50% of 10,000 USDC vested |
| **Boost** | ~360 USDC | 7.2% APR on avg locked balance |

**Recipient Claiming Strategies**:
- `claimStream(streamId, 2000)` → Receive 2,000 USDC principal only
- `claimStreamWithBoost(streamId, 2000)` → Receive 2,360 USDC total (2,000 + 360)
- `claimBoostOnly(streamId)` → Receive 360 USDC yield, keep principal locked

### Boost Calculation Details

**Average Principal Method**:
```solidity
uint256 currentUnclaimed = totalAmount - claimedAmount;
uint256 avgUnclaimed = (totalAmount + currentUnclaimed) / 2;
```

**Time-Based Accrual**:
- Boost rewards accrue continuously from stream start
- Paused streams freeze boost earnings at pause point
- Resumed streams continue boost accrual from stored amount

**APR Integration**:
- `boostAPR` stored in basis points (720 = 7.2%)
- Can be updated dynamically via `mockUpdateStreamBoostAPR()`
- Zero APR for non-boosted streams

This dual-stream architecture provides recipients **maximum flexibility** to optimize their claiming strategy while maintaining clear separation between principal and yield earnings.

---

## 3. Early Termination Penalty System

The StreamBoost protocol implements a **time-based penalty system** for early stream termination to protect senders from premature withdrawal while providing fair exit mechanisms for both parties.

### Penalty Structure & Rates

**Progressive Penalty Model**:
```solidity
// Penalty rates based on stream completion percentage
if (progress < 25%)  → 20% penalty on remaining funds
if (progress < 50%)  → 15% penalty on remaining funds  
if (progress < 75%)  → 10% penalty on remaining funds
if (progress < 90%)  → 5% penalty on remaining funds
if (progress >= 90%) → 2% penalty on remaining funds
```

**Penalty Calculation**:
- **Base Amount**: `remainingAmount = totalAmount - claimedAmount`
- **Penalty Formula**: `penalty = remainingAmount × penaltyRate / 10000`
- **Net Transfer**: `transferAmount = remainingAmount - penalty`

### Termination Authority & Process

**Who Can Terminate**:
- **Stream Sender**: Can terminate any active/paused stream they created
- **Stream Recipient**: Can terminate any active/paused stream directed to them
- **Unauthorized users**: Cannot terminate (reverts with access control error)

**Termination Process**:
1. **Validate Access**: Ensure caller is sender or recipient
2. **Check Stream State**: Only ACTIVE or PAUSED streams can be terminated
3. **Calculate Penalty**: Based on current progress percentage
4. **Update Financials**: Apply penalty to `penaltiesAccrued` field
5. **Transfer Funds**: Send `remainingAmount - penalty` to recipient
6. **Preserve Boost**: Auto-claim any unclaimed boost rewards for recipient
7. **Update Status**: Mark stream as CANCELLED
8. **Emit Events**: `PenaltyApplied` and `StreamTerminated`

### Core Functions

**Penalty Calculation Functions**:
```solidity
function calculateEarlyTerminationPenalty(streamId) 
    public view returns (uint256)
    
function getPenaltyInfo(streamId) 
    public view returns (uint256 penalty, uint256 remaining, uint256 rate)
```

**Termination Function**:
```solidity
function terminateStream(streamId) external
    // Accessible by sender OR recipient
    // Applies penalty and transfers remaining funds
    // Preserves unclaimed boost rewards
```

### Penalty Integration with Dual Earnings

**Principal Stream Impact**:
- Penalty applied only to **remaining principal** (unclaimed portion)
- Previously claimed principal remains unaffected
- Penalty deducted before final transfer to recipient

**Boost Stream Protection**:
- **Boost rewards exempt from penalties**
- All unclaimed boost earnings transferred to recipient during termination  
- Boost calculations frozen at termination point for paused streams

### Example Scenarios

**Scenario 1: Early Termination (30% Progress)**
- Stream: 10,000 USDC, 30% completed, 0 claimed
- Remaining: 10,000 USDC (no partial claims yet)
- Penalty: 10,000 × 15% = 1,500 USDC
- Recipient receives: 8,500 USDC + boost rewards

**Scenario 2: Late Termination (80% Progress)**  
- Stream: 10,000 USDC, 80% completed, 3,000 USDC claimed
- Remaining: 7,000 USDC (10,000 - 3,000 claimed)
- Penalty: 7,000 × 5% = 350 USDC  
- Recipient receives: 6,650 USDC + boost rewards

**Scenario 3: Boosted Stream Termination**
- Base calculation as above
- **Additional**: All accumulated boost rewards transferred separately
- Total recipient receives: `(remaining - penalty) + boostRewards`

### Events & Monitoring

**Termination Events**:
```solidity
event StreamTerminated(
    string indexed streamId,
    address indexed terminator,
    uint256 penaltyAmount,
    uint256 remainingAmount
);

event PenaltyApplied(
    string indexed streamId, 
    uint256 penaltyAmount
);
```

**State Tracking**:
- `penaltiesAccrued`: Cumulative penalties applied to stream
- `status`: Updated to CANCELLED after termination
- `claimedAmount`: Set to `totalAmount` (marking stream as fully processed)

### Security & Access Control

**Access Validation**:
- Only stream sender or recipient can terminate
- Cannot terminate COMPLETED or CANCELLED streams
- Cannot terminate streams with zero remaining balance

**Penalty Prevention**:
- Completed streams (100% claimed) cannot be terminated
- Penalty calculation returns 0 for completed streams
- No penalties applied to boost rewards

This penalty system provides **fair early exit mechanisms** while **protecting sender investments** through graduated penalties that encourage longer stream commitments.

---

## 4. Clear Workflow (User → Contract Sequence)

Primary user goal: Create and manage token streams that vest linearly (optionally with a cliff) while the locked principal auto‑earns a simulated yield.

Main flows (conceptual steps only):

1. Create Stream Draft (select token, recipient, total amount, duration, cliff?, enableBoost?)
2. Approve Token (if allowance insufficient)
3. Start Stream (deploy/register)
4. Monitor Stream (progress %, claimable amount, boost APR)
5. (Optional) Top Up / Extend / Pause / Resume
6. Recipient Claims (partial or full vested / claimable portion)
7. (Optional) Early Termination (by sender or recipient with time-based penalties)
8. Stream Closure (natural completion or early termination)

Recipient flow:

1. View Incoming Streams
2. Claim Available Tokens
3. Track Boost Rewards
4. Acknowledge Expired / Closed Streams

UI: Stepper always shows current position.

---

## 5. Minimal Data Structures

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
  yieldBoostBaseAPR?: number;
  volatilityScore?: number;
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
  boosted: boolean;
  boostAPR?: number;
  claimedAmount: number;
  totalBoostEarned?: number;
  claimedBoostAmount?: number;
  pausedAt?: number;
  status: StreamStatus;
  vestedAmount: number;
  claimableAmount: number;
  claimableBoostAmount?: number;
  progressPct: number; // 0–100
  timeRemainingSec: number;
  penaltiesAccrued?: number;
};

type TxRecord = {
  id: string;
  label: string;
  type:
    | "approve"
    | "createStream"
    | "claim"
    | "pause"
    | "resume"
    | "topUp"
    | "terminate";
  status: "idle" | "signing" | "pending" | "confirmed" | "failed";
  errorCode?: string;
  timestamps: Partial<Record<"submitted" | "confirmed" | "failed", number>>;
};
```

---

## 6. Core Status Tracking

Indicators:

- Global: TVL, Active Streams, Average APR, Oracle Freshness
- Per Stream: Progress %, Claimable, Realized vs Projected APR, Time Remaining
- Risk Flags: Oracle stale, Stream paused, Boost APR deviation, Low Sender Balance

Thresholds (examples):

- Progress <25% neutral, 25–75% info, >75% accent
- Oracle stale >60s warn, >300s danger
- APR drop >30% baseline warn

---

## 7. List Data Display

Lists:

- Outgoing Streams (sortable by amount, progress, APR, end date)
- Incoming Streams (sortable by claimable, sender, end date)
- Completed Streams
- Pending Actions (top-up needed, near cliff, termination candidates)
  Features: filtering (status, token), quick row actions (Claim, Pause, Resume, Top Up, Terminate).

---

## 8. Protocol-Specific Panels

- Stream Composer (form wizard)
- Boost Summary (APR explanation)
- Stream Detail Drawer (timeline view)
- Claim Console (batch claim)
- Adjustment Panel (extend, top-up, toggle boost)
- Termination Panel (penalty preview, termination confirmation)

---

## 9. Transaction State Transparency

States: idle → signing → pending → confirmed | failed
Multi-step (Create): Approve → Create Stream.
Activity feed: timeline with icons & status badges.
Failures show suggestion (e.g. increase allowance).

---

## 10. Error & Edge Case Handling

Error codes:

- ALLOWANCE_MISSING
- INSUFFICIENT_BALANCE
- ORACLE_STALE
- STREAM_ALREADY_PAUSED
- NOT_CLAIMABLE_YET
- APR_CALC_ERROR
- STREAM_NOT_ACTIVE_OR_PAUSED
- UNAUTHORIZED_TERMINATION
- NO_REMAINING_AMOUNT

Behaviors:

- Cliff gate: claim disabled pre-cliff
- Paused: progress freeze
- Early termination: penalty preview with graduated rates
- Oracle stale: hide APR projections
- Termination gate: only sender/recipient can terminate active/paused streams

---

## 11. Network Awareness

Supported Chains: 1 (Mainnet mock), 8453 (L2 mock)
Boost APR may differ per chain.
Mismatch prompt before creation if chain unsupported.

---

## 12. Data Freshness & Real-Time Updates

Intervals:

- Stream progress recalculation: 5s
- Prices/APR: 20s
  Staleness:
- progressStale >10s
- priceStale >60s
  UI: subtle pulse / grey overlay when stale.

---

## 13. Security / Trust Cues

Pre-action review modal: token, total, duration, APR band, cliff, penalties, gas (mock).
Termination review modal: penalty amount, net transfer, impact on boost rewards.
Warnings: Long duration, Boost active risk, Oracle stale, High penalty rate.
Simulation badge when using mock engine.

---

## 14. Composability / Reusability

Primitives:

- Stepper
- DataList
- StatusIndicator bar
- TransactionQueue panel
- ErrorBanner / InlineHint

Protocol logic stays separate from presentation.

---

## 15. User Context

New User: Onboarding panel + educational cards.
Existing User: Dashboard with totals & quick claims.
Power User: Batch actions (claim all, pause selected), alerts (near completion, underfunded).

---

## Supplemental Mock Dynamics

- Linear vesting: vested = total \* elapsed / duration (unless paused)
- Boost APR drift ±0.5% daily (sim)
- Oracle price jitter ±1% every 20s
- Random pause injection (flagged as simulated)

Latency (mock): Approve 1–2s, Create 3–4s, Claim 2–3s, Pause/Resume 1–2s
Failure injection: 5% revert, 2% APR calc error

---

## Key Derived Formulas

- vestedAmount = clamp(totalAmount \* (now - start) / (end - start), 0, totalAmount) if !paused
- claimable = vested - claimed (0 if now < cliff)
- progressPct = vested / total \* 100
- projectedBoostEarnings = (avgUnclaimedPrincipal _ APR _ remainingSec / yearSec)

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
      "averageAPR": 6.7,
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
      "boosted": true,
      "boostAPR": 7.2,
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
3. Status Tracking: Progress, claimable, APR indicators
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
