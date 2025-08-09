// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {EventTicket} from "../src/EventTicketing.sol";
import {TicketNft} from "../src/TicketNFT.sol";

contract EventTicketTest is Test {
    EventTicket public evt;
    TicketNft public nft;

    address public creator = address(this);
    address public buyer = address(0xBEEF);

    function setUp() public {
        nft = new TicketNft();
        evt = new EventTicket(address(nft));
        // Keep fees zero by default; can set with evt.setFees(...)
    }

    function test_CreateTicket_Success() public {
        uint256 endDate = block.timestamp + 2 days;

        vm.expectEmit(true, false, false, true);
        emit EventTicket.TicketCreated(1, 5, 1 ether, block.timestamp, endDate, "Concert", creator);

        evt.createTicket("ipfs://event", 5, 1 ether, endDate, "Concert");

        EventTicket.TicketInfo memory info = evt.getUserTicketInfo(1);
        assertEq(info.tokenId, 1);
        assertEq(info.totalTickets, 5);
        assertEq(info.ticketsSold, 0);
        assertEq(info.ticketPrice, 1 ether);
        assertEq(info.ticketEndDate, endDate);
        assertEq(info.creator, creator);
        assertEq(info.soldOut, false);
    }

    function test_CreateTicket_Revert_ZeroTickets() public {
        uint256 endDate = block.timestamp + 1 days;
        vm.expectRevert(EventTicket.TotalTicketsMustBeGreaterThanZero.selector);
        evt.createTicket("ipfs://event", 0, 1 ether, endDate, "Concert");
    }

    function test_CreateTicket_Revert_ZeroPrice() public {
        uint256 endDate = block.timestamp + 1 days;
        vm.expectRevert(EventTicket.TicketPriceMustBeGreaterThanZero.selector);
        evt.createTicket("ipfs://event", 5, 0, endDate, "Concert");
    }

    function test_CreateTicket_Revert_PastEnd() public {
        uint256 endDate = block.timestamp - 1;
        vm.expectRevert(EventTicket.TicketEndDateMustBeInFuture.selector);
        evt.createTicket("ipfs://event", 5, 1 ether, endDate, "Concert");
    }

    function test_Purchase_Success_MintsAndPays() public {
        uint256 endDate = block.timestamp + 1 days;
        evt.createTicket("ipfs://event", 3, 1 ether, endDate, "Show");

        // Fund buyer and purchase 2 tickets
        vm.deal(buyer, 10 ether);
        uint256 creatorBefore = creator.balance;
        uint256 ownerBefore = evt.owner().balance;

        vm.prank(buyer);
        evt.purchaseTicket{value: 2 ether}(1, 2, "ipfs://ticket");

        // Creator received 2 ether; owner received 0 (fee zero)
        assertEq(creator.balance, creatorBefore + 2 ether);
        assertEq(evt.owner().balance, ownerBefore);

        // NFT balance and storage checks
        assertEq(nft.balanceOf(buyer), 2);

        EventTicket.TicketInfo memory info = evt.getUserTicketInfo(1);
        assertEq(info.ticketsSold, 2);
        assertEq(info.soldOut, false);

        EventTicket.PurchaseInfo[] memory purchases = evt.getPurchasesInfo(1);
        assertEq(purchases.length, 2);
        assertEq(purchases[0].buyer, buyer);
        assertEq(purchases[1].buyer, buyer);

        uint256[] memory userTix = evt.getUserTickets(buyer);
        assertEq(userTix.length, 2);
    }

    function test_Purchase_Revert_TooMany() public {
        uint256 endDate = block.timestamp + 1 days;
        evt.createTicket("ipfs://event", 1, 1 ether, endDate, "OneSeat");

        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        evt.purchaseTicket{value: 1 ether}(1, 1, "ipfs://ticket");

        // Attempt to buy second ticket
        vm.prank(buyer);
        vm.expectRevert(EventTicket.InvalidNumberOfTickets.selector);
        evt.purchaseTicket{value: 1 ether}(1, 1, "ipfs://ticket");
    }

    function test_Purchase_Revert_WrongAmount() public {
        uint256 endDate = block.timestamp + 1 days;
        evt.createTicket("ipfs://event", 2, 1 ether, endDate, "BadPay");

        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        vm.expectRevert(EventTicket.IncorrectAmountSent.selector);
        evt.purchaseTicket{value: 1.5 ether}(1, 2, "ipfs://ticket"); // should be 2 ether
    }

    function test_Fees_Work_When_Set() public {
        evt.setFees(0.1 ether, 0.05 ether);

        uint256 endDate = block.timestamp + 1 days;

        // Must pay creation fee
        vm.expectRevert(EventTicket.IncorrectCreationFeeSent.selector);
        evt.createTicket("ipfs://event", 2, 1 ether, endDate, "FeeEvent");

        evt.createTicket{value: 0.1 ether}("ipfs://event", 2, 1 ether, endDate, "FeeEvent");

        // Purchase with fee
        vm.deal(buyer, 10 ether);
        uint256 creatorBefore = creator.balance;
        address ownerAddr = evt.owner();
        uint256 ownerBefore = ownerAddr.balance;

        vm.prank(buyer);
        evt.purchaseTicket{value: 1 ether + 0.05 ether}(1, 1, "ipfs://ticket");

        assertEq(creator.balance, creatorBefore + 1 ether);
        assertEq(ownerAddr.balance, ownerBefore + 0.05 ether);
    }
}
