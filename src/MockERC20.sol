// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor(
        string memory _name, 
        string memory _symbol, 
        uint8 _tokenDecimals
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        _decimals = _tokenDecimals;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function mockSetBalance(address account, uint256 amount) public onlyOwner {
        uint256 currentBalance = balanceOf(account);
        if (amount > currentBalance) {
            _mint(account, amount - currentBalance);
        } else if (amount < currentBalance) {
            _burn(account, currentBalance - amount);
        }
    }
    
    function mockTransfer(address from, address to, uint256 amount) public onlyOwner {
        _transfer(from, to, amount);
    }
}