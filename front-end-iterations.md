1. Stream Detail Modal Fixes (Latest - c538e0c)

- UI Logic Improvements: Removed claim button from outgoing streams (senders can't claim their own tokens)
- Label Updates: Changed "Claimed" → "Claimed by recipient", "Claimable" → "Available to claim" for sender view
- Feature Removal: Removed 🚀 BOOST DETAILS section and Stream History button for cleaner UX
- New Feature: Added "View Sender" functionality linking to chain explorers (Etherscan, Sepolia, Basescan)
- Data Accuracy: Fixed stream data display using correct properties (progress, streamAmount, claimedAmount)

2. Dynamic Token Integration (19cd18a)

- Real-time Balances: Replaced hardcoded tokens with dynamic balance fetching from Sepolia contracts
- Smart Filtering: Only show tokens with ≥1000 unit minimum balance
- Wallet Integration: Connected wallet status to token selection dropdown
- UI Simplification: Removed yield boost functionality, restored cliff options, removed preview panel from step 1
- Contract Integration: Updated token addresses to match deployed contracts (USDC, WETH, USDT, BTC)

3. Owner Dashboard Enhancement (8acf315)

- Admin Functionality: Contract owner can view ALL platform streams
- Visual Distinctions:
  - Green border: Owner's streams
  - Purple border: Third-party streams
  - Special badges: "Your Stream", "Third Party", "Owner View"
- Enhanced Filtering: Improved stream visibility logic for owner vs regular users

4. Infrastructure & Security (012741c)

- Security: Replaced sensitive Alchemy API keys with public RPC endpoints
- Network Persistence: Added wallet network persistence across page refreshes
- Stream Direction: Fixed filtering based on connected wallet address
- UI Improvements: Enhanced timeline display with real dates in stream detail modal

5. Initial Dashboard Setup (9768c04)

- Core UI: Added StreamBoost dashboard with theme toggle
- Layout Optimization: Implemented responsive design patterns
