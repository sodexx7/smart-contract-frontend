// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
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
        // Verify stream creation using individual getters
        assertTrue(streamBoost.getStreamBoosted(streamId));
        assertEq(streamBoost.getStreamBoostAPR(streamId), 720); // 7.2%
        assertEq(streamBoost.getStreamClaimedAmount(streamId), 0);
        assertEq(streamBoost.getStreamPausedAt(streamId), 0);
        assertTrue(streamBoost.getStreamStatus(streamId) == StreamBoost.StreamStatus.ACTIVE);
        
        // Verify token transfer
        assertEq(token.balanceOf(address(streamBoost)), STREAM_AMOUNT);
        assertEq(token.balanceOf(sender), INITIAL_BALANCE - STREAM_AMOUNT);
        
        // Verify user stream mappings
        string[] memory outgoingStreams = streamBoost.getUserOutgoingStreams(sender);
        string[] memory incomingStreams = streamBoost.getUserIncomingStreams(recipient);
        
        assertEq(outgoingStreams.length, 1);
        assertEq(outgoingStreams[0], streamId);
        assertEq(incomingStreams.length, 1);
        assertEq(incomingStreams[0], streamId);
        
        // Verify protocol stats update
        assertEq(streamBoost.getProtocolTotalValueLocked(), STREAM_AMOUNT);
        assertEq(streamBoost.getProtocolTotalActiveStreams(), 1);
        assertEq(streamBoost.getProtocolLastUpdated(), block.timestamp);
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
        
        assertEq(streamBoost.getStreamCliffTime(streamId), block.timestamp + cliffDuration);
        assertEq(streamBoost.getStreamEndTime(streamId), block.timestamp + STREAM_DURATION);
        assertTrue(!streamBoost.getStreamBoosted(streamId));
        assertEq(streamBoost.getStreamBoostAPR(streamId), 0);
    }
    
    // Main Flow 4: Monitor Stream Progress
    function testMainFlow_MonitorStreamProgress() public {
        string memory streamId = "stream_monitor";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, true);
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
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, true);
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
        assertEq(token.balanceOf(recipient), recipientBalanceBefore + claimAmount);
        assertEq(streamBoost.getStreamClaimedAmount(streamId), claimAmount);
        
        // Verify updated claimable amount
        assertEq(streamBoost.getClaimableAmount(streamId), expectedClaimable - claimAmount);
        
        // Claim remaining vested amount
        vm.prank(recipient);
        streamBoost.claimStream(streamId, expectedClaimable - claimAmount);
        
        assertEq(streamBoost.getStreamClaimedAmount(streamId), expectedClaimable);
        assertEq(streamBoost.getClaimableAmount(streamId), 0);
    }
    
    function testRecipientFlow_ClaimFullStreamAtEnd() public {
        string memory streamId = "stream_full_claim";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, true);
        vm.stopPrank();
        
        // Fast forward to completion
        vm.warp(block.timestamp + STREAM_DURATION);
        
        // Claim full amount
        vm.prank(recipient);
        streamBoost.claimStream(streamId, STREAM_AMOUNT);
        
        // Verify stream completion
        assertEq(streamBoost.getStreamClaimedAmount(streamId), STREAM_AMOUNT);
        assertTrue(streamBoost.getStreamStatus(streamId) == StreamBoost.StreamStatus.COMPLETED);
        
        // Verify protocol stats update
        assertEq(streamBoost.getProtocolTotalActiveStreams(), 0);
    }
    
    // Main Flow 5: Pause/Resume
    function testMainFlow_PauseResumeStream() public {
        string memory streamId = "stream_pause";
        
        // Create stream
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, true);
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
        
        assertTrue(streamBoost.getStreamStatus(streamId) == StreamBoost.StreamStatus.PAUSED);
        assertEq(streamBoost.getStreamPausedAt(streamId), pauseTime);
        uint256 endTimeBefore = streamBoost.getStreamEndTime(streamId);
        
        // Fast forward while paused (vested amount should not increase)
        uint256 pauseDuration = 10 days;
        vm.warp(pauseTime + pauseDuration);
        
        uint256 vestedDuringPause = streamBoost.getVestedAmount(streamId);
        assertEq(vestedDuringPause, 0); // Should be 0 for paused streams
        
        // Resume stream
        vm.prank(sender);
        streamBoost.resumeStream(streamId);
        
        assertTrue(streamBoost.getStreamStatus(streamId) == StreamBoost.StreamStatus.ACTIVE);
        assertEq(streamBoost.getStreamPausedAt(streamId), 0);
        assertEq(streamBoost.getStreamEndTime(streamId), endTimeBefore + pauseDuration); // End time extended
        
        // Verify vesting continues normally after resume
        vm.warp(block.timestamp + STREAM_DURATION / 4);
        uint256 vestedAfterResume = streamBoost.getVestedAmount(streamId);
        uint256 expectedVested50 = STREAM_AMOUNT / 2;
        assertEq(vestedAfterResume, expectedVested50);
    }
    
    // Test cliff functionality
    function testCliffFunctionality() public {
        string memory streamId = "stream_with_cliff";
        uint256 cliffDuration = 7 days;
        
        // Create stream with cliff
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, cliffDuration, false);
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
        
        vm.expectRevert("ERC20: insufficient allowance");
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, false);
        vm.stopPrank();
        
        // Create valid stream for other error tests
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, false);
        vm.stopPrank();
        
        // Test duplicate stream creation
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        vm.expectRevert("Stream already exists");
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, false);
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
        assertEq(streamBoost.getAssetPrice("USDC"), 1e18);
        
        // Test mock protocol stats
        vm.prank(owner);
        streamBoost.setMockProtocolStats(1000000, 50, 650, 45);
        
        // Check that mock stats were set
        assertEq(streamBoost.getProtocolTotalValueLocked(), 1000000);
        assertEq(streamBoost.getProtocolTotalActiveStreams(), 50);
        
        // Test mock stream operations (need existing stream)
        string memory streamId = "mock_stream";
        vm.startPrank(sender);
        token.approve(address(streamBoost), STREAM_AMOUNT);
        streamBoost.createStream(streamId, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, true);
        vm.stopPrank();
        
        // Mock update boost APR
        vm.prank(owner);
        streamBoost.mockUpdateStreamBoostAPR(streamId, 800);
        
        assertTrue(streamBoost.getStreamBoosted(streamId));
        assertEq(streamBoost.getStreamBoostAPR(streamId), 800);
        
        // Mock simulate failure
        vm.prank(owner);
        streamBoost.mockSimulateStreamFailure(streamId);
        
        assertTrue(streamBoost.getStreamStatus(streamId) == StreamBoost.StreamStatus.CANCELLED);
    }
    
    // Test unauthorized access to mock functions
    function testUnauthorizedMockAccess() public {
        vm.expectRevert("Not owner");
        vm.prank(sender);
        streamBoost.setMockAssetData("USDC", 1e18, 6, 500, 10);
        
        vm.expectRevert("Not owner");
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
        
        streamBoost.createStream(streamId1, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION, 0, true);
        streamBoost.createStream(streamId2, recipient, address(token), STREAM_AMOUNT, STREAM_DURATION / 2, 0, false);
        vm.stopPrank();
        
        // Test getAllStreamIds
        string[] memory allIds = streamBoost.getAllStreamIds();
        assertEq(allIds.length, 2);
        assertEq(allIds[0], streamId1);
        assertEq(allIds[1], streamId2);
        
        // Test user stream getters
        string[] memory outgoingStreams = streamBoost.getUserOutgoingStreams(sender);
        string[] memory incomingStreams = streamBoost.getUserIncomingStreams(recipient);
        
        assertEq(outgoingStreams.length, 2);
        assertEq(incomingStreams.length, 2);
        
        // Test progress calculations for different streams
        vm.warp(block.timestamp + STREAM_DURATION / 4);
        
        assertEq(streamBoost.getStreamProgress(streamId1), 25);
        assertEq(streamBoost.getStreamProgress(streamId2), 50); // Shorter duration
    }
}