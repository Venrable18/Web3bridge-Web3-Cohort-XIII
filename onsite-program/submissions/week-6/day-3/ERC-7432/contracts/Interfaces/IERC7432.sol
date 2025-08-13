// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IERC7432 is IERC165 {
	event RoleGranted(uint256 indexed tokenId, bytes32 indexed role, address indexed grantee, uint64 expiration, bytes data);
	event RoleRevoked(uint256 indexed tokenId, bytes32 indexed role, address indexed grantee, address revoker);

	function hasRole(uint256 tokenId, address grantee, bytes32 role) external view returns (bool);
	function roleExpiration(uint256 tokenId, address grantee, bytes32 role) external view returns (uint64);
	function grantRole(uint256 tokenId, address grantee, bytes32 role, uint64 expiration, bytes calldata data) external;
	function revokeRole(uint256 tokenId, address grantee, bytes32 role) external;
}
