# Smart Contract Deployment Management

This directory contains deployment configurations, addresses, and artifacts for the StreamBoost protocol across different networks.

## Directory Structure

```
deployments/
├── README.md                    # This file
├── networks.json               # Network configurations
├── mainnet/                    # Mainnet deployments
│   ├── addresses.json          # Contract addresses
│   ├── deployment-log.json     # Deployment history
│   └── verification.json       # Verification status
├── sepolia/                    # Sepolia testnet
│   ├── addresses.json
│   ├── deployment-log.json
│   └── verification.json
├── local/                      # Local development
│   ├── addresses.json
│   └── deployment-log.json
└── contracts/                  # Contract metadata
    ├── StreamBoost.json        # ABI + metadata
    ├── MockERC20.json
    └── interfaces/
```

## Best Practices Implemented

1. **Network Separation**: Each network has its own directory
2. **Version Control**: All deployment files are tracked in git
3. **Automated Updates**: Scripts update addresses automatically
4. **Verification Tracking**: Status of contract verification
5. **Deployment History**: Complete audit trail of deployments
6. **Frontend Integration**: Easy import for dApps

## Usage

### For Developers
```typescript
import { getContractAddress } from './deployments/utils';
const streamBoostAddress = getContractAddress('StreamBoost', 'mainnet');
```

### For Scripts
```bash
# Get address in shell scripts
STREAMBOOST_ADDR=$(jq -r '.StreamBoost.address' deployments/mainnet/addresses.json)
```

### For Frontend
```javascript
import mainnetAddresses from './deployments/mainnet/addresses.json';
const { StreamBoost, MockUSDC } = mainnetAddresses;
```