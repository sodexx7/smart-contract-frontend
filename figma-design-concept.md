# StreamBoost Figma Design Concept

## Layout Structure (Desktop: 1440x900)

### Header Bar (Fixed, 72px height)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌊 StreamBoost    [Network: Mainnet ▼]    [0x1234...5678] [Connect Wallet] │
│                   TVL: $125K  Streams: 48  Avg APR: 6.7%                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Main Dashboard (3-Column Layout)

#### Left Sidebar (320px)

```
┌─────────────────────────────┐
│ CREATE STREAM               │
│ ┌─────────────────────────┐ │
│ │ + New Stream            │ │
│ └─────────────────────────┘ │
│                             │
│ MY STREAMS                  │
│ ┌─────────────────────────┐ │
│ │ 📤 Outgoing (3)         │ │
│ │ 📥 Incoming (2)         │ │
│ │ ✅ Completed (12)       │ │
│ │ ⚠️  Pending Actions (1)  │ │
│ └─────────────────────────┘ │
│                             │
│ RECIPIENT SUMMARY           │
│ ┌─────────────────────────┐ │
│ │ Total Received: 28.5K   │ │
│ │ Claimable Now: 4.7K     │ │
│ │ Active Senders: 2       │ │
│ │ Boost Rewards: +892     │ │
│ └─────────────────────────┘ │
│                             │
│ PROTOCOL STATS              │
│ ┌─────────────────────────┐ │
│ │ TVL: $125,000.42        │ │
│ │ Active: 48 streams      │ │
│ │ Avg APR: 6.7%          │ │
│ │ Avg Duration: 92d       │ │
│ │ Last Update: 2s ago     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### Center Panel (720px)

**Outgoing Streams View:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📤 OUTGOING STREAMS (3)                     [Sort: Progress ▼] [Filter] │
├──────────────────────────────────────────────────────────────────────┤
│ Stream ID     │ Recipient  │ Amount   │ Progress  │ Status  │ Actions │
├──────────────────────────────────────────────────────────────────────┤
│ strm_01       │ 0xRec...Z  │ 10K USDC │ ████░░ 25%│ ACTIVE  │ [⏸][📈]│
│ 🚀 Boosted 7.2%│ 92d left  │ 1.8K clmd│          │         │         │
├──────────────────────────────────────────────────────────────────────┤
│ strm_02       │ 0xRec...Y  │ 5K DAI   │ ██████ 67%│ ACTIVE  │ [⏸][📈]│
│ 📊 Base rate   │ 34d left  │ 3.4K clmd│          │         │         │
├──────────────────────────────────────────────────────────────────────┤
│ strm_03       │ 0xRec...X  │ 2K USDT  │ ██████ 100│ PAUSED  │ [▶️][❌]│
│ ⚠️ Paused 3d   │ Cliff hit │ 0 clmd   │          │         │         │
└──────────────────────────────────────────────────────────────────────┘
```

**Incoming Streams View (Recipient Perspective):**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 📥 INCOMING STREAMS (2)                     [Sort: Progress ▼] [Filter] │
├──────────────────────────────────────────────────────────────────────┤
│ Stream ID     │ From       │ Amount   │ Progress  │ Status  │ Actions │
├──────────────────────────────────────────────────────────────────────┤
│ strm_05       │ 0xSnd...A  │ 5K USDC  │ ██████ 80%│ ACTIVE  │ [💰][📊]│
│ 🚀 Boosted 6.8%│ 6d left   │ 4K clmd  │          │         │         │
├──────────────────────────────────────────────────────────────────────┤
│ strm_06       │ 0xSnd...B  │ 8K DAI   │ ████░░ 45%│ ACTIVE  │ [💰][📊]│
│ 📊 Base rate   │ 44d left  │ 3.6K clmd│          │         │         │
└──────────────────────────────────────────────────────────────────────┘
```

**Stream Creation Wizard (Modal 600x500):**

**Step 1 of 3: Stream Details**
```
┌────────────────────────────────────────────────────────────────┐
│ CREATE NEW STREAM                                          [✕] │
├────────────────────────────────────────────────────────────────┤
│ Step 1 of 3: Stream Details                                    │
│ ● ○ ○                                                          │
│                                                                │
│ Token           [USDC        ▼] Balance: 25,000.00            │
│ Recipient       [0x1234567890abcdef...]                        │
│ Amount          [10,000      ] USDC                           │
│ Duration        [30          ] days                           │
│ Cliff           [□ Enable cliff [7] days]                     │
│ Boost           [☑ Enable yield boost (+7.2% APR)]           │
│                                                                │
│ PREVIEW                                                        │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Daily unlock: ~333.33 USDC                                │ │
│ │ Boost earnings: ~197.26 USDC (over 30d)                   │ │
│ │ Gas estimate: ~$4.50                                      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│                              [Cancel]  [Continue →]          │
└────────────────────────────────────────────────────────────────┘
```

**Step 2 of 3: Schedule & Security**
```
┌────────────────────────────────────────────────────────────────┐
│ CREATE NEW STREAM                                          [✕] │
├────────────────────────────────────────────────────────────────┤
│ Step 2 of 3: Schedule & Security                               │
│ ● ● ○                                                          │
│                                                                │
│ START DATE                                                     │
│ ┌ Now                    ┐  ┌ Custom Date/Time             ┐ │
│ │ ● Immediately          │  │ ○ [Dec 15, 2024] [14:30]    │ │
│ │   Start streaming now  │  │   Schedule for later         │ │
│ └────────────────────────┘  └──────────────────────────────┘ │
│                                                                │
│ UNLOCK SCHEDULE                                                │
│ ○ Linear     ● Stepped    ○ Custom Curve                      │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Steps: [7] days    Unlock: [1,428.57] USDC per step       │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │ │
│ │ Start   Day 7   Day 14  Day 21  Day 28   End              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ SECURITY & PERMISSIONS                                         │
│ ☑ Allow recipient to claim early (with penalty)              │
│ ☑ Allow sender to pause/resume stream                        │
│ ☑ Allow sender to top-up stream amount                       │
│ □ Allow third-party withdrawals (whitelist required)         │
│                                                                │
│                          [← Back]  [Continue →]              │
└────────────────────────────────────────────────────────────────┘
```

**Step 3 of 3: Review & Deploy**
```
┌────────────────────────────────────────────────────────────────┐
│ CREATE NEW STREAM                                          [✕] │
├────────────────────────────────────────────────────────────────┤
│ Step 3 of 3: Review & Deploy                                  │
│ ● ● ●                                                          │
│                                                                │
│ STREAM SUMMARY                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Token: USDC               Amount: 10,000.00                │ │
│ │ Recipient: 0x1234...cdef  Duration: 30 days               │ │
│ │ Unlock: Every 7 days      Cliff: None                     │ │
│ │ Boost: Enabled (+7.2%)    Start: Immediately              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ TRANSACTION BREAKDOWN                                          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Stream Amount:         10,000.00 USDC                     │ │
│ │ Boost Deposit:            500.00 USDC                     │ │
│ │ Network Fee:                4.50 USD                      │ │
│ │ ─────────────────────────────────────                     │ │
│ │ Total Required:        10,504.50 USDC                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ WALLET ACTIONS                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 1. Approve USDC spend     [Sign Transaction]              │ │
│ │ 2. Create stream          [Deploy Stream]                 │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│                          [← Back]  [Create Stream]           │
└────────────────────────────────────────────────────────────────┘
```

#### Right Panel (320px)

**Stream Detail Panel (Sender Perspective):**

```
┌─────────────────────────────┐
│ STREAM DETAIL               │
│ strm_01                     │
├─────────────────────────────┤
│ Progress Timeline           │
│ ┌─────────────────────────┐ │
│ │ Start    Cliff    End   │ │
│ │ │        │         │    │ │
│ │ ●────────●─────────○    │ │
│ │ Nov 1    Nov 8    Jan 1 │ │
│ └─────────────────────────┘ │
│                             │
│ Status: ACTIVE 🟢           │
│ Progress: 25% (2,500 USDC)  │
│ Claimed: 1,800 USDC         │
│ Claimable: 700 USDC         │
│                             │
│ 🚀 BOOST DETAILS            │
│ Current APR: 7.2%           │
│ Projected earnings: 197 USDC│
│ Risk level: Low             │
│                             │
│ ┌─────────────────────────┐ │
│ │ [Claim 700 USDC]       │ │
│ │ [Pause Stream]         │ │
│ │ [Top Up]               │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Stream Detail Panel (Recipient Perspective):**

```
┌─────────────────────────────┐
│ STREAM DETAIL               │
│ strm_05                     │
├─────────────────────────────┤
│ Progress Timeline           │
│ ┌─────────────────────────┐ │
│ │ Start    Cliff    End   │ │
│ │ │        │         │    │ │
│ │ ●────────────────●──○   │ │
│ │ Nov 1          Dec 25   │ │
│ └─────────────────────────┘ │
│                             │
│ Status: ACTIVE 🟢           │
│ Progress: 80% (4,000 USDC)  │
│ Available: 4,000 USDC       │
│ Remaining: 1,000 USDC       │
│                             │
│ 💰 EARNINGS DETAILS         │
│ Base stream: 5,000 USDC     │
│ Boost earnings: +340 USDC   │
│ Total earned: 4,340 USDC    │
│                             │
│ ┌─────────────────────────┐ │
│ │ [Claim 4,000 USDC]     │ │
│ │ [View Sender]          │ │
│ │ [Stream History]       │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Component Library

### Status Indicators

- **Progress Bar**: Linear with gradient fill, percentage label
- **Status Badge**: Rounded pill with color coding
  - ACTIVE: Green (#10B981)
  - PAUSED: Orange (#F59E0B)
  - COMPLETED: Blue (#3B82F6)
  - CANCELLED: Red (#EF4444)

### Data Cards

```
┌─────────────────────────────┐
│ Icon  Primary Metric        │
│       Secondary Info        │
│       [Action Button]       │
└─────────────────────────────┘
```

### Transaction States

- **Idle**: Default button state
- **Signing**: Spinner with "Sign in wallet..."
- **Pending**: Progress indicator with tx hash
- **Confirmed**: Green checkmark with success message
- **Failed**: Red X with error code and retry option

## Color Palette

- Primary: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Warning: #F59E0B (Orange)
- Error: #EF4444 (Red)
- Background: #F9FAFB
- Surface: #FFFFFF
- Text Primary: #111827
- Text Secondary: #6B7280

## Typography

- Headers: Inter Bold 24px/20px
- Subheaders: Inter Semibold 16px
- Body: Inter Regular 14px
- Caption: Inter Regular 12px
- Monospace (addresses/amounts): JetBrains Mono 12px

## Interactions

- **Hover states**: Subtle shadow elevation
- **Loading states**: Skeleton screens for data loading
- **Error states**: Inline validation with helpful messages
- **Success states**: Toast notifications for completed actions

This design concept focuses on clarity, progressive disclosure, and real-time data visibility while maintaining the core streaming protocol workflow.
