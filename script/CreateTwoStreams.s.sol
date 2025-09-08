// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/StreamBoost.sol";
import "../src/MockERC20.sol";

contract CreateTwoStreamsScript is Script {
    // Deployed contract addresses on Goerli
    address constant STREAM_BOOST = 0xcc2149eeca0B6Bb7228E7A651987ebB064276463;
    address constant MOCK_USDC = 0x2246008845d7385a7C5c9dacea09A36823FbcB88;

    // Stream configuration
    uint256 constant STREAM_AMOUNT = 1000 * 10 ** 6; // 1000 USDC (6 decimals)
    uint256 constant STREAM_DURATION = 30 days;
    uint256 constant CLIFF_DURATION = 7 days;

    function run() external {
        // Load private keys from environment
        uint256 senderPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        uint256 recipientPrivateKey = vm.envUint("USER_PRIVATE_KEY_1");

        // Derive addresses from private keys
        address sender = vm.addr(senderPrivateKey);
        address recipient = vm.addr(recipientPrivateKey);

        console.log("=== Creating Two Streams on Goerli Testnet ===");
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
        uint256 totalNeeded = STREAM_AMOUNT * 2; // For both streams

        if (senderBalance < totalNeeded) {
            console.log("Minting USDC for sender...");
            usdc.mint(sender, totalNeeded);
            console.log("Minted", totalNeeded / 10 ** 6, "USDC to sender");
        }

        // Approve StreamBoost to spend USDC
        console.log("Approving USDC spending...");
        usdc.approve(STREAM_BOOST, totalNeeded);

        // Create Stream 1: WITHOUT cliff
        console.log("Creating Stream 1 (No Cliff)...");
        string memory streamId1 = "stream-no-cliff-001";
        streamBoost.createStream(
            streamId1,
            recipient,
            MOCK_USDC,
            STREAM_AMOUNT,
            STREAM_DURATION,
            0 // No cliff
        );
        console.log("Stream 1 created:", streamId1);
        console.log("- Amount:", STREAM_AMOUNT / 10 ** 6, "USDC");
        console.log("- Duration:", STREAM_DURATION / 1 days, "days");
        console.log("- Cliff: None");
        console.log("");

        // Create Stream 2: WITH cliff
        console.log("Creating Stream 2 (With Cliff)...");
        string memory streamId2 = "stream-with-cliff-001";
        streamBoost.createStream(
            streamId2,
            recipient,
            MOCK_USDC,
            STREAM_AMOUNT,
            STREAM_DURATION,
            CLIFF_DURATION
        );
        console.log("Stream 2 created:", streamId2);
        console.log("- Amount:", STREAM_AMOUNT / 10 ** 6, "USDC");
        console.log("- Duration:", STREAM_DURATION / 1 days, "days");
        console.log("- Cliff:", CLIFF_DURATION / 1 days, "days");
        console.log("");

        vm.stopBroadcast();

        // Verify streams were created
        console.log("=== Verification ===");

        // Get stream details
        StreamBoost.Stream memory stream1 = streamBoost.getStream(streamId1);
        StreamBoost.Stream memory stream2 = streamBoost.getStream(streamId2);

        console.log("Stream 1 verification:");
        console.log("- ID:", stream1.id);
        console.log("- Sender:", stream1.sender);
        console.log("- Recipient:", stream1.recipient);
        console.log(
            "- Total Amount:",
            stream1.financials.totalAmount / 10 ** 6,
            "USDC"
        );
        console.log("- Cliff Time:", stream1.timing.cliffTime);
        console.log("");

        console.log("Stream 2 verification:");
        console.log("- ID:", stream2.id);
        console.log("- Sender:", stream2.sender);
        console.log("- Recipient:", stream2.recipient);
        console.log(
            "- Total Amount:",
            stream2.financials.totalAmount / 10 ** 6,
            "USDC"
        );
        console.log("- Cliff Time:", stream2.timing.cliffTime);
        console.log("");

        // Check cliff functionality
        bool canClaim1DuringCliff = streamBoost.canClaimDuringCliff(streamId1);
        bool canClaim2DuringCliff = streamBoost.canClaimDuringCliff(streamId2);

        console.log("Cliff Analysis:");
        console.log(
            "- Stream 1 (no cliff) can claim immediately:",
            canClaim1DuringCliff
        );
        console.log(
            "- Stream 2 (with cliff) can claim immediately:",
            canClaim2DuringCliff
        );
        console.log("");

        // Display recipient information
        console.log("=== Recipient Information ===");
        string[] memory incomingStreams = streamBoost.getUserIncomingStreams(
            recipient
        );
        console.log(
            "Recipient has",
            incomingStreams.length,
            "incoming streams"
        );

        for (uint i = 0; i < incomingStreams.length; i++) {
            uint256 claimableAmount = streamBoost.getClaimableAmount(
                incomingStreams[i]
            );
            uint256 vestedAmount = streamBoost.getVestedAmount(
                incomingStreams[i]
            );
            console.log("- Stream", i + 1, "ID:", incomingStreams[i]);
            console.log("  Claimable:", claimableAmount / 10 ** 6, "USDC");
            console.log("  Vested:", vestedAmount / 10 ** 6, "USDC");
        }

        console.log("");
        console.log("=== Success! Two streams created successfully ===");
        console.log("Stream IDs:");
        console.log("1.", streamId1, "(no cliff)");
        console.log("2.", streamId2, "(7-day cliff)");
        console.log("");
        console.log("Next steps for recipient:");
        console.log("- Wait for cliff period to end for stream 2");
        console.log("- Use claimStream() function to claim vested tokens");
        console.log("- Monitor progress with getClaimableAmount()");
    }
}
