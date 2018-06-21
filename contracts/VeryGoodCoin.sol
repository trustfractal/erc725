pragma solidity 0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract VeryGoodCoin is MintableToken {
    string public name = "VERY GOOD COIN";
    string public symbol = "GUD";
    uint8 public decimals = 18;
}
