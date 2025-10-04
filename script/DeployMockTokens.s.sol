// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";

contract DeployMockTokensScript is Script {
    // Token configurations
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
    }

    function getTokenConfig(
        uint256 index
    ) internal pure returns (TokenConfig memory) {
        if (index == 0) return TokenConfig("Mock USD Coin", "USDC", 6);
        if (index == 1) return TokenConfig("Mock Wrapped Ether", "WETH", 18);
        if (index == 2) return TokenConfig("Mock Tether USD", "USDT", 6);
        if (index == 3) return TokenConfig("Mock Bitcoin", "BTC", 8);
        revert("Invalid token index");
    }

    // Distribution amount: 1000 units for each token
    uint256 constant DISTRIBUTION_AMOUNT_USDC = 1000 * 10 ** 6; // 1000 USDC
    uint256 constant DISTRIBUTION_AMOUNT_WETH = 1000 * 10 ** 18; // 1000 WETH
    uint256 constant DISTRIBUTION_AMOUNT_USDT = 1000 * 10 ** 6; // 1000 USDT
    uint256 constant DISTRIBUTION_AMOUNT_BTC = 1000 * 10 ** 8; // 1000 BTC

    function getDistributionAmount(
        uint256 index
    ) internal pure returns (uint256) {
        if (index == 0) return DISTRIBUTION_AMOUNT_USDC;
        if (index == 1) return DISTRIBUTION_AMOUNT_WETH;
        if (index == 2) return DISTRIBUTION_AMOUNT_USDT;
        if (index == 3) return DISTRIBUTION_AMOUNT_BTC;
        revert("Invalid token index");
    }

    function run() external {
        // Load private keys from environment
        uint256 deployerPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        uint256 user1PrivateKey = vm.envUint("USER_PRIVATE_KEY");
        uint256 user2PrivateKey = vm.envUint("USER_PRIVATE_KEY_1");

        // Derive addresses from private keys
        address deployer = vm.addr(deployerPrivateKey);
        address user1 = vm.addr(user1PrivateKey);
        address user2 = vm.addr(user2PrivateKey);

        console.log("=== Deploying Mock Tokens ===");
        console.log("Deployer:", deployer);
        console.log("User 1 (USER_PRIVATE_KEY):", user1);
        console.log("User 2 (USER_PRIVATE_KEY_1):", user2);
        console.log("");

        // Start broadcasting with deployer's private key
        vm.startBroadcast(deployerPrivateKey);

        MockERC20[4] memory tokens;

        // Deploy all tokens
        for (uint i = 0; i < 4; i++) {
            TokenConfig memory config = getTokenConfig(i);
            console.log("Deploying", config.name, "...");
            tokens[i] = new MockERC20(
                config.name,
                config.symbol,
                config.decimals
            );
            console.log(config.symbol, "deployed at:", address(tokens[i]));
        }

        console.log("");
        console.log("=== Distributing Tokens ===");

        // Distribute tokens to both users
        for (uint i = 0; i < 4; i++) {
            TokenConfig memory config = getTokenConfig(i);
            uint256 amount = getDistributionAmount(i);
            console.log("Distributing", config.symbol, "...");

            // Mint to user1
            tokens[i].mint(user1, amount);
            console.log(
                "Minted",
                amount / 10 ** config.decimals,
                config.symbol,
                "to User 1"
            );

            // Mint to user2
            tokens[i].mint(user2, amount);
            console.log(
                "Minted",
                amount / 10 ** config.decimals,
                config.symbol,
                "to User 2"
            );
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary ===");
        for (uint i = 0; i < 4; i++) {
            TokenConfig memory config = getTokenConfig(i);
            console.log(config.symbol, ":", address(tokens[i]));
        }

        console.log("");
        console.log("=== Verification ===");
        for (uint i = 0; i < 4; i++) {
            TokenConfig memory config = getTokenConfig(i);
            uint256 user1Balance = tokens[i].balanceOf(user1);
            uint256 user2Balance = tokens[i].balanceOf(user2);

            console.log(config.symbol, "balances:");
            console.log("- User 1:", user1Balance / 10 ** config.decimals);
            console.log("- User 2:", user2Balance / 10 ** config.decimals);
        }

        console.log("");
        console.log(
            "=== Success! All mock tokens deployed and distributed ==="
        );
    }
}
