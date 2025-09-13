// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/StreamBoost.sol";
import "../src/MockERC20.sol";

contract CreateEndedStreamScript is Script {
    // Deployed contract addresses on Goerli
    address constant STREAM_BOOST = 0xcc2149eeca0B6Bb7228E7A651987ebB064276463;
    address constant MOCK_USDC = 0x2246008845d7385a7C5c9dacea09A36823FbcB88;

    // Stream configuration
    uint256 constant STREAM_AMOUNT = 1000 * 10 ** 6; // 1000 USDC (6 decimals)
    uint256 constant STREAM_DURATION = 7 days; // Short duration to easily demonstrate ending
    uint256 constant CLIFF_DURATION = 1 days; // 1 day cliff

    function run() external {
        // Load private keys from environment
        uint256 senderPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        uint256 recipientPrivateKey = vm.envUint("USER_PRIVATE_KEY_1");

        // Derive addresses from private keys
        address sender = vm.addr(senderPrivateKey);
        address recipient = vm.addr(recipientPrivateKey);

        console.log("=== Creating and Ending a Stream ===");
        console.log("Sender:", sender);
        console.log("Recipient:", recipient);
        console.log("StreamBoost:", STREAM_BOOST);
        console.log("MockUSDC:", MOCK_USDC);
        console.log("");

        // Initialize contracts
        StreamBoost streamBoost = StreamBoost(STREAM_BOOST);
        MockERC20 usdc = MockERC20(MOCK_USDC);

        // Start broadcasting with sender's private key
        vm.startBroadcast(senderPrivateKey);

        // Check and mint USDC if sender doesn't have enough
        uint256 senderBalance = usdc.balanceOf(sender);

        if (senderBalance < STREAM_AMOUNT) {
            console.log("Minting USDC for sender...");
            usdc.mint(sender, STREAM_AMOUNT);
            console.log("Minted", STREAM_AMOUNT / 10 ** 6, "USDC to sender");
        }

        // Approve StreamBoost to spend USDC
        console.log("Approving USDC spending...");
        usdc.approve(STREAM_BOOST, STREAM_AMOUNT);

        // Create the stream
        console.log("Creating stream...");
        string memory streamId = "ended-stream-001";
        streamBoost.createStream(
            streamId,
            recipient,
            MOCK_USDC,
            STREAM_AMOUNT,
            STREAM_DURATION,
            CLIFF_DURATION
        );
        console.log("Stream created:", streamId);
        console.log("- Amount:", STREAM_AMOUNT / 10 ** 6, "USDC");
        console.log("- Duration:", STREAM_DURATION / 1 days, "days");
        console.log("- Cliff:", CLIFF_DURATION / 1 days, "days");
        console.log("");

        // Get stream details to show initial state
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        console.log("=== Stream Details (Active) ===");
        console.log("- End Time:", stream.timing.endTime);
        console.log("- Status:", stream.status == StreamBoost.StreamStatus.ACTIVE ? "Active" : "Not Active");
        console.log("");

        // Now use mock timestamp to simulate time passing beyond the stream end
        streamBoost.mockSetTimestamp(stream.timing.endTime + 1 days);
        console.log("=== Simulating Time Passage ===");
        console.log("Mock timestamp set to 1 day after stream end");
        console.log("");

        // Now check the stream status after time has passed
        console.log("=== Stream Details (After Time Passage) ===");
        console.log("- Claimable amount:", streamBoost.getClaimableAmount(streamId) / 10 ** 6, "USDC");
        console.log("- Vested amount:", streamBoost.getVestedAmount(streamId) / 10 ** 6, "USDC");
        console.log("- Expected total:", STREAM_AMOUNT / 10 ** 6, "USDC");
        console.log("");

        vm.stopBroadcast();

        // Reset timestamp and show difference
        vm.startBroadcast(senderPrivateKey);
        streamBoost.mockResetTimestamp();
        console.log("=== Reset to Real Time ===");
        console.log("- Claimable at real time:", streamBoost.getClaimableAmount(streamId) / 10 ** 6, "USDC");
        vm.stopBroadcast();

        console.log("=== Success! ===");
        console.log("Created stream:", streamId);
        console.log("Demonstrated stream ending using mockSetTimestamp()");
        console.log("Stream can now be fully claimed by the recipient");
        console.log("");
        console.log("Key functions used:");
        console.log("- createStream() to create the stream");
        console.log("- mockSetTimestamp() to simulate time passage");
        console.log("- getClaimableAmount() to check available tokens");
        console.log("- getVestedAmount() to check vested tokens");
        console.log("- mockResetTimestamp() to return to real time");
    }
}