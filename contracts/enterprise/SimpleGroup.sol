pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

import './GroupInterface.sol';
import '../tools/Ownable.sol';

contract SimpleGroup is GroupInterface, OwnableMutable
{
	/**
	 * Content
	 */
	mapping(address => bytes1) public m_permissions;

	/**
	 * Constructor
	 */
	constructor() public {}

	function setPermissions(address _user, bytes1 _permissions)
	public onlyOwner returns (bytes1)
	{
		m_permissions[_user] = _permissions;
		return m_permissions[_user];
	}
	function addPermissions(address _user, bytes1 _permissions)
	public onlyOwner returns (bytes1)
	{
		m_permissions[_user] = m_permissions[_user] | _permissions;
		return m_permissions[_user];
	}
	function remPermissions(address _user, bytes1 _permissions)
	public onlyOwner returns (bytes1)
	{
		m_permissions[_user] = m_permissions[_user] & ~_permissions;
		return m_permissions[_user];
	}
	function viewPermissions(address _user)
	public view returns (bytes1)
	{
		return m_permissions[_user];
	}
}
