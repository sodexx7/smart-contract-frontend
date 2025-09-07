// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract StreamBoost is Ownable {
    enum StreamStatus {
        SCHEDULED,
        ACTIVE,
        PAUSED,
        COMPLETED,
        CANCELLED
    }

    struct StreamTiming {
        uint256 startTime;
        uint256 endTime;
        uint256 cliffTime;
        uint256 createdAt;
        uint256 pausedAt;
    }

    struct StreamFinancials {
        uint256 totalAmount;
        uint256 claimedAmount;
        bool boosted;
        uint256 boostAPR;
        uint256 penaltiesAccrued;
        uint256 totalBoostEarned;
        uint256 claimedBoostAmount;
    }

    struct Stream {
        string id;
        address sender;
        address recipient;
        address token;
        StreamTiming timing;
        StreamFinancials financials;
        StreamStatus status;
    }

    struct ProtocolStats {
        uint256 totalValueLocked;
        uint256 totalActiveStreams;
        uint256 averageAPR;
        uint256 avgDurationDays;
        uint256 lastUpdated;
    }

    struct AssetState {
        string symbol;
        uint256 price;
        uint8 decimals;
        uint256 yieldBoostBaseAPR;
        uint256 volatilityScore;
        uint256 lastUpdated;
    }

    mapping(string => Stream) public streams;
    mapping(address => string[]) public userOutgoingStreams;
    mapping(address => string[]) public userIncomingStreams;
    mapping(string => AssetState) public assets;

    ProtocolStats public protocolStats;
    string[] public allStreamIds;

    uint256 private mockTimestamp;
    bool private useMockTimestamp;

    event StreamCreated(
        string indexed streamId,
        address indexed sender,
        address indexed recipient
    );
    event StreamClaimed(string indexed streamId, uint256 amount);
    event BoostClaimed(string indexed streamId, uint256 boostAmount);
    event StreamPaused(string indexed streamId);
    event StreamResumed(string indexed streamId);
    event StreamCancelled(string indexed streamId);
    event StreamTerminated(
        string indexed streamId, 
        address indexed terminator,
        uint256 penaltyAmount,
        uint256 remainingAmount
    );
    event PenaltyApplied(string indexed streamId, uint256 penaltyAmount);

    constructor() Ownable(msg.sender) {
        protocolStats.lastUpdated = getCurrentTimestamp();
    }

    function createStream(
        string memory _id,
        address _recipient,
        address _token,
        uint256 _totalAmount,
        uint256 _duration,
        uint256 _cliffDuration,
        bool _boosted
    ) external {
        require(bytes(_id).length > 0, "Invalid stream ID");
        require(_recipient != address(0), "Invalid recipient");
        require(_totalAmount > 0, "Invalid amount");
        require(_duration > 0, "Invalid duration");
        require(bytes(streams[_id].id).length == 0, "Stream already exists");

        IERC20(_token).transferFrom(msg.sender, address(this), _totalAmount);

        uint256 startTime = getCurrentTimestamp();
        uint256 endTime = startTime + _duration;
        uint256 cliffTime = _cliffDuration > 0 ? startTime + _cliffDuration : 0;

        streams[_id] = Stream({
            id: _id,
            sender: msg.sender,
            recipient: _recipient,
            token: _token,
            timing: StreamTiming({
                startTime: startTime,
                endTime: endTime,
                cliffTime: cliffTime,
                createdAt: getCurrentTimestamp(),
                pausedAt: 0
            }),
            financials: StreamFinancials({
                totalAmount: _totalAmount,
                claimedAmount: 0,
                boosted: _boosted,
                boostAPR: _boosted ? 720 : 0,
                penaltiesAccrued: 0,
                totalBoostEarned: 0,
                claimedBoostAmount: 0
            }),
            status: StreamStatus.ACTIVE
        });

        userOutgoingStreams[msg.sender].push(_id);
        userIncomingStreams[_recipient].push(_id);
        allStreamIds.push(_id);

        protocolStats.totalActiveStreams++;
        protocolStats.totalValueLocked += _totalAmount;
        protocolStats.lastUpdated = getCurrentTimestamp();

        emit StreamCreated(_id, msg.sender, _recipient);
    }

    function claimStream(string memory _streamId, uint256 _amount) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.recipient, "Not recipient");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");

        uint256 claimableAmount = getClaimableAmount(_streamId);
        require(_amount <= claimableAmount, "Amount exceeds claimable");

        // Update boost earnings before claim
        if (stream.financials.boosted) {
            stream.financials.totalBoostEarned = getBoostEarnings(_streamId);
        }

        stream.financials.claimedAmount += _amount;
        IERC20(stream.token).transfer(stream.recipient, _amount);

        if (stream.financials.claimedAmount >= stream.financials.totalAmount) {
            stream.status = StreamStatus.COMPLETED;
            protocolStats.totalActiveStreams--;
        }

        protocolStats.lastUpdated = getCurrentTimestamp();
        emit StreamClaimed(_streamId, _amount);
    }

    function claimStreamWithBoost(
        string memory _streamId,
        uint256 _amount
    ) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.recipient, "Not recipient");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");
        require(stream.financials.boosted, "Stream not boosted");

        uint256 claimableAmount = getClaimableAmount(_streamId);
        require(_amount <= claimableAmount, "Amount exceeds claimable");

        // Update and claim boost earnings
        uint256 totalBoostEarned = getBoostEarnings(_streamId);
        stream.financials.totalBoostEarned = totalBoostEarned;

        uint256 claimableBoost = totalBoostEarned -
            stream.financials.claimedBoostAmount;

        // Claim principal
        stream.financials.claimedAmount += _amount;
        IERC20(stream.token).transfer(stream.recipient, _amount);

        // Claim boost rewards if any
        if (claimableBoost > 0) {
            stream.financials.claimedBoostAmount += claimableBoost;
            // For simplicity, boost rewards are paid in the same token
            // In production, this might require a separate reward token or minting
            IERC20(stream.token).transfer(stream.recipient, claimableBoost);
            emit BoostClaimed(_streamId, claimableBoost);
        }

        if (stream.financials.claimedAmount >= stream.financials.totalAmount) {
            stream.status = StreamStatus.COMPLETED;
            protocolStats.totalActiveStreams--;
        }

        protocolStats.lastUpdated = getCurrentTimestamp();
        emit StreamClaimed(_streamId, _amount);
    }

    function claimBoostOnly(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.recipient, "Not recipient");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");
        require(stream.financials.boosted, "Stream not boosted");

        uint256 claimableBoost = getClaimableBoostAmount(_streamId);
        require(claimableBoost > 0, "No boost rewards to claim");

        // Update boost earnings and claim
        stream.financials.totalBoostEarned = getBoostEarnings(_streamId);
        stream.financials.claimedBoostAmount += claimableBoost;

        IERC20(stream.token).transfer(stream.recipient, claimableBoost);
        protocolStats.lastUpdated = getCurrentTimestamp();

        emit BoostClaimed(_streamId, claimableBoost);
    }

    function terminateStream(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(
            msg.sender == stream.sender || msg.sender == stream.recipient,
            "Only sender or recipient can terminate"
        );
        require(
            stream.status == StreamStatus.ACTIVE || stream.status == StreamStatus.PAUSED,
            "Stream not active or paused"
        );

        uint256 remainingAmount = stream.financials.totalAmount - stream.financials.claimedAmount;
        require(remainingAmount > 0, "No remaining amount to terminate");

        // Calculate penalty
        uint256 penaltyAmount = calculateEarlyTerminationPenalty(_streamId);
        uint256 transferAmount = remainingAmount - penaltyAmount;

        // Update boost earnings before termination
        if (stream.financials.boosted) {
            stream.financials.totalBoostEarned = getBoostEarnings(_streamId);
        }

        // Apply penalty
        stream.financials.penaltiesAccrued = penaltyAmount;
        stream.financials.claimedAmount = stream.financials.totalAmount;
        
        // Mark stream as cancelled
        stream.status = StreamStatus.CANCELLED;
        protocolStats.totalActiveStreams--;

        // Transfer remaining amount to recipient (after penalty)
        if (transferAmount > 0) {
            IERC20(stream.token).transfer(stream.recipient, transferAmount);
        }

        // Transfer any unclaimed boost rewards
        if (stream.financials.boosted) {
            uint256 claimableBoost = stream.financials.totalBoostEarned - stream.financials.claimedBoostAmount;
            if (claimableBoost > 0) {
                stream.financials.claimedBoostAmount += claimableBoost;
                IERC20(stream.token).transfer(stream.recipient, claimableBoost);
                emit BoostClaimed(_streamId, claimableBoost);
            }
        }

        protocolStats.lastUpdated = getCurrentTimestamp();
        
        if (penaltyAmount > 0) {
            emit PenaltyApplied(_streamId, penaltyAmount);
        }
        emit StreamTerminated(_streamId, msg.sender, penaltyAmount, transferAmount);
    }

    function pauseStream(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.sender, "Not sender");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");

        // Store boost earnings up to pause point
        if (stream.financials.boosted) {
            stream.financials.totalBoostEarned = getBoostEarnings(_streamId);
        }

        stream.status = StreamStatus.PAUSED;
        stream.timing.pausedAt = getCurrentTimestamp();
        protocolStats.lastUpdated = getCurrentTimestamp();

        emit StreamPaused(_streamId);
    }

    // @audit same as pauseStream
    function resumeStream(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.sender, "Not sender");
        require(stream.status == StreamStatus.PAUSED, "Stream not paused");

        uint256 pausedDuration = getCurrentTimestamp() - stream.timing.pausedAt;
        stream.timing.endTime += pausedDuration;
        stream.status = StreamStatus.ACTIVE;
        stream.timing.pausedAt = 0;
        protocolStats.lastUpdated = getCurrentTimestamp();

        emit StreamResumed(_streamId);
    }

    // @audit not pointing which token?
    function getVestedAmount(
        string memory _streamId
    ) public view returns (uint256) {
        Stream memory stream = streams[_streamId];
        if (
            bytes(stream.id).length == 0 || stream.status != StreamStatus.ACTIVE
        ) {
            return 0;
        }

        if (getCurrentTimestamp() < stream.timing.startTime) {
            return 0;
        }

        if (getCurrentTimestamp() >= stream.timing.endTime) {
            return stream.financials.totalAmount;
        }

        uint256 elapsed = getCurrentTimestamp() - stream.timing.startTime;
        uint256 duration = stream.timing.endTime - stream.timing.startTime;
        return (stream.financials.totalAmount * elapsed) / duration;
    }

    function getClaimableAmount(
        string memory _streamId
    ) public view returns (uint256) {
        Stream memory stream = streams[_streamId];
        if (bytes(stream.id).length == 0) {
            return 0;
        }

        if (
            stream.timing.cliffTime > 0 &&
            getCurrentTimestamp() < stream.timing.cliffTime
        ) {
            return 0;
        }

        uint256 vestedAmount = getVestedAmount(_streamId);
        return
            vestedAmount > stream.financials.claimedAmount
                ? vestedAmount - stream.financials.claimedAmount
                : 0;
    }

    function getBoostEarnings(
        string memory _streamId
    ) public view returns (uint256) {
        Stream memory stream = streams[_streamId];
        if (!stream.financials.boosted || stream.financials.boostAPR == 0) {
            return 0;
        }

        if (stream.status == StreamStatus.PAUSED) {
            return stream.financials.totalBoostEarned;
        }
        if (stream.status == StreamStatus.CANCELLED) {
            return stream.financials.totalBoostEarned;
        }

        // Calculate time for boost calculation
        uint256 startTime = stream.timing.startTime;
        uint256 endTime = stream.timing.endTime;
        uint256 currentTime = getCurrentTimestamp();

        // Handle time bounds
        uint256 effectiveEndTime = currentTime > endTime
            ? endTime
            : currentTime;
        if (currentTime < startTime) {
            return 0;
        }

        // Calculate elapsed time for yield generation
        uint256 elapsedTime = effectiveEndTime - startTime;

        // Calculate average unclaimed principal over time
        // Simplified linear decay: starts at totalAmount, ends at currentUnclaimed
        uint256 currentUnclaimed = stream.financials.totalAmount -
            stream.financials.claimedAmount;
        uint256 avgUnclaimed = (stream.financials.totalAmount +
            currentUnclaimed) / 2;

        // Annual yield calculation: principal * APR * time / year
        // boostAPR is in basis points (720 = 7.2%)
        uint256 yearInSeconds = 365 days;
        uint256 boostEarnings = (avgUnclaimed *
            stream.financials.boostAPR *
            elapsedTime) / (10000 * yearInSeconds);

        return boostEarnings;
    }

    function getClaimableBoostAmount(
        string memory _streamId
    ) public view returns (uint256) {
        uint256 totalBoostEarned = getBoostEarnings(_streamId);
        Stream memory stream = streams[_streamId];

        return
            totalBoostEarned > stream.financials.claimedBoostAmount
                ? totalBoostEarned - stream.financials.claimedBoostAmount
                : 0;
    }

    function getStreamProgress(
        string memory _streamId
    ) public view returns (uint256) {
        uint256 vestedAmount = getVestedAmount(_streamId);
        Stream memory stream = streams[_streamId];

        if (stream.financials.totalAmount == 0) return 0;
        return (vestedAmount * 100) / stream.financials.totalAmount;
    }

    function calculateEarlyTerminationPenalty(
        string memory _streamId
    ) public view returns (uint256) {
        Stream memory stream = streams[_streamId];
        if (bytes(stream.id).length == 0) {
            return 0;
        }

        // Can only calculate penalties for active or paused streams
        if (stream.status != StreamStatus.ACTIVE && stream.status != StreamStatus.PAUSED) {
            return 0;
        }

        uint256 progress = getStreamProgress(_streamId);
        uint256 remainingAmount = stream.financials.totalAmount - stream.financials.claimedAmount;
        
        if (remainingAmount == 0) {
            return 0;
        }

        // Time-based penalty rates (in basis points)
        uint256 penaltyRate;
        
        if (progress < 25) {
            penaltyRate = 2000; // 20%
        } else if (progress < 50) {
            penaltyRate = 1500; // 15%
        } else if (progress < 75) {
            penaltyRate = 1000; // 10%
        } else if (progress < 90) {
            penaltyRate = 500;  // 5%
        } else {
            penaltyRate = 200;  // 2%
        }

        return (remainingAmount * penaltyRate) / 10000;
    }

    function getPenaltyInfo(
        string memory _streamId
    ) public view returns (uint256 penaltyAmount, uint256 remainingAfterPenalty, uint256 penaltyRate) {
        penaltyAmount = calculateEarlyTerminationPenalty(_streamId);
        
        Stream memory stream = streams[_streamId];
        uint256 remainingAmount = stream.financials.totalAmount - stream.financials.claimedAmount;
        remainingAfterPenalty = remainingAmount > penaltyAmount ? remainingAmount - penaltyAmount : 0;
        
        uint256 progress = getStreamProgress(_streamId);
        if (progress < 25) {
            penaltyRate = 2000; // 20%
        } else if (progress < 50) {
            penaltyRate = 1500; // 15%
        } else if (progress < 75) {
            penaltyRate = 1000; // 10%
        } else if (progress < 90) {
            penaltyRate = 500;  // 5%
        } else {
            penaltyRate = 200;  // 2%
        }
    }

    function getUserOutgoingStreams(
        address _user
    ) external view returns (string[] memory) {
        return userOutgoingStreams[_user];
    }

    function getUserIncomingStreams(
        address _user
    ) external view returns (string[] memory) {
        return userIncomingStreams[_user];
    }

    function setMockAssetData(
        string memory _symbol,
        uint256 _price,
        uint8 _decimals,
        uint256 _yieldBoostBaseAPR,
        uint256 _volatilityScore
    ) external onlyOwner {
        assets[_symbol] = AssetState({
            symbol: _symbol,
            price: _price,
            decimals: _decimals,
            yieldBoostBaseAPR: _yieldBoostBaseAPR,
            volatilityScore: _volatilityScore,
            lastUpdated: getCurrentTimestamp()
        });
    }

    function setMockProtocolStats(
        uint256 _totalValueLocked,
        uint256 _totalActiveStreams,
        uint256 _averageAPR,
        uint256 _avgDurationDays
    ) external onlyOwner {
        protocolStats.totalValueLocked = _totalValueLocked;
        protocolStats.totalActiveStreams = _totalActiveStreams;
        protocolStats.averageAPR = _averageAPR;
        protocolStats.avgDurationDays = _avgDurationDays;
        protocolStats.lastUpdated = getCurrentTimestamp();
    }

    function mockUpdateStreamBoostAPR(
        string memory _streamId,
        uint256 _newAPR
    ) external onlyOwner {
        require(bytes(streams[_streamId].id).length > 0, "Stream not found");
        streams[_streamId].financials.boostAPR = _newAPR;
    }

    function mockSimulateStreamFailure(
        string memory _streamId
    ) external onlyOwner {
        require(bytes(streams[_streamId].id).length > 0, "Stream not found");
        streams[_streamId].status = StreamStatus.CANCELLED;
        protocolStats.totalActiveStreams--;
        protocolStats.lastUpdated = getCurrentTimestamp();
        emit StreamCancelled(_streamId);
    }

    function mockApplyPenalty(
        string memory _streamId,
        uint256 _penaltyAmount
    ) external onlyOwner {
        require(bytes(streams[_streamId].id).length > 0, "Stream not found");
        streams[_streamId].financials.penaltiesAccrued += _penaltyAmount;
        protocolStats.lastUpdated = getCurrentTimestamp();
        emit PenaltyApplied(_streamId, _penaltyAmount);
    }

    function getAllStreamIds() external view returns (string[] memory) {
        return allStreamIds;
    }

    function getAsset(
        string memory _symbol
    ) external view returns (AssetState memory) {
        return assets[_symbol];
    }

    function getStream(
        string memory _streamId
    ) external view returns (Stream memory) {
        return streams[_streamId];
    }

    function getProtocolStats() external view returns (ProtocolStats memory) {
        return protocolStats;
    }

    function mockSetTimestamp(uint256 _timestamp) external onlyOwner {
        mockTimestamp = _timestamp;
        useMockTimestamp = true;
    }

    function mockResetTimestamp() external onlyOwner {
        useMockTimestamp = false;
        mockTimestamp = 0;
    }

    function getCurrentTimestamp() internal view returns (uint256) {
        return useMockTimestamp ? mockTimestamp : block.timestamp;
    }
}
