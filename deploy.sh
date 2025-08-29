#!/bin/bash

echo "=== StreamBoost Deployment Script ==="

# Check if we're in the right directory
if [ ! -f "foundry.toml" ]; then
    echo "Error: Not in a Foundry project directory"
    exit 1
fi

# Clean and build
echo "Cleaning and building contracts..."
forge clean
forge build

if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
fi

echo "Build successful!"

# Run tests to ensure everything works
echo "Running tests..."
forge test

if [ $? -ne 0 ]; then
    echo "Error: Tests failed"
    exit 1
fi

echo "All tests passed!"

# Deploy to local anvil node
echo ""
echo "To deploy to local network:"
echo "1. Start anvil: anvil"
echo "2. Deploy with: forge create --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 src/StreamBoost.sol:StreamBoost"
echo ""
echo "To deploy MockERC20:"
echo "forge create --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 src/MockERC20.sol:MockERC20 --constructor-args \"Mock USDC\" \"mUSDC\" 6"
echo ""
echo "StreamBoost deployment ready!"

# Output contract addresses for reference
echo ""
echo "=== Contract Information ==="
echo "StreamBoost contract: src/StreamBoost.sol"
echo "MockERC20 contract: src/MockERC20.sol"
echo "Test file: test/StreamBoost.t.sol"
echo ""
echo "Available mock functions for owner:"
echo "- mockSetTimestamp(uint256): Set custom timestamp for testing"
echo "- mockResetTimestamp(): Reset to real block.timestamp"
echo "- setMockAssetData(): Set asset price and parameters"
echo "- setMockProtocolStats(): Set protocol statistics"
echo "- mockUpdateStreamBoostAPR(): Update stream boost APR"
echo "- mockSimulateStreamFailure(): Cancel a stream for testing"