// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC7432} from ".././contracts/Interfaces/IERC7432.sol";

contract ERC721WithRoles is ERC721, Ownable, IERC7432 {
	
	struct RoleInfo {
		uint64 expiration; 
		bool exists;
	}

	mapping(uint256 => mapping(bytes32 => mapping(address => RoleInfo))) private _roles;

	constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {}


	function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, IERC165) returns (bool) {
		return interfaceId == type(IERC7432).interfaceId || super.supportsInterface(interfaceId);
	}


	function mint(address to, uint256 tokenId) external onlyOwner {
		_safeMint(to, tokenId);
	}


	function hasRole(uint256 tokenId, address grantee, bytes32 role) public view returns (bool) {
		RoleInfo memory info = _roles[tokenId][role][grantee];
		if (!info.exists) return false;
		if (info.expiration == 0) return true;
		return block.timestamp <= info.expiration;
	}


	function roleExpiration(uint256 tokenId, address grantee, bytes32 role) external view returns (uint64) {
		return _roles[tokenId][role][grantee].expiration;
	}


	function grantRole(uint256 tokenId, address grantee, bytes32 role, uint64 expiration, bytes calldata data) external {
		_requireOwnerOrApprovedForToken(tokenId);
		_roles[tokenId][role][grantee] = RoleInfo({expiration: expiration, exists: true});
		emit RoleGranted(tokenId, role, grantee, expiration, data);
	}


	function revokeRole(uint256 tokenId, address grantee, bytes32 role) external {
		_requireOwnerOrApprovedForToken(tokenId);
		RoleInfo storage info = _roles[tokenId][role][grantee];
		if (info.exists) {
			delete _roles[tokenId][role][grantee];
			emit RoleRevoked(tokenId, role, grantee, msg.sender);
		}
	}


	function _requireOwnerOrApprovedForToken(uint256 tokenId) internal view {
		address owner = ownerOf(tokenId);
		require(
			msg.sender == owner ||
				isApprovedForAll(owner, msg.sender) ||
				getApproved(tokenId) == msg.sender,
			"Not owner nor approved for token"
		);
	}


}

