// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "src/StreamBoost.sol";
import "src/MockERC20.sol";

contract DeployScript is Script {
    StreamBoost public streamBoost;
    MockERC20 public mockToken;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy StreamBoost contract
        streamBoost = new StreamBoost();
        console.log("StreamBoost deployed at:", address(streamBoost));

        // Deploy MockERC20 for testing
        mockToken = new MockERC20("Mock USDC", "mUSDC", 6);
        console.log("MockERC20 deployed at:", address(mockToken));

        // Set up some initial mock data
        // Configure mock data for USDC asset: symbol, price in wei (1e18 = $1), decimals, supply rate, borrow rate
        streamBoost.setMockAssetData("USDC", 1e18, 6);
        // Set initial protocol statistics: total supplied, total borrowed, total value locked, total reserves
        streamBoost.setMockProtocolStats(0, 0, 500, 30);

        console.log("Initial mock data configured");

        vm.stopBroadcast();

        console.log("Deployment completed!");
        console.log("StreamBoost owner:", streamBoost.owner());
    }
}
