// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _tokenDecimals
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        _decimals = _tokenDecimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
