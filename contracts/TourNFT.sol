pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "./ERC721Full.sol";

contract TourNFT is ERC721Full {
    uint256 public nextTokenId;

    struct Tour {
        uint256 price;
        string baseTourID;
        string flightTicketId;
        string hotelBookingId;
        string usernameOwner;
        uint256 startDay;
        bool isForSale;
    }

    mapping(uint256 => Tour) public tours;
    mapping(address => uint256) public balances; // Track user balances

    constructor() ERC721Full("TourNFT", "TNFT") public {
    }

    // Function to create a new tour NFT
    function createTour(
        uint256 price,
        string memory baseTourID,
        string memory flightTicketId,
        string memory hotelBookingId,
        string memory usernameOwner,
        uint256 startDay
    ) public {
        uint256 tokenId = nextTokenId;
        tours[tokenId] = Tour(price, baseTourID, flightTicketId, hotelBookingId, usernameOwner, startDay, true);
        _mint(msg.sender, tokenId);
        nextTokenId++;
    }

    // Function to buy a tour
    function buyTour(uint256 tokenId) public {
        require(tours[tokenId].isForSale, "Tour is not for sale");
        tours[tokenId].isForSale = false;
        tours[tokenId].usernameOwner = "";
        safeTransferFrom(ownerOf(tokenId), msg.sender, tokenId);
    }

    // Function to get tour details
    function getTour(uint256 tokenId) public view returns (Tour memory) {
        return tours[tokenId];
    }

    // Function to set tour for sale
    function setTourForSale(uint256 tokenId, bool isForSale) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can set for sale");
        tours[tokenId].isForSale = isForSale;
    }

    // Function to manually add balance to the user's account
    function addBalance(uint256 amount) public {
        balances[msg.sender] += amount;
    }

    // Function to get the balance of the user
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}
