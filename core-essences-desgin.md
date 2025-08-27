## 🔑 Covering the Essences

### 1. **Clear Workflow**

Every protocol has a sequence of user → contract interactions.
Keep this simple: a **stepper UI** that shows progress.

**Example (mocked flow):**

```ts
const lendingFlow = [
  { step: "Approve USDC", action: async () => mockApprove("USDC") },
  { step: "Deposit", action: async () => mockDeposit("USDC", 100) },
  { step: "Check Health", action: async () => mockCheckHealth() },
];
```

The _essence_: **make the flow visible** to the user, regardless of protocol.

---

### 2. **Data Structure Design**

Your frontend display depends on structured data.
Design **minimal but universal shapes**:

```ts
type UserState = {
  address: string;
  balances: Record<string, number>;
  health?: number; // relevant only if lending
};

type AssetState = {
  symbol: string;
  price: number;
  utilization?: number; // relevant if lending/AMM
};

type ProtocolState = {
  name: string;
  type: string; // "lending" | "amm" | "bridge" | ...
  stats: Record<string, any>; // flexible
};
```

The _essence_: **data drives UI** — if you design flexible structures, you can show relevant pieces for any protocol.

---

### 3. **Core Status Tracking**

Almost every protocol needs to track **critical changing values**.

Examples:

- Lending → Health factor, borrow limits
- AMM → Pool ratios, slippage
- Bridge → Pending vs. completed transfer
- Yield → APR/APY, accrued rewards

**Frontend approach:**

- Always display **live-updating status indicators** (color-coded if possible).
- Trigger important actions when thresholds are crossed (e.g. liquidation warning).

---

### 4. **List Data Display**

Protocols often involve **lists**:

- Tokens in pools
- Users in a leaderboard
- Transactions or positions

**Essence:**

- Build reusable **list components** (with pagination or virtualization).
- Allow sorting/filtering by default.

Example: Token list for lending protocol:

```ts
[
  { symbol: "DAI", supply: 1_000_000, borrow: 500_000, utilization: 50 },
  { symbol: "ETH", supply: 200_000, borrow: 150_000, utilization: 75 },
];
```

---

### 5. **Protocol-Specific Features**

Finally, you leave space for **protocol-specific panels**:

- Lending → Borrow/Repay panel
- AMM → Swap UI
- Bridge → Source/Destination chain selector
- NFT Marketplace → Listing grid

The _essence_: **shared foundation, but pluggable specific UI**.

---

## 🔑 Additional Core Essences

### 6. **Transaction State Transparency**

- Every action in Web3 is asynchronous and uncertain.
- Users need clear visibility: _pending → confirmed → failed_.
- Without this, UX collapses because users don’t know if something happened.
- Essence: **Transaction Manager** (queue, progress, retries).

---

### 7. **Error & Edge Case Handling**

- Protocols fail often: low balance, slippage too high, allowance missing, chain mismatch.
- Showing **friendly errors** and possible fixes is essential.
- Example: “You must approve DAI before depositing” → one-click fix.

---

### 8. **Network Awareness**

- Protocols may be multi-chain.
- The frontend must always show:

  - Current network
  - Whether it matches the protocol’s network
  - A way to switch.

- Even in a mock template, simulating multi-chain flow is valuable.

---

### 9. **Data Freshness & Real-Time Updates**

- Blockchain data changes rapidly.
- If a user’s balance/health factor isn’t up to date, they could act wrongly.
- Essence: Polling or WebSocket updates → show when last refreshed.

---

### 10. **Security / Trust Cues**

- Especially for DeFi, the UI itself must inspire trust.
- Clear confirmation modals, gas estimate previews, warnings before risky actions.
- Even in a hackathon prototype, these cues are part of the “essence” of a good protocol UX.

---

### 11. **Composability / Reusability**

- Many hackathon projects build _on top of others_.
- Designing components so they can be reused across protocols (e.g. asset list, transaction queue, status widget) ensures your frontend template isn’t a one-off.

---

### 12. **User Context**

- A protocol’s UX depends on the user’s state:

  - New user → onboarding, tutorial, connect wallet flow
  - Existing user → positions, history, quick actions

- Essence: **Personalized state** (e.g. show “Get Started” if empty, else dashboard).
