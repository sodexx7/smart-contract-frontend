# StreamBoost Single-Protocol Mock Specification

This document captures the latest conversation output: a focused mock specification applying the core essences (workflow, data design, status tracking, lists, protocol-specific panels, transaction transparency, error handling, network awareness, data freshness, security cues, composability, user context) to a single streaming & vesting yield protocol.

---

## 1. Clear Workflow (User → Contract Sequence)

Primary user goal: Create and manage token streams that vest linearly (optionally with a cliff) while the locked principal auto‑earns a simulated yield.

Main flows (conceptual steps only):

1. Create Stream Draft (select token, recipient, total amount, duration, cliff?, enableBoost?)
2. Approve Token (if allowance insufficient)
3. Start Stream (deploy/register)
4. Monitor Stream (progress %, claimable amount, boost APR)
5. (Optional) Top Up / Extend / Pause / Resume
6. Recipient Claims (partial or full vested / claimable portion)
7. Stream Closure (completion or early termination with penalties)

Recipient flow:

1. View Incoming Streams
2. Claim Available Tokens
3. Track Boost Rewards
4. Acknowledge Expired / Closed Streams

UI: Stepper always shows current position.

---

## 2. Minimal Data Structures

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
  pausedAt?: number;
  status: StreamStatus;
  vestedAmount: number;
  claimableAmount: number;
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

## 3. Core Status Tracking

Indicators:

- Global: TVL, Active Streams, Average APR, Oracle Freshness
- Per Stream: Progress %, Claimable, Realized vs Projected APR, Time Remaining
- Risk Flags: Oracle stale, Stream paused, Boost APR deviation, Low Sender Balance

Thresholds (examples):

- Progress <25% neutral, 25–75% info, >75% accent
- Oracle stale >60s warn, >300s danger
- APR drop >30% baseline warn

---

## 4. List Data Display

Lists:

- Outgoing Streams (sortable by amount, progress, APR, end date)
- Incoming Streams (sortable by claimable, sender, end date)
- Completed Streams
- Pending Actions (top-up needed, near cliff)
  Features: filtering (status, token), quick row actions (Claim, Pause, Resume, Top Up).

---

## 5. Protocol-Specific Panels

- Stream Composer (form wizard)
- Boost Summary (APR explanation)
- Stream Detail Drawer (timeline view)
- Claim Console (batch claim)
- Adjustment Panel (extend, top-up, toggle boost)

---

## 6. Transaction State Transparency

States: idle → signing → pending → confirmed | failed
Multi-step (Create): Approve → Create Stream.
Activity feed: timeline with icons & status badges.
Failures show suggestion (e.g. increase allowance).

---

## 7. Error & Edge Case Handling

Error codes:

- ALLOWANCE_MISSING
- INSUFFICIENT_BALANCE
- ORACLE_STALE
- STREAM_ALREADY_PAUSED
- NOT_CLAIMABLE_YET
- APR_CALC_ERROR

Behaviors:

- Cliff gate: claim disabled pre-cliff
- Paused: progress freeze
- Early termination: penalty preview
- Oracle stale: hide APR projections

---

## 8. Network Awareness

Supported Chains: 1 (Mainnet mock), 8453 (L2 mock)
Boost APR may differ per chain.
Mismatch prompt before creation if chain unsupported.

---

## 9. Data Freshness & Real-Time Updates

Intervals:

- Stream progress recalculation: 5s
- Prices/APR: 20s
  Staleness:
- progressStale >10s
- priceStale >60s
  UI: subtle pulse / grey overlay when stale.

---

## 10. Security / Trust Cues

Pre-action review modal: token, total, duration, APR band, cliff, penalties, gas (mock).
Warnings: Long duration, Boost active risk, Oracle stale.
Simulation badge when using mock engine.

---

## 11. Composability / Reusability

Primitives:

- Stepper
- DataList
- StatusIndicator bar
- TransactionQueue panel
- ErrorBanner / InlineHint

Protocol logic stays separate from presentation.

---

## 12. User Context

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
