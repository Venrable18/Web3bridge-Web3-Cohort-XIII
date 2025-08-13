// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC7432} from "../contracts/Interfaces/IERC7432.sol";

contract TokenGatedDAO {
	struct Proposal {
		string description;
		uint256 forVotes;
		uint256 againstVotes;
		uint64 deadline;
		bool executed;
		address proposer;
	}

	event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint64 deadline);
	event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
	event Executed(uint256 indexed proposalId, bool passed);

	IERC7432 public immutable nft;
	bytes32 public immutable PROPOSER_ROLE;
	bytes32 public immutable VOTER_ROLE;

	uint256 public proposalCount;
	mapping(uint256 => Proposal) public proposals;
	mapping(uint256 => mapping(address => bool)) public hasVoted;

	constructor(address nft_, bytes32 proposerRole, bytes32 voterRole) {
		require(nft_ != address(0), "nft address required");
		nft = IERC7432(nft_);
		PROPOSER_ROLE = proposerRole;
		VOTER_ROLE = voterRole;
	}

	function propose(uint256 tokenId, string calldata description, uint64 votingPeriod) external returns (uint256 id) {
		require(votingPeriod > 0, "votingPeriod=0");
		require(nft.hasRole(tokenId, msg.sender, PROPOSER_ROLE), "missing PROPOSER_ROLE");

		id = ++proposalCount;
		proposals[id] = Proposal({
			description: description,
			forVotes: 0,
			againstVotes: 0,
			deadline: uint64(block.timestamp) + votingPeriod,
			executed: false,
			proposer: msg.sender
		});

		emit ProposalCreated(id, msg.sender, description, proposals[id].deadline);
	}

	function vote(uint256 proposalId, uint256 tokenId, bool support) external {
		Proposal storage p = proposals[proposalId];
		require(p.deadline != 0, "proposal not found");
		require(block.timestamp < p.deadline, "voting ended");
		require(!hasVoted[proposalId][msg.sender], "already voted");
		require(nft.hasRole(tokenId, msg.sender, VOTER_ROLE), "missing VOTER_ROLE");

		hasVoted[proposalId][msg.sender] = true;
		if (support) {
			p.forVotes += 1;
		} else {
			p.againstVotes += 1;
		}
		emit Voted(proposalId, msg.sender, support, 1);
	}

	function execute(uint256 proposalId) external {
		Proposal storage p = proposals[proposalId];
		require(p.deadline != 0, "proposal not found");
		require(block.timestamp >= p.deadline, "voting not ended");
		require(!p.executed, "already executed");

		p.executed = true;
		bool passed = p.forVotes > p.againstVotes;
		emit Executed(proposalId, passed);
	}

	function getProposal(uint256 proposalId) external view returns (Proposal memory) {
		return proposals[proposalId];
	}
}
