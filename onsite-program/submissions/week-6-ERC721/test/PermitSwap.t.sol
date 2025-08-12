// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "forge-std/console2.sol";              // <── 1. import console
import "../src/PermitSwap.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./mocks/ERC20Mock.sol";

contract PermitSwapTest is Test {
    using ECDSA for bytes32;

    PermitSwap public permitSwap;
    ERC20 public token;
    address public user;
    uint256 private userPrivateKey;

    ISignatureTransfer.PermitTransferFrom permit;
    bytes signature;

    function setUp() public {
        userPrivateKey = 0xA11CE;
        user = vm.addr(userPrivateKey);

        token = new ERC20Mock("MockToken", "MTK", user, 1000 ether);
        permitSwap = new PermitSwap(
            0x000000000022D473030F116dDEE9F6B43aC78BA3,
            0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
        );

        permit = ISignatureTransfer.PermitTransferFrom({
            permitted: ISignatureTransfer.TokenPermissions({
                token: address(token),
                amount: 1 ether
            }),
            nonce: 1,
            deadline: block.timestamp + 3600
        });

        signature = signPermit(userPrivateKey, permit);
    }

    function signPermit(
        uint256 pk,
        ISignatureTransfer.PermitTransferFrom memory _permit
    ) internal view returns (bytes memory) {
        bytes32 DOMAIN_SEPARATOR = getDomainSeparator();
        bytes32 structHash   = getStructHash(_permit);
        bytes32 digest       = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function testPermitSignatureValid() public view {
        address recovered = keccak256(
            abi.encodePacked("\x19\x01", getDomainSeparator(), getStructHash(permit))
        ).recover(signature);

        // <── 2. log the addresses
        console2.log("Recovered signer:", recovered);
        console2.log("Expected user:   ", user);

        assertEq(recovered, user, "Signature should be valid");
    }

    function getDomainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("PermitSwap")),
                keccak256(bytes("1")),
                block.chainid,
                address(permitSwap)
            )
        );
    }

    function getStructHash(
        ISignatureTransfer.PermitTransferFrom memory _permit
    ) internal pure returns (bytes32) {
        bytes32 PERMIT_TYPEHASH = keccak256(
            "PermitTransferFrom(address token,uint256 amount,uint256 nonce,uint256 deadline)"
        );

        return keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                _permit.permitted.token,
                _permit.permitted.amount,
                _permit.nonce,
                _permit.deadline
            )
        );
    }
}