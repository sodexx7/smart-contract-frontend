// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StreamBoost {
    address public owner;
    
    enum StreamStatus { SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED }
    
    struct Stream {
        string id;
        address sender;
        address recipient;
        address token;
        uint256 totalAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 cliffTime;
        uint256 createdAt;
        bool boosted;
        uint256 boostAPR;
        uint256 claimedAmount;
        uint256 pausedAt;
        StreamStatus status;
        uint256 penaltiesAccrued;
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
    
    event StreamCreated(string indexed streamId, address indexed sender, address indexed recipient);
    event StreamClaimed(string indexed streamId, uint256 amount);
    event StreamPaused(string indexed streamId);
    event StreamResumed(string indexed streamId);
    event StreamCancelled(string indexed streamId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        protocolStats.lastUpdated = block.timestamp;
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
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + _duration;
        uint256 cliffTime = _cliffDuration > 0 ? startTime + _cliffDuration : 0;
        
        streams[_id] = Stream({
            id: _id,
            sender: msg.sender,
            recipient: _recipient,
            token: _token,
            totalAmount: _totalAmount,
            startTime: startTime,
            endTime: endTime,
            cliffTime: cliffTime,
            createdAt: block.timestamp,
            boosted: _boosted,
            boostAPR: _boosted ? 720 : 0, // 7.2% default
            claimedAmount: 0,
            pausedAt: 0,
            status: StreamStatus.ACTIVE,
            penaltiesAccrued: 0
        });
        
        userOutgoingStreams[msg.sender].push(_id);
        userIncomingStreams[_recipient].push(_id);
        allStreamIds.push(_id);
        
        protocolStats.totalActiveStreams++;
        protocolStats.totalValueLocked += _totalAmount;
        protocolStats.lastUpdated = block.timestamp;
        
        emit StreamCreated(_id, msg.sender, _recipient);
    }
    
    function claimStream(string memory _streamId, uint256 _amount) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.recipient, "Not recipient");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");
        
        uint256 claimableAmount = getClaimableAmount(_streamId);
        require(_amount <= claimableAmount, "Amount exceeds claimable");
        
        stream.claimedAmount += _amount;
        IERC20(stream.token).transfer(stream.recipient, _amount);
        
        if (stream.claimedAmount >= stream.totalAmount) {
            stream.status = StreamStatus.COMPLETED;
            protocolStats.totalActiveStreams--;
        }
        
        protocolStats.lastUpdated = block.timestamp;
        emit StreamClaimed(_streamId, _amount);
    }
    
    function pauseStream(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.sender, "Not sender");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");
        
        stream.status = StreamStatus.PAUSED;
        stream.pausedAt = block.timestamp;
        protocolStats.lastUpdated = block.timestamp;
        
        emit StreamPaused(_streamId);
    }
    
    function resumeStream(string memory _streamId) external {
        Stream storage stream = streams[_streamId];
        require(bytes(stream.id).length > 0, "Stream not found");
        require(msg.sender == stream.sender, "Not sender");
        require(stream.status == StreamStatus.PAUSED, "Stream not paused");
        
        uint256 pausedDuration = block.timestamp - stream.pausedAt;
        stream.endTime += pausedDuration;
        stream.status = StreamStatus.ACTIVE;
        stream.pausedAt = 0;
        protocolStats.lastUpdated = block.timestamp;
        
        emit StreamResumed(_streamId);
    }
    
    function getVestedAmount(string memory _streamId) public view returns (uint256) {
        Stream memory stream = streams[_streamId];
        if (bytes(stream.id).length == 0 || stream.status != StreamStatus.ACTIVE) {
            return 0;
        }
        
        if (block.timestamp < stream.startTime) {
            return 0;
        }
        
        if (block.timestamp >= stream.endTime) {
            return stream.totalAmount;
        }
        
        uint256 elapsed = block.timestamp - stream.startTime;
        uint256 duration = stream.endTime - stream.startTime;
        return (stream.totalAmount * elapsed) / duration;
    }
    
    function getClaimableAmount(string memory _streamId) public view returns (uint256) {
        Stream memory stream = streams[_streamId];
        if (bytes(stream.id).length == 0) {
            return 0;
        }
        
        if (stream.cliffTime > 0 && block.timestamp < stream.cliffTime) {
            return 0;
        }
        
        uint256 vestedAmount = getVestedAmount(_streamId);
        return vestedAmount > stream.claimedAmount ? vestedAmount - stream.claimedAmount : 0;
    }
    
    function getStreamProgress(string memory _streamId) public view returns (uint256) {
        uint256 vestedAmount = getVestedAmount(_streamId);
        Stream memory stream = streams[_streamId];
        
        if (stream.totalAmount == 0) return 0;
        return (vestedAmount * 100) / stream.totalAmount;
    }
    
    function getUserOutgoingStreams(address _user) external view returns (string[] memory) {
        return userOutgoingStreams[_user];
    }
    
    function getUserIncomingStreams(address _user) external view returns (string[] memory) {
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
            lastUpdated: block.timestamp
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
        protocolStats.lastUpdated = block.timestamp;
    }
    
    function mockUpdateStreamBoostAPR(string memory _streamId, uint256 _newAPR) external onlyOwner {
        require(bytes(streams[_streamId].id).length > 0, "Stream not found");
        streams[_streamId].boostAPR = _newAPR;
    }
    
    function mockSimulateStreamFailure(string memory _streamId) external onlyOwner {
        require(bytes(streams[_streamId].id).length > 0, "Stream not found");
        streams[_streamId].status = StreamStatus.CANCELLED;
        protocolStats.totalActiveStreams--;
        protocolStats.lastUpdated = block.timestamp;
        emit StreamCancelled(_streamId);
    }
    
    function getAllStreamIds() external view returns (string[] memory) {
        return allStreamIds;
    }
    
    function getAssetPrice(string memory _symbol) external view returns (uint256) {
        return assets[_symbol].price;
    }
    
    function getStreamStatus(string memory _streamId) external view returns (StreamStatus) {
        return streams[_streamId].status;
    }
    
    function getStreamClaimedAmount(string memory _streamId) external view returns (uint256) {
        return streams[_streamId].claimedAmount;
    }
    
    function getStreamBoosted(string memory _streamId) external view returns (bool) {
        return streams[_streamId].boosted;
    }
    
    function getStreamBoostAPR(string memory _streamId) external view returns (uint256) {
        return streams[_streamId].boostAPR;
    }
    
    function getStreamPausedAt(string memory _streamId) external view returns (uint256) {
        return streams[_streamId].pausedAt;
    }
    
    function getStreamEndTime(string memory _streamId) external view returns (uint256) {
        return streams[_streamId].endTime;
    }
    
    function getStreamCliffTime(string memory _streamId) external view returns (uint256) {
        return streams[_streamId].cliffTime;
    }
    
    function getProtocolTotalActiveStreams() external view returns (uint256) {
        return protocolStats.totalActiveStreams;
    }
    
    function getProtocolTotalValueLocked() external view returns (uint256) {
        return protocolStats.totalValueLocked;
    }
    
    function getProtocolLastUpdated() external view returns (uint256) {
        return protocolStats.lastUpdated;
    }
}