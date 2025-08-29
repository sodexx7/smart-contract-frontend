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
    event StreamPaused(string indexed streamId);
    event StreamResumed(string indexed streamId);
    event StreamCancelled(string indexed streamId);

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
                penaltiesAccrued: 0
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

        stream.financials.claimedAmount += _amount;
        IERC20(stream.token).transfer(stream.recipient, _amount);

        if (stream.financials.claimedAmount >= stream.financials.totalAmount) {
            stream.status = StreamStatus.COMPLETED;
            protocolStats.totalActiveStreams--;
        }

        protocolStats.lastUpdated = getCurrentTimestamp();
        emit StreamClaimed(_streamId, _amount);
    }

    function pauseStream(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.sender, "Not sender");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");

        stream.status = StreamStatus.PAUSED;
        stream.timing.pausedAt = getCurrentTimestamp();
        protocolStats.lastUpdated = getCurrentTimestamp();

        emit StreamPaused(_streamId);
    }

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

    function getStreamProgress(
        string memory _streamId
    ) public view returns (uint256) {
        uint256 vestedAmount = getVestedAmount(_streamId);
        Stream memory stream = streams[_streamId];

        if (stream.financials.totalAmount == 0) return 0;
        return (vestedAmount * 100) / stream.financials.totalAmount;
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
