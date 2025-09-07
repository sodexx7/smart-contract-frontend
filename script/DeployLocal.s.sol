// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "src/StreamBoost.sol";
import "src/MockERC20.sol";

contract DeployLocalScript is Test {
    StreamBoost public streamBoost;
    MockERC20 public usdcToken;
    MockERC20 public ethToken;
    MockERC20 public btcToken;

    address public constant DEPLOYER = address(0x1);
    address public constant USER1 = address(0x2);
    address public constant USER2 = address(0x3);

    function setUp() public {}

    function run() public {
        vm.startBroadcast(DEPLOYER);

        // Deploy StreamBoost contract
        streamBoost = new StreamBoost();
        console.log("StreamBoost deployed at:", address(streamBoost));

        // Deploy mock tokens
        usdcToken = new MockERC20("Mock USDC", "mUSDC", 6);
        ethToken = new MockERC20("Mock ETH", "mETH", 18);
        btcToken = new MockERC20("Mock BTC", "mBTC", 8);

        console.log("Mock USDC deployed at:", address(usdcToken));
        console.log("Mock ETH deployed at:", address(ethToken));
        console.log("Mock BTC deployed at:", address(btcToken));

        // Set up mock asset data for different tokens
        streamBoost.setMockAssetData("USDC", 1e18, 6, 400, 5); // Low volatility, stable
        streamBoost.setMockAssetData("ETH", 3000e18, 18, 600, 25); // Medium volatility
        streamBoost.setMockAssetData("BTC", 50000e18, 8, 800, 30); // High volatility

        // Initialize protocol stats
        streamBoost.setMockProtocolStats(0, 0, 600, 45);

        // Mint tokens to test users
        usdcToken.mint(USER1, 1000000e6); // 1M USDC
        usdcToken.mint(USER2, 1000000e6);

        ethToken.mint(USER1, 100e18); // 100 ETH
        ethToken.mint(USER2, 100e18);

        btcToken.mint(USER1, 10e8); // 10 BTC
        btcToken.mint(USER2, 10e8);

        console.log("Test tokens minted to users");
        console.log("User1 USDC balance:", usdcToken.balanceOf(USER1));
        console.log("User2 ETH balance:", ethToken.balanceOf(USER2));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("StreamBoost:", address(streamBoost));
        console.log("Mock USDC:", address(usdcToken));
        console.log("Mock ETH:", address(ethToken));
        console.log("Mock BTC:", address(btcToken));
        console.log("Owner:", streamBoost.owner());
    }
}
