// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;

import "./MultiSend.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiSendProxy {
    address public immutable multiSendContract;

    constructor(address _multiSendContract) {
        multiSendContract = _multiSendContract;
    }

    function multiSend(bytes memory transactions) public payable {
        (bool success, ) = multiSendContract.delegatecall(
            abi.encodeWithSignature("multiSend(bytes)", transactions)
        );
        require(success, "MultiSend execution failed");
    }

     function approveAndCall(address token, uint256 amount) external {
        IERC20(token).approve(multiSendContract, amount);
    }

    receive() external payable {}
}