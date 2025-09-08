// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "src/StreamBoost.sol";
import "src/MockERC20.sol";

contract DeploySimpleScript {
    StreamBoost public streamBoost;
    MockERC20 public usdcToken;
    MockERC20 public ethToken;
    MockERC20 public btcToken;

    address public deployer;

    constructor() {
        deployer = msg.sender;

        // Deploy StreamBoost contract
        streamBoost = new StreamBoost();

        // Deploy mock tokens
        usdcToken = new MockERC20("Mock USDC", "mUSDC", 6);
        ethToken = new MockERC20("Mock ETH", "mETH", 18);
        btcToken = new MockERC20("Mock BTC", "mBTC", 8);

        // Set up mock asset data for different tokens
        streamBoost.setMockAssetData("USDC", 1e18, 6); // Stable
        streamBoost.setMockAssetData("ETH", 3000e18, 18); // Medium volatility
        streamBoost.setMockAssetData("BTC", 50000e18, 8); // High volatility

        // Initialize protocol stats
        streamBoost.setMockProtocolStats(0, 0, 600, 45);

        // Mint tokens to test users for demo purposes
        address user1 = address(0x123);
        address user2 = address(0x456);

        usdcToken.mint(user1, 1000000e6); // 1M USDC
        usdcToken.mint(user2, 1000000e6);

        ethToken.mint(user1, 100e18); // 100 ETH
        ethToken.mint(user2, 100e18);

        btcToken.mint(user1, 10e8); // 10 BTC
        btcToken.mint(user2, 10e8);
    }

    function getDeployedContracts()
        external
        view
        returns (
            address streamBoostAddr,
            address usdcAddr,
            address ethAddr,
            address btcAddr,
            address ownerAddr
        )
    {
        return (
            address(streamBoost),
            address(usdcToken),
            address(ethToken),
            address(btcToken),
            streamBoost.owner()
        );
    }
}
