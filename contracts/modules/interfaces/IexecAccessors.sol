pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../../libs/IexecODBLibCore_v4.sol";
import "../../registries/IRegistry.sol";

interface IexecAccessors
{
	function name() external view returns (string memory);
	function symbol() external view returns (string memory);
	function decimals() external view returns (uint8);
	function totalSupply() external view returns (uint256);
	function balanceOf(address) external view returns (uint256);
	function frozenOf(address) external view returns (uint256);
	function allowance(address,address) external view returns (uint256);
	function viewAccount(address) external view returns (IexecODBLibCore_v4.Account memory);
	function token() external view returns (address);
	function viewDeal(bytes32) external view returns (IexecODBLibCore_v4.Deal memory);
	function viewConsumed(bytes32) external view returns (uint256);
	function viewPresigned(bytes32) external view returns (address);
	function viewTask(bytes32) external view returns (IexecODBLibCore_v4.Task memory);
	function viewContribution(bytes32,address) external view returns (IexecODBLibCore_v4.Contribution memory);
	function viewScore(address) external view returns (uint256);
	function resultFor(bytes32) external view returns (bytes memory);
	function viewCategory(uint256) external view returns (IexecODBLibCore_v4.Category memory);
	function countCategory() external view returns (uint256);

	function appregistry() external view returns (IRegistry);
	function datasetregistry() external view returns (IRegistry);
	function workerpoolregistry() external view returns (IRegistry);
}
