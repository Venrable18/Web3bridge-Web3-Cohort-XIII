// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./TicketNFT.sol";
import "./src/TicketToken.sol";

contract EventTicket {

error TotalTicketsMustBeGreaterThanZero();
error TicketPriceMustBeGreaterThanZero();
error TicketEndDateMustBeInFuture();
error IncorrectCreatedFeeSent();
error  InvalidNUmberOfTickets();
error  IncorrectAmountSent();
    struct TicketInfo {
        uint tokenId;
        uint totalTickets;
        uint ticketsSold;
        uint ticketPrice;
        uint ticketStartDate;
        uint ticketEndDate;
        address creator;
        bool ticketSold;
        string eventName;
    }


    struct PurchaseInfo {
        address buyer;
        uint ticketsBought;
        uint totalPrice;
        uint ticketId;
        uint purchaseId;
        uint purchaseTimeStamp;
    }

    uint public creationFeePercentage;
    uint public purchaseFeePercentage;
    address public owner;

    contructor() {
        owner = msg.sender;
    }

    mapping(uint => TicketInfo) public tickets;
    mapping(address => uint[]) public userTickets;
    mapping(uint => purchaseInfo[]) public ticketPurchases;

    uint private tokenIdCounter;

    event TicketCreated(
        uint indexed tokenId,
        uint totalTickets,
        uint ticketPrice,
        uint ticketStartdate,
        uint ticketStartDate
    );

    event TicketPurchased(
        uint indexed tokenId,
        address buyer,
        uint ticketsBought
    );

 function createTicket(string calldata tokenURI, uint _totalTickets, uint _ticketPrice, uint _ticketEndDate, string calldata _eventName, eventSize) external payable {
        if (_totalTickets == 0) revert TotalTicketsMustBeGreaterThanZero();
        if (_ticketPrice == 0) revert TicketPriceMustBeGreaterThanZero();
        if (_ticketEndDate <= block.timestamp) revert TicketEndDateMustBeInFuture();

        tokenIdCounter = tokenIdCounter + 1;

        
        TicketNFT.mintNFT(msg.sender, tokenURI);
        uint timeStartDate = block.timestamp;

        tickets[tokenIdCounter] = TicketInfo({
         tokenId: tokenIdCounter,
         totalTickets: _totalTicket,
         ticketsSold: 0,
         ticketPrice: _ticketPrice, 
         ticketStartDate: timeStartDate,
         ticketEndDate: _ticketEndDate,
         creator: msg.sender,
         ticketSold: false,
         eventName: _eventName;
        });

uint creationFee = creationFeePercentage;
if(msg.value != creationFee) {
    revert error IncorrectCreatedFeeSent();
}
payable(owner).transfer(creationFee);
}


function purchaseTicket(uint _eventId, uint _ticketsToBuy, string memory _tokenURI) external payable {
    TicketInfo storage ticket = tickets[_eventId];
    if(ticket.ticketSold + _ticketsToBuy > ticket.totalTickets) revert InvalidNUmberOfTickets();
   uint totalPrice = ticket.ticketPrice * _ticketsToBuy;
   uint totalPriceWithFee = totalPrice + purchaseFeePercentage;

   if(msg.value != totalPriceWithFee) revert IncorrectAmountSent();
   payable(ticket.creator).transfer(totalPrice);
   payable(owner).transfer(purchaseFeePercentage);

   for(uint i = 0; i<_ticketsToBuy; i++) {
    uint newTokenId = ticketNFT.mintNFT(msg.sender, _tokenURI);
  ticketPurchases[_eventId].push(purchaseInfo({
        buyer: msg.sender,
         ticketsBought: 1,
         totalPrice: ticket.ticketPrice,
         ticketId: _eventId,
         purchaseId: newTokenId,
         purchaseTimeStamp: block.timestamp
  }));
  ticket.ticketSold++
   }
}

function getUserTickets(address _user) external view returns (uint memory) {
    return userTickets[_user];
}

function getUserTicketInfo(uint _tokenID) external view returns (TicktInfo memory) {
    return tickets[_tokenID]
}

function getPurchasesInfo(uint _tokenID) external view returns (BuyerInfo[] memory) {
    return ticketPurchases[_tokenID]
}

};