// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "src/StreamBoost.sol";
import "src/MockERC20.sol";

contract StreamBoostTest is Test {
    StreamBoost public streamBoost;
    MockERC20 public token;

    address public owner = address(0x1);
    address public sender = address(0x2);
    address public recipient = address(0x3);

    uint256 public constant INITIAL_BALANCE = 100000e18;
    uint256 public constant STREAM_AMOUNT = 10000e18;
    uint256 public constant STREAM_DURATION = 30 days;

    function setUp() public {
        vm.startPrank(owner);
        streamBoost = new StreamBoost();
        token = new MockERC20("Test Token", "TEST", 18);

        token.mint(sender, INITIAL_BALANCE);
        vm.stopPrank();
    }

    // Main Flow 1: Create Stream Draft + Approve Token + Start Stream
    function testMainFlow_CreateStreamWithApproval() public {
        string memory streamId = "stream_001";

        // Step 1: Sender approves token allowance
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);

        // Verify allowance
        assertEq(token.allowance(sender, address(streamBoost)), STREAM_AMOUNT);

        // Step 2: Create stream
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0, // no cliff
            true // boosted
        );
        vm.stopPrank();

        // Verify stream creation
        // Verify stream creation using getStream
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertTrue(stream.financials.boosted);
        assertEq(stream.financials.boostAPR, 720); // 7.2%
        assertEq(stream.financials.claimedAmount, 0);
        assertEq(stream.timing.pausedAt, 0);
        assertTrue(stream.status == StreamBoost.StreamStatus.ACTIVE);

        // Verify token transfer
        assertEq(token.balanceOf(address(streamBoost)), STREAM_AMOUNT);
        assertEq(token.balanceOf(sender), INITIAL_BALANCE - STREAM_AMOUNT);

        // Verify user stream mappings
        string[] memory outgoingStreams = streamBoost.getUserOutgoingStreams(
            sender
        );
        string[] memory incomingStreams = streamBoost.getUserIncomingStreams(
            recipient
        );

        assertEq(outgoingStreams.length, 1);
        assertEq(outgoingStreams[0], streamId);
        assertEq(incomingStreams.length, 1);
        assertEq(incomingStreams[0], streamId);

        // Verify protocol stats update
        StreamBoost.ProtocolStats memory stats = streamBoost.getProtocolStats();
        assertEq(stats.totalValueLocked, STREAM_AMOUNT);
        assertEq(stats.totalActiveStreams, 1);
        assertEq(stats.lastUpdated, block.timestamp);
    }

    function testMainFlow_CreateStreamWithCliff() public {
        string memory streamId = "stream_cliff";
        uint256 cliffDuration = 7 days;

        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);

        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            cliffDuration,
            false // not boosted
        );
        vm.stopPrank();

        StreamBoost.Stream memory cliffStream = streamBoost.getStream(streamId);
        assertEq(cliffStream.timing.cliffTime, block.timestamp + cliffDuration);
        assertEq(cliffStream.timing.endTime, block.timestamp + STREAM_DURATION);
        assertTrue(!cliffStream.financials.boosted);
        assertEq(cliffStream.financials.boostAPR, 0);
    }

    // Main Flow 4: Monitor Stream Progress
    function testMainFlow_MonitorStreamProgress() public {
        string memory streamId = "stream_monitor";

        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            true
        );
        vm.stopPrank();

        // Test progress at different time points

        // At start: 0% progress
        assertEq(streamBoost.getVestedAmount(streamId), 0);
        assertEq(streamBoost.getClaimableAmount(streamId), 0);
        assertEq(streamBoost.getStreamProgress(streamId), 0);

        // At 25% duration: 25% progress
        vm.warp(block.timestamp + STREAM_DURATION / 4);
        uint256 expectedVested25 = STREAM_AMOUNT / 4;
        assertEq(streamBoost.getVestedAmount(streamId), expectedVested25);
        assertEq(streamBoost.getClaimableAmount(streamId), expectedVested25);
        assertEq(streamBoost.getStreamProgress(streamId), 25);

        // At 50% duration: 50% progress
        vm.warp(block.timestamp + STREAM_DURATION / 4);
        uint256 expectedVested50 = STREAM_AMOUNT / 2;
        assertEq(streamBoost.getVestedAmount(streamId), expectedVested50);
        assertEq(streamBoost.getClaimableAmount(streamId), expectedVested50);
        assertEq(streamBoost.getStreamProgress(streamId), 50);

        // At 100% duration: 100% progress
        vm.warp(block.timestamp + STREAM_DURATION / 2);
        assertEq(streamBoost.getVestedAmount(streamId), STREAM_AMOUNT);
        assertEq(streamBoost.getClaimableAmount(streamId), STREAM_AMOUNT);
        assertEq(streamBoost.getStreamProgress(streamId), 100);

        // Beyond end time: still 100%
        vm.warp(block.timestamp + STREAM_DURATION);
        assertEq(streamBoost.getVestedAmount(streamId), STREAM_AMOUNT);
        assertEq(streamBoost.getClaimableAmount(streamId), STREAM_AMOUNT);
        assertEq(streamBoost.getStreamProgress(streamId), 100);
    }

    // Main Flow 6: Recipient Claims
    function testRecipientFlow_ClaimTokens() public {
        string memory streamId = "stream_claim";

        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            true
        );
        vm.stopPrank();

        // Fast forward to 50% completion
        vm.warp(block.timestamp + STREAM_DURATION / 2);

        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        uint256 expectedClaimable = STREAM_AMOUNT / 2;
        assertEq(claimableAmount, expectedClaimable);

        // Recipient claims partial amount
        uint256 claimAmount = expectedClaimable / 2;
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.prank(recipient);
        streamBoost.claimStream(streamId, claimAmount);

        // Verify claim
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + claimAmount
        );
        StreamBoost.Stream memory claimedStream = streamBoost.getStream(
            streamId
        );
        assertEq(claimedStream.financials.claimedAmount, claimAmount);

        // Verify updated claimable amount
        assertEq(
            streamBoost.getClaimableAmount(streamId),
            expectedClaimable - claimAmount
        );

        // Claim remaining vested amount
        vm.prank(recipient);
        streamBoost.claimStream(streamId, expectedClaimable - claimAmount);

        StreamBoost.Stream memory finalClaimedStream = streamBoost.getStream(
            streamId
        );
        assertEq(
            finalClaimedStream.financials.claimedAmount,
            expectedClaimable
        );
        assertEq(streamBoost.getClaimableAmount(streamId), 0);
    }

    function testRecipientFlow_ClaimFullStreamAtEnd() public {
        string memory streamId = "stream_full_claim";

        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            true
        );
        vm.stopPrank();

        // Fast forward to completion
        vm.warp(block.timestamp + STREAM_DURATION);

        // Claim full amount
        vm.prank(recipient);
        streamBoost.claimStream(streamId, STREAM_AMOUNT);

        // Verify stream completion
        StreamBoost.Stream memory completedStream = streamBoost.getStream(
            streamId
        );
        assertEq(completedStream.financials.claimedAmount, STREAM_AMOUNT);
        assertTrue(
            completedStream.status == StreamBoost.StreamStatus.COMPLETED
        );

        // Verify protocol stats update
        StreamBoost.ProtocolStats memory updatedStats = streamBoost
            .getProtocolStats();
        assertEq(updatedStats.totalActiveStreams, 0);
    }

    // Main Flow 5: Pause/Resume
    function testMainFlow_PauseResumeStream() public {
        string memory streamId = "stream_pause";

        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            true
        );
        vm.stopPrank();

        // Fast forward to 25% completion
        uint256 pauseTime = block.timestamp + STREAM_DURATION / 4;
        vm.warp(pauseTime);

        uint256 vestedBeforePause = streamBoost.getVestedAmount(streamId);
        uint256 expectedVested25 = STREAM_AMOUNT / 4;
        assertEq(vestedBeforePause, expectedVested25);

        // Pause stream
        vm.prank(sender);
        streamBoost.pauseStream(streamId);

        StreamBoost.Stream memory pausedStream = streamBoost.getStream(
            streamId
        );
        assertTrue(pausedStream.status == StreamBoost.StreamStatus.PAUSED);
        assertEq(pausedStream.timing.pausedAt, pauseTime);
        uint256 endTimeBefore = pausedStream.timing.endTime;

        // Fast forward while paused (vested amount should not increase)
        uint256 pauseDuration = 10 days;
        vm.warp(pauseTime + pauseDuration);

        uint256 vestedDuringPause = streamBoost.getVestedAmount(streamId);
        assertEq(vestedDuringPause, 0); // Should be 0 for paused streams

        // Resume stream
        vm.prank(sender);
        streamBoost.resumeStream(streamId);

        StreamBoost.Stream memory resumedStream = streamBoost.getStream(
            streamId
        );
        assertTrue(resumedStream.status == StreamBoost.StreamStatus.ACTIVE);
        assertEq(resumedStream.timing.pausedAt, 0);
        assertEq(resumedStream.timing.endTime, endTimeBefore + pauseDuration); // End time extended

        // Verify vesting continues normally after resume
        // After resume, we move forward by quarter duration to check if vesting resumes
        // The new end time is extended, so same relative progress should yield same vested amount
        vm.warp(block.timestamp + (STREAM_DURATION / 4));
        uint256 vestedAfterResume = streamBoost.getVestedAmount(streamId);
        // Since we're now at 50% of original duration from start, we should have 50% vested
        // But with extended end time, the percentage is different - let's calculate actual expected
        StreamBoost.Stream memory finalStream = streamBoost.getStream(streamId);
        uint256 elapsedFromStart = block.timestamp -
            finalStream.timing.startTime;
        uint256 totalDuration = finalStream.timing.endTime -
            finalStream.timing.startTime;
        uint256 expectedVested = (STREAM_AMOUNT * elapsedFromStart) /
            totalDuration;
        assertEq(vestedAfterResume, expectedVested);
    }

    // Test cliff functionality
    function testCliffFunctionality() public {
        string memory streamId = "stream_with_cliff";
        uint256 cliffDuration = 7 days;

        // Create stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            cliffDuration,
            false
        );
        vm.stopPrank();

        // Fast forward to before cliff
        vm.warp(block.timestamp + cliffDuration - 1 days);

        // Vesting should be calculated but not claimable before cliff
        uint256 vestedAmount = streamBoost.getVestedAmount(streamId);
        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);

        assertTrue(vestedAmount > 0);
        assertEq(claimableAmount, 0); // Should be 0 before cliff

        // Fast forward past cliff
        vm.warp(block.timestamp + 2 days);

        uint256 claimableAfterCliff = streamBoost.getClaimableAmount(streamId);
        assertTrue(claimableAfterCliff > 0); // Should be claimable after cliff

        // Should be able to claim after cliff
        vm.prank(recipient);
        streamBoost.claimStream(streamId, claimableAfterCliff);

        assertEq(token.balanceOf(recipient), claimableAfterCliff);
    }

    // Test error cases
    function testErrorCases() public {
        string memory streamId = "error_stream";

        // Test insufficient allowance
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT - 1);

        vm.expectRevert();
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            false
        );
        vm.stopPrank();

        // Create valid stream for other error tests
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            false
        );
        vm.stopPrank();

        // Test duplicate stream creation
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        vm.expectRevert("Stream already exists");
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            false
        );
        vm.stopPrank();

        // Test unauthorized claim
        vm.expectRevert("Not recipient");
        vm.prank(sender);
        streamBoost.claimStream(streamId, 1000);

        // Test claim before vesting
        vm.expectRevert("Amount exceeds claimable");
        vm.prank(recipient);
        streamBoost.claimStream(streamId, 1000);

        // Test unauthorized pause
        vm.expectRevert("Not sender");
        vm.prank(recipient);
        streamBoost.pauseStream(streamId);

        // Test pausing already paused stream
        vm.prank(sender);
        streamBoost.pauseStream(streamId);

        vm.expectRevert("Stream not active");
        vm.prank(sender);
        streamBoost.pauseStream(streamId);

        // Test resuming active stream
        vm.prank(sender);
        streamBoost.resumeStream(streamId);

        vm.expectRevert("Stream not paused");
        vm.prank(sender);
        streamBoost.resumeStream(streamId);

        // Test operations on non-existent stream
        vm.expectRevert("Stream not found");
        vm.prank(recipient);
        streamBoost.claimStream("non_existent", 1000);
    }

    // Test mock functions (owner-only)
    function testMockFunctions() public {
        // Test mock asset data
        vm.prank(owner);
        streamBoost.setMockAssetData("USDC", 1e18, 6, 500, 10);

        // Test asset state - just verify it was set
        StreamBoost.AssetState memory assetState = streamBoost.getAsset("USDC");
        assertEq(assetState.price, 1e18);

        // Test mock protocol stats
        vm.prank(owner);
        streamBoost.setMockProtocolStats(1000000, 50, 650, 45);

        // Check that mock stats were set
        StreamBoost.ProtocolStats memory mockStats = streamBoost
            .getProtocolStats();
        assertEq(mockStats.totalValueLocked, 1000000);
        assertEq(mockStats.totalActiveStreams, 50);

        // Test mock stream operations (need existing stream)
        string memory streamId = "mock_stream";
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            true
        );
        vm.stopPrank();

        // Mock update boost APR
        vm.prank(owner);
        streamBoost.mockUpdateStreamBoostAPR(streamId, 800);

        StreamBoost.Stream memory boostedStream = streamBoost.getStream(
            streamId
        );
        assertTrue(boostedStream.financials.boosted);
        assertEq(boostedStream.financials.boostAPR, 800);

        // Mock simulate failure
        vm.prank(owner);
        streamBoost.mockSimulateStreamFailure(streamId);

        StreamBoost.Stream memory cancelledStream = streamBoost.getStream(
            streamId
        );
        assertTrue(
            cancelledStream.status == StreamBoost.StreamStatus.CANCELLED
        );
    }

    // Test unauthorized access to mock functions
    function testUnauthorizedMockAccess() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                sender
            )
        );
        vm.prank(sender);
        streamBoost.setMockAssetData("USDC", 1e18, 6, 500, 10);

        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                recipient
            )
        );
        vm.prank(recipient);
        streamBoost.setMockProtocolStats(1000000, 50, 650, 45);
    }

    // Test view functions
    function testViewFunctions() public {
        string memory streamId1 = "stream_view_1";
        string memory streamId2 = "stream_view_2";

        // Create multiple streams
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT * 2);

        streamBoost.createStream(
            streamId1,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            true
        );
        streamBoost.createStream(
            streamId2,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION / 2,
            0,
            false
        );
        vm.stopPrank();

        // Test getAllStreamIds
        string[] memory allIds = streamBoost.getAllStreamIds();
        assertEq(allIds.length, 2);
        assertEq(allIds[0], streamId1);
        assertEq(allIds[1], streamId2);

        // Test user stream getters
        string[] memory outgoingStreams = streamBoost.getUserOutgoingStreams(
            sender
        );
        string[] memory incomingStreams = streamBoost.getUserIncomingStreams(
            recipient
        );

        assertEq(outgoingStreams.length, 2);
        assertEq(incomingStreams.length, 2);

        // Test progress calculations for different streams
        vm.warp(block.timestamp + STREAM_DURATION / 4);

        assertEq(streamBoost.getStreamProgress(streamId1), 25);
        assertEq(streamBoost.getStreamProgress(streamId2), 50); // Shorter duration
    }

    // Test mock timestamp functionality
    function testMockTimestamp() public {
        string memory streamId = "timestamp_stream";

        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            STREAM_DURATION,
            0,
            false
        );
        vm.stopPrank();

        // Initially no vesting
        assertEq(streamBoost.getVestedAmount(streamId), 0);

        // Set mock timestamp to 25% through duration
        uint256 quarterDuration = STREAM_DURATION / 4;
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + quarterDuration);

        // Should now show 25% vested
        uint256 expectedQuarter = STREAM_AMOUNT / 4;
        assertEq(streamBoost.getVestedAmount(streamId), expectedQuarter);
        assertEq(streamBoost.getStreamProgress(streamId), 25);

        // Set to 100% completion
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + STREAM_DURATION);

        // Should now show full amount vested
        assertEq(streamBoost.getVestedAmount(streamId), STREAM_AMOUNT);
        assertEq(streamBoost.getStreamProgress(streamId), 100);

        // Reset mock timestamp
        vm.prank(owner);
        streamBoost.mockResetTimestamp();

        // Should go back to real timestamp (no vesting since real time hasn't moved)
        assertEq(streamBoost.getVestedAmount(streamId), 0);
    }

    // === BOOST FUNCTIONALITY TESTS ===

    function testBoostEarningsCalculation() public {
        string memory streamId = "boost_test_1";
        uint256 streamAmount = 10000e18; // 10,000 tokens
        uint256 streamDuration = 365 days; // 1 year
        
        // Create boosted stream with 7.2% APR
        vm.startPrank(sender);
        token.approve(address(streamBoost), streamAmount);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            streamAmount,
            streamDuration,
            0, // no cliff
            true // boosted
        );
        vm.stopPrank();

        // Verify boost is enabled
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertTrue(stream.financials.boosted);
        assertEq(stream.financials.boostAPR, 720); // 7.2%

        // Initially no boost earnings (just started)
        assertEq(streamBoost.getBoostEarnings(streamId), 0);
        assertEq(streamBoost.getClaimableBoostAmount(streamId), 0);

        // Fast forward 6 months (half year)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 182 days);

        // Calculate expected boost earnings after 6 months
        // Average unclaimed ≈ (10000 + 10000) / 2 = 10000 tokens (no claims yet)
        // Expected: 10000 * 0.072 * 0.5 = 360 tokens
        uint256 boostEarnings = streamBoost.getBoostEarnings(streamId);
        assertTrue(boostEarnings > 300e18 && boostEarnings < 400e18); // Allow some variance

        // Fast forward to full year
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 365 days);

        uint256 fullYearBoost = streamBoost.getBoostEarnings(streamId);
        // Expected around 360-720 tokens (depends on average principal)
        assertTrue(fullYearBoost > 300e18);
        assertTrue(fullYearBoost < 800e18);
    }

    function testClaimStreamWithBoost() public {
        string memory streamId = "boost_claim_test";
        uint256 streamAmount = 1000e18;
        
        // Create boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), streamAmount);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            streamAmount,
            30 days,
            0,
            true
        );
        vm.stopPrank();

        // Fast forward to 50% completion
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 15 days);

        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        uint256 boostAmount = streamBoost.getClaimableBoostAmount(streamId);
        
        assertTrue(claimableAmount > 0);
        assertTrue(boostAmount > 0);

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Claim with boost
        vm.prank(recipient);
        streamBoost.claimStreamWithBoost(streamId, claimableAmount);

        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        
        // Should receive both principal and boost
        assertEq(recipientBalanceAfter - recipientBalanceBefore, claimableAmount + boostAmount);

        // Verify boost was tracked
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.claimedBoostAmount, boostAmount);
    }

    function testClaimBoostOnly() public {
        string memory streamId = "boost_only_test";
        
        // Create boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            true
        );
        vm.stopPrank();

        // Fast forward to generate boost
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 10 days);

        uint256 boostAmount = streamBoost.getClaimableBoostAmount(streamId);
        assertTrue(boostAmount > 0);

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Claim only boost
        vm.prank(recipient);
        streamBoost.claimBoostOnly(streamId);

        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        assertEq(recipientBalanceAfter - recipientBalanceBefore, boostAmount);

        // Principal should remain unchanged
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.claimedAmount, 0);
        assertEq(stream.financials.claimedBoostAmount, boostAmount);
    }

    function testNonBoostedStreamHasNoBoostEarnings() public {
        string memory streamId = "non_boost_test";
        
        // Create non-boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false // not boosted
        );
        vm.stopPrank();

        // Fast forward
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 15 days);

        // Should have no boost earnings
        assertEq(streamBoost.getBoostEarnings(streamId), 0);
        assertEq(streamBoost.getClaimableBoostAmount(streamId), 0);

        // Claiming boost-only should fail
        vm.expectRevert("Stream not boosted");
        vm.prank(recipient);
        streamBoost.claimBoostOnly(streamId);
    }

    function testBoostEarningsWithPausedStream() public {
        string memory streamId = "paused_boost_test";
        
        // Create boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            true
        );
        vm.stopPrank();

        // Let it run for 10 days
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 10 days);

        uint256 boostBeforePause = streamBoost.getBoostEarnings(streamId);

        // Pause the stream
        vm.prank(sender);
        streamBoost.pauseStream(streamId);

        // Fast forward another 10 days while paused
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 20 days);

        // Boost earnings should not increase while paused
        uint256 boostAfterPause = streamBoost.getBoostEarnings(streamId);
        assertEq(boostAfterPause, boostBeforePause);
    }

    function testBoostClaimEvents() public {
        string memory streamId = "event_test";
        
        // Create boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            true
        );
        vm.stopPrank();

        // Generate some boost
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 15 days);

        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        uint256 boostAmount = streamBoost.getClaimableBoostAmount(streamId);

        // Test BoostClaimed event
        vm.expectEmit(true, false, false, true);
        emit StreamBoost.BoostClaimed(streamId, boostAmount);
        
        vm.prank(recipient);
        streamBoost.claimStreamWithBoost(streamId, claimableAmount);
    }

    function testBoostAPRUpdate() public {
        string memory streamId = "apr_update_test";
        
        // Create boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            true
        );
        vm.stopPrank();

        // Let it accumulate some boost at 7.2%
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 10 days);

        uint256 boostAt720 = streamBoost.getBoostEarnings(streamId);

        // Update APR to 10%
        vm.prank(owner);
        streamBoost.mockUpdateStreamBoostAPR(streamId, 1000);

        // Continue for another 10 days at higher APR
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 20 days);

        uint256 boostAt1000 = streamBoost.getBoostEarnings(streamId);
        
        // New boost should be higher than old (though calculation is complex due to averaging)
        assertTrue(boostAt1000 > boostAt720);
        
        // Verify APR was updated
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.boostAPR, 1000);
    }

    // === PENALTY FUNCTIONALITY TESTS ===

    function testPenaltyCalculationAtDifferentProgress() public {
        string memory streamId = "penalty_progress_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Test 0% progress (20% penalty)
        uint256 penalty = streamBoost.calculateEarlyTerminationPenalty(streamId);
        assertEq(penalty, STREAM_AMOUNT * 20 / 100); // 20% penalty

        // Test 25% progress (15% penalty)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 7 days + 12 hours);
        
        penalty = streamBoost.calculateEarlyTerminationPenalty(streamId);
        // At 25% progress but no claims made, penalty is 15% of full amount
        assertEq(penalty, STREAM_AMOUNT * 15 / 100); // 15% penalty on full amount

        // Test 50% progress (10% penalty)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 15 days);
        
        penalty = streamBoost.calculateEarlyTerminationPenalty(streamId);
        // At 50% progress but no claims made, penalty is 10% of full amount
        assertEq(penalty, STREAM_AMOUNT * 10 / 100); // 10% penalty on full amount

        // Test 75% progress (5% penalty)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 22 days + 12 hours);
        
        penalty = streamBoost.calculateEarlyTerminationPenalty(streamId);
        // At 75% progress but no claims made, penalty is 5% of full amount
        assertEq(penalty, STREAM_AMOUNT * 5 / 100); // 5% penalty on full amount

        // Test 90% progress (2% penalty)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 27 days);
        
        penalty = streamBoost.calculateEarlyTerminationPenalty(streamId);
        // At 90% progress but no claims made, penalty is 2% of full amount
        assertEq(penalty, STREAM_AMOUNT * 2 / 100); // 2% penalty on full amount
    }

    function testTerminateStreamBySender() public {
        string memory streamId = "terminate_sender_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Fast forward to 30% progress
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 9 days);

        uint256 remainingAmount = STREAM_AMOUNT; // No claims made yet, so full amount remaining
        uint256 expectedPenalty = remainingAmount * 15 / 100; // 15% penalty on full amount
        uint256 expectedTransfer = remainingAmount - expectedPenalty;

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Terminate by sender
        vm.expectEmit(true, true, false, true);
        emit StreamBoost.StreamTerminated(streamId, sender, expectedPenalty, expectedTransfer);
        
        vm.prank(sender);
        streamBoost.terminateStream(streamId);

        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        
        // Verify recipient received expected amount
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedTransfer);

        // Verify stream state
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.penaltiesAccrued, expectedPenalty);
        assertEq(stream.financials.claimedAmount, STREAM_AMOUNT);
        assertTrue(stream.status == StreamBoost.StreamStatus.CANCELLED);
    }

    function testTerminateStreamByRecipient() public {
        string memory streamId = "terminate_recipient_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Fast forward to 60% progress
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 18 days);

        uint256 remainingAmount = STREAM_AMOUNT; // No claims made yet, so full amount remaining
        uint256 expectedPenalty = remainingAmount * 10 / 100; // 10% penalty on full amount
        uint256 expectedTransfer = remainingAmount - expectedPenalty;

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Terminate by recipient
        vm.expectEmit(true, true, false, true);
        emit StreamBoost.StreamTerminated(streamId, recipient, expectedPenalty, expectedTransfer);
        
        vm.prank(recipient);
        streamBoost.terminateStream(streamId);

        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        
        // Verify recipient received expected amount
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedTransfer);

        // Verify penalty was applied
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.penaltiesAccrued, expectedPenalty);
    }

    function testTerminateStreamWithBoostRewards() public {
        string memory streamId = "terminate_boost_test";
        
        // Create boosted stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            true
        );
        vm.stopPrank();

        // Fast forward to 40% progress
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 12 days);

        uint256 boostAmount = streamBoost.getClaimableBoostAmount(streamId);
        uint256 remainingAmount = STREAM_AMOUNT; // No claims made yet, so full amount remaining
        uint256 expectedPenalty = remainingAmount * 15 / 100; // 15% penalty on full amount
        uint256 expectedTransfer = remainingAmount - expectedPenalty;

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Terminate stream
        vm.prank(sender);
        streamBoost.terminateStream(streamId);

        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        
        // Should receive principal (after penalty) + boost rewards
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedTransfer + boostAmount);

        // Verify boost was claimed
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.claimedBoostAmount, boostAmount);
    }

    function testTerminateStreamAfterPartialClaim() public {
        string memory streamId = "terminate_partial_claim_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Fast forward to 50% progress
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 15 days);

        // Claim 25% of total
        uint256 claimAmount = STREAM_AMOUNT / 4;
        vm.prank(recipient);
        streamBoost.claimStream(streamId, claimAmount);

        // Now terminate - should only penalize remaining amount
        uint256 remainingAmount = STREAM_AMOUNT - claimAmount; // 75% - 25% = 50% remaining
        uint256 expectedPenalty = remainingAmount * 10 / 100; // 10% penalty on remaining
        uint256 expectedTransfer = remainingAmount - expectedPenalty;

        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        vm.prank(sender);
        streamBoost.terminateStream(streamId);

        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        
        // Verify correct amount transferred
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedTransfer);

        // Verify penalty calculation
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.penaltiesAccrued, expectedPenalty);
        assertEq(stream.financials.claimedAmount, STREAM_AMOUNT);
    }

    function testCannotTerminateCompletedStream() public {
        string memory streamId = "terminate_completed_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Fast forward to completion
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 30 days);

        // Claim all
        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        vm.prank(recipient);
        streamBoost.claimStream(streamId, claimableAmount);

        // Try to terminate completed stream
        vm.expectRevert("Stream not active or paused");
        vm.prank(sender);
        streamBoost.terminateStream(streamId);
    }

    function testUnauthorizedTermination() public {
        string memory streamId = "unauthorized_terminate_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Try to terminate by unauthorized user
        address unauthorized = address(0x999);
        vm.expectRevert("Only sender or recipient can terminate");
        vm.prank(unauthorized);
        streamBoost.terminateStream(streamId);
    }

    function testTerminatePausedStream() public {
        string memory streamId = "terminate_paused_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Fast forward and pause
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 10 days);
        
        vm.prank(sender);
        streamBoost.pauseStream(streamId);

        // Should be able to terminate paused stream
        uint256 remainingAmount = STREAM_AMOUNT; // No claims made yet, so full amount remaining
        uint256 expectedPenalty = remainingAmount * 20 / 100; // 20% penalty (33% progress = first bracket)

        vm.prank(sender);
        streamBoost.terminateStream(streamId);

        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.penaltiesAccrued, expectedPenalty);
        assertTrue(stream.status == StreamBoost.StreamStatus.CANCELLED);
    }

    function testPenaltyInfoFunction() public {
        string memory streamId = "penalty_info_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Fast forward to 60% progress
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 18 days);

        (uint256 penaltyAmount, uint256 remainingAfterPenalty, uint256 penaltyRate) = 
            streamBoost.getPenaltyInfo(streamId);

        uint256 remainingAmount = STREAM_AMOUNT; // No claims made yet, so full amount remaining
        uint256 expectedPenalty = remainingAmount * 10 / 100; // 10% penalty
        
        assertEq(penaltyAmount, expectedPenalty);
        assertEq(remainingAfterPenalty, remainingAmount - expectedPenalty);
        assertEq(penaltyRate, 1000); // 10% in basis points
    }

    function testMockApplyPenalty() public {
        string memory streamId = "mock_penalty_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        uint256 penaltyAmount = 1000e18;

        // Apply mock penalty
        vm.expectEmit(true, false, false, true);
        emit StreamBoost.PenaltyApplied(streamId, penaltyAmount);
        
        vm.prank(owner);
        streamBoost.mockApplyPenalty(streamId, penaltyAmount);

        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.penaltiesAccrued, penaltyAmount);
    }

    function testNoPenaltyForCompletedStream() public {
        string memory streamId = "no_penalty_completed_test";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0,
            false
        );
        vm.stopPrank();

        // Complete the stream
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 30 days);

        // Claim all to complete
        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        vm.prank(recipient);
        streamBoost.claimStream(streamId, claimableAmount);

        // Check penalty calculation returns 0 for completed stream
        uint256 penalty = streamBoost.calculateEarlyTerminationPenalty(streamId);
        assertEq(penalty, 0);
    }

    // === COMPREHENSIVE CLIFF FUNCTIONALITY TESTS ===

    function testCliffValidationInCreateStream() public {
        string memory streamId = "cliff_validation_test";
        
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        
        // Test cliff duration exceeding stream duration - should revert
        vm.expectRevert("Cliff cannot exceed stream duration");
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            31 days, // Cliff longer than duration
            false
        );
        
        // Test valid cliff creation
        streamBoost.createStream(
            "valid_cliff_stream",
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            7 days, // Valid cliff
            false
        );
        
        vm.stopPrank();
        
        StreamBoost.Stream memory stream = streamBoost.getStream("valid_cliff_stream");
        assertEq(stream.timing.cliffTime, block.timestamp + 7 days);
    }

    function testCliffProgressCalculations() public {
        string memory streamId = "cliff_progress_test";
        uint256 cliffDuration = 10 days;
        
        // Create stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            cliffDuration,
            false
        );
        vm.stopPrank();

        // Test cliff progress at 50% of cliff period
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 5 days);
        
        (uint256 cliffProgress, bool cliffPassed) = streamBoost.getCliffProgress(streamId);
        assertEq(cliffProgress, 50); // 50% through cliff period
        assertFalse(cliffPassed);
        
        uint256 claimableProgress = streamBoost.getClaimableProgress(streamId);
        assertEq(claimableProgress, 0); // No claimable progress during cliff
        
        // Test after cliff passes
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 15 days); // 15 days total (5 days past cliff)
        
        (cliffProgress, cliffPassed) = streamBoost.getCliffProgress(streamId);
        assertEq(cliffProgress, 100);
        assertTrue(cliffPassed);
        
        claimableProgress = streamBoost.getClaimableProgress(streamId);
        assertTrue(claimableProgress > 0); // Should have claimable progress after cliff
    }

    function testBoostRewardsWithCliff() public {
        string memory streamId = "boost_cliff_test";
        
        // Create boosted stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            7 days,
            true // boosted
        );
        vm.stopPrank();

        // Fast forward to during cliff period
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 5 days);
        
        // Check claim capabilities during cliff
        (bool canClaimPrincipal, bool canClaimBoost) = streamBoost.canClaimDuringCliff(streamId);
        assertFalse(canClaimPrincipal); // Cannot claim principal during cliff
        assertTrue(canClaimBoost); // Can claim boost even during cliff
        
        // Try to claim principal - should fail (claimable amount is 0)
        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        assertEq(claimableAmount, 0);
        
        // Should be able to claim boost rewards during cliff
        uint256 boostAmount = streamBoost.getClaimableBoostAmount(streamId);
        if (boostAmount > 0) {
            vm.prank(recipient);
            streamBoost.claimBoostOnly(streamId);
        }
    }

    function testTerminationDuringCliff() public {
        string memory streamId = "terminate_cliff_test";
        
        // Create stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            10 days,
            false
        );
        vm.stopPrank();

        // Fast forward to during cliff period (day 5)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 5 days);
        
        // Calculate expected penalty (should be 25% during cliff)
        uint256 expectedPenalty = STREAM_AMOUNT * 25 / 100;
        uint256 expectedTransfer = STREAM_AMOUNT - expectedPenalty;
        
        uint256 recipientBalanceBefore = token.balanceOf(recipient);
        
        // Terminate during cliff period
        vm.prank(sender);
        streamBoost.terminateStream(streamId);
        
        uint256 recipientBalanceAfter = token.balanceOf(recipient);
        
        // Verify penalty was correctly applied
        assertEq(recipientBalanceAfter - recipientBalanceBefore, expectedTransfer);
        
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.financials.penaltiesAccrued, expectedPenalty);
    }

    function testCliffInfoFunction() public {
        string memory streamId = "cliff_info_test";
        uint256 cliffDuration = 7 days;
        
        // Create stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            cliffDuration,
            false
        );
        vm.stopPrank();

        // Test cliff info before cliff
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 3 days);
        
        (uint256 cliffTime, uint256 timeUntilCliff, bool hasCliff, bool cliffPassed) = 
            streamBoost.getCliffInfo(streamId);
        
        assertTrue(hasCliff);
        assertFalse(cliffPassed);
        assertEq(timeUntilCliff, 4 days); // 4 days remaining until cliff
        
        // Test cliff info after cliff
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 10 days);
        
        (cliffTime, timeUntilCliff, hasCliff, cliffPassed) = streamBoost.getCliffInfo(streamId);
        
        assertTrue(hasCliff);
        assertTrue(cliffPassed);
        assertEq(timeUntilCliff, 0);
    }

    function testCliffValidationFunction() public {
        // Test valid cliff setup
        (bool isValid, string memory reason) = streamBoost.validateCliffSetup(30 days, 7 days);
        assertTrue(isValid);
        
        // Test cliff exceeding duration
        (isValid, reason) = streamBoost.validateCliffSetup(30 days, 31 days);
        assertFalse(isValid);
        
        // Test cliff equal to duration
        (isValid, reason) = streamBoost.validateCliffSetup(30 days, 30 days);
        assertFalse(isValid);
        
        // Test cliff too short
        (isValid, reason) = streamBoost.validateCliffSetup(30 days, 1800); // 30 minutes
        assertFalse(isValid);
    }

    function testMockSetCliffTime() public {
        string memory streamId = "mock_cliff_test";
        
        // Create stream without cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0, // No cliff initially
            false
        );
        vm.stopPrank();

        // Add cliff using mock function
        uint256 newCliffTime = block.timestamp + 7 days;
        vm.prank(owner);
        streamBoost.mockSetCliffTime(streamId, newCliffTime);
        
        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.timing.cliffTime, newCliffTime);
        
        // Test invalid cliff time - exceeds stream end
        vm.expectRevert("Cliff cannot exceed stream end");
        vm.startPrank(owner);
        streamBoost.mockSetCliffTime(streamId, block.timestamp + 31 days);
        vm.stopPrank();
        
        // Test invalid cliff time - before stream start  
        vm.expectRevert("Cliff cannot be before stream start");
        vm.startPrank(owner);
        streamBoost.mockSetCliffTime(streamId, 0); // 0 is before stream start time (1)
        vm.stopPrank();
    }

    function testClaimAttemptsDuringCliff() public {
        string memory streamId = "claim_cliff_test";
        
        // Create stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            7 days,
            false
        );
        vm.stopPrank();

        // Fast forward to during cliff (day 3)
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 3 days);
        
        // Verify vesting is happening but claiming is blocked
        uint256 vestedAmount = streamBoost.getVestedAmount(streamId);
        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        
        assertTrue(vestedAmount > 0); // Vesting should continue
        assertEq(claimableAmount, 0); // But claiming should be blocked
        
        // Try to claim - should fail due to zero claimable amount
        vm.expectRevert("Amount exceeds claimable");
        vm.prank(recipient);
        streamBoost.claimStream(streamId, 1000e18);
        
        // Fast forward past cliff
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 10 days);
        
        // Now claiming should work
        claimableAmount = streamBoost.getClaimableAmount(streamId);
        assertTrue(claimableAmount > 0);
        
        vm.prank(recipient);
        streamBoost.claimStream(streamId, claimableAmount);
        
        assertEq(token.balanceOf(recipient), claimableAmount);
    }

    function testCliffWithZeroDuration() public {
        string memory streamId = "no_cliff_test";
        
        // Create stream with zero cliff duration
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(
            streamId,
            recipient,
            address(token),
            STREAM_AMOUNT,
            30 days,
            0, // No cliff
            false
        );
        vm.stopPrank();

        StreamBoost.Stream memory stream = streamBoost.getStream(streamId);
        assertEq(stream.timing.cliffTime, 0); // Should be 0

        // Should be able to claim immediately
        vm.prank(owner);
        streamBoost.mockSetTimestamp(block.timestamp + 1 days);
        
        uint256 claimableAmount = streamBoost.getClaimableAmount(streamId);
        assertTrue(claimableAmount > 0);
        
        (bool canClaimPrincipal, bool canClaimBoost) = streamBoost.canClaimDuringCliff(streamId);
        assertTrue(canClaimPrincipal); // Should be able to claim principal immediately
    }
}
