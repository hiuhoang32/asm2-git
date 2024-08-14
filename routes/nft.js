const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");
const Flight = require("../models/Flight");
const Hotel = require("../models/Hotel");
const User = require("../models/User");
const { TourNFT, web3 } = require('../handler/crypto');
const tourNFTModel = require('../models/TourNFT');
const fs = require('fs');
const path = require('path');

// Define the path to your JSON file
const filePath = path.resolve(_basedir, 'highBalanceAccounts.json');
const jsonData = fs.readFileSync(filePath, 'utf-8');
const fundingAccounts = JSON.parse(jsonData);

const speakeasy = require("speakeasy");
// Main page route
router.get("/", async (req, res) => {
    return res.redirect("/nft/inventory");
});

router.get("/inventory/", async (req, res) => {
    try {
        const nfts = await tourNFTModel.find({ ownerId: req.user._id });

        const parsedNfts = await parseInventory(nfts);
        
        res.render("nft/inventory", { nfts: parsedNfts, user: req.user, balance: req.balance, usdBalance: req.usdBalance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.get("/marketplace/", async (req, res) => {
    try {
        const nfts = await tourNFTModel.find({ isForSale: true });

        const parsedNfts = await parseInventory(nfts);
        
        res.render("nft/marketplace", { nfts: parsedNfts, user: req.user, balance: req.balance, usdBalance: req.usdBalance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.get("/detail/:id", async (req, res) => {
    if (!req.params.id) return res.redirect("/nft/inventory");
    try {
        const nft = await tourNFTModel.findById(req.params.id);

        const parsedNft = await parseNft(nft.toObject());
        
        res.render("nft/details", { nft: parsedNft, user: req.user, balance: req.balance, usdBalance: req.usdBalance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.get("/sell/:id", async (req, res) => {
    if (!req.params.id) return res.redirect("/nft/inventory");
    try {
        const nft = await tourNFTModel.findById(req.params.id);

        if (req.user._id.toString() !== nft.ownerId) return res.send("Invalid sell URL.");

        if (nft.isForSale) return res.send("You are already selling this tour!");

        nft.isForSale = true;

        await nft.save();

        
        res.redirect(`/nft/detail/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }

});

router.get("/buy/:id", async (req, res) => {
    if (!req.params.id) return res.redirect("/nft/inventory");
    if (!req.user) return res.redirect("/user/login");
    try {
        const nft = await tourNFTModel.findById(req.params.id);

        if (req.user._id.toString() == nft.ownerId) return res.send("Invalid sell URL.");

        if (!nft.isForSale) return res.send("This NFT is not for sale!");

        const parsedNft = await parseNft(nft.toObject());

        res.render("nft/payment", { nft: parsedNft, user: req.user, balance: req.balance, usdBalance: req.usdBalance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }

});

router.post("/buy/:id", async (req, res) => {
    if (!req.params.id) return res.send("Invalid buy URL");
    if (!req.user) return res.redirect("/user/login");

    if (!req.body.verificationCode) return res.send("Invalid buy request.");

    const verify = speakeasy.totp.verify({
        secret: req.user.twoFASecret,
        encoding: "base32",
        token: req.body.verificationCode,
        window: 1
    });

    if (!verify) return res.send(`<p>Invalid verification code</p><br><a href="/nft/buy/${req.params.id}">Go back</a>`);
    try {
        const nft = await tourNFTModel.findById(req.params.id);

        if (req.user._id.toString() == nft.ownerId) return res.send("Invalid buy URL.");

        if (!nft.isForSale) return res.send("This NFT is not for sale!");

        const targetUser = await User.findById(nft.ownerId).catch(() => null);

        const ethPayment = parseFloat(nft.totalEthPrice);
        const weiPayment = web3.toWei(ethPayment, 'ether');

        await web3.personal.unlockAccount(req.user.ethAccount, req.user.passphrase, 200);

        const transaction = await web3.eth.sendTransaction({
            from: req.user.ethAccount,
            to: targetUser?.ethAccount || getRandomElement(fundingAccounts),
            value: weiPayment,
        });

        nft.isForSale = false;
        nft.ownerId = req.user._id.toString();

        await nft.save();

        return res.redirect("/nft/inventory")

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }

});

router.get("/cancel-sell/:id", async (req, res) => {
    if (!req.params.id) return res.redirect("/nft/inventory");
    try {
        const nft = await tourNFTModel.findById(req.params.id);

        if (req.user._id.toString() !== nft.ownerId) return res.send("Invalid sell URL.");

        if (!nft.isForSale) return res.send("You are not selling this tour!");

        nft.isForSale = false;

        await nft.save();

        
        res.redirect(`/nft/detail/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }

});

// router.post("/buy/:id", async (req, res) => {
//     console.log(req.body)
//     if (!req.user) return res.send("You have to login before ordering a tour.");

//     // Get the tour details from the request body
//     const { peopleCount, pricePerPerson, baseTotalPrice, flightNumber, airline, hotel, flightPricePerPerson, totalPriceFlight, hotelPricePerPerson, tourId, totalEthPayment, totalEthPrice, startDate, hotelNumber, verificationCode, totalPriceHotel } = req.body;

//     const verify = speakeasy.totp.verify({
//         secret: req.user.twoFASecret,
//         encoding: "base32",
//         token: verificationCode,
//         window: 1
//     });

//     if (!verify) return res.send(`<p>Invalid verification code</p><br><a href="/order/buy/${tourId}?peopleCount=${peopleCount}">Go back</a>`);

//     if (startDate < parseDate(printDateFromTimestamp(Date.now()))) return res.send(`<p>Invalid start date.</p><br><a href="/order/buy/${tourId}?peopleCount=${peopleCount}">Go back</a>`);


//     // Create a new document in the mongoose schema for flight and hotel
//     const flightBooking = new Flight({
//         flightNumber: flightNumber,
//         airline: airline,
//         flightPricePerPerson: flightPricePerPerson,
//         totalPriceFlight: totalPriceFlight
//     });

//     const hotelBooking = new Hotel({
//         totalPriceHotel: totalPriceHotel,
//         hotel: hotel,
//         hotelNumber: hotelNumber,
//         hotelPricePerPerson: hotelPricePerPerson
//     });

//     const nft = new tourNFTModel({
//         pricePerPerson: pricePerPerson,
//         flightNumber: flightNumber,
//         hotelNumber: hotelNumber,
//         peopleCount: peopleCount,
//         startDate: startDate,
//         totalEthPrice: totalEthPrice,
//         baseTotalPrice: baseTotalPrice,
//         baseTourId: tourId,
//         peopleCount: peopleCount,
//         ownerId: req.user._id
//     });

    
//     // Save the tour, flight, hotel, and NFT documents to the database
//     await flightBooking.save();
//     await hotelBooking.save();
//     await nft.save();

//     // Convert totalEthPayment to number
//     const ethPayment = parseFloat(totalEthPrice);
//     const weiPayment = web3.toWei(ethPayment, 'ether');

//     await web3.personal.unlockAccount(req.user.ethAccount, req.user.passphrase, 200);

//     const tourNFTInstance = await TourNFT.deployed();
//     await tourNFTInstance.createTour.call(weiPayment, tourId, flightBooking._id, hotelBooking._id, req.user.username, startDate, { from: req.user.ethAccount });


//     const fundingAccount = getRandomElement(fundingAccounts);
//     const transaction = await web3.eth.sendTransaction({
//         from: req.user.ethAccount,
//         to: fundingAccount,
//         value: weiPayment,
//     });

//     console.log(transaction)

//     // Return a success message
//     res.send("Tour purchased successfully");
// }); 
async function parseInventory(nfts) {
    for (const nft of nfts) {
        const tourDetails = await Tour.findById(nft.baseTourId);
        nft.tourDetails = tourDetails;

        const userDetails = await User.findById(nft.ownerId);

        nft.userDetails = userDetails;
        nft.startDate = printDateFromTimestamp(nft.startDate);
    }

    return nfts;
}
async function parseNft(nft) {
    const tourDetails = await Tour.findById(nft.baseTourId);
    nft.tourDetails = tourDetails;
    const flightDetails = await Flight.findOne({ flightNumber: nft.flightNumber });
    nft.flightDetails = flightDetails;
    const hotelDetails = await Hotel.findOne({ hotelNumber: nft.hotelNumber });
    nft.hotelDetails = hotelDetails;

    const userDetails = await User.findById(nft.ownerId);

    nft.userDetails = userDetails;
    nft.startDate = printDateFromTimestamp(nft.startDate);

    return nft;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomTourDetails() {
    const airlines = ["Air France", "Emirates", "Qatar Airways", "Cathay Pacific", "Singapore Airlines"];
    const hotels = ["Hilton", "Marriott", "Hyatt", "Holiday Inn", "Four Seasons"];
    
    const flightNumber = "FL" + Math.floor(1000 + Math.random() * 9000);
    const airline = getRandomElement(airlines);
    const hotel = getRandomElement(hotels);
    const hotelNumber = "HOT" + Math.floor(100 + Math.random() * 900);
    
    const flightPricePerPerson = Math.floor(200 + Math.random() * 800);
    const hotelPricePerPerson = Math.floor(50 + Math.random() * 450);

    return {
        flightNumber: flightNumber,
        airline: airline,
        hotel: hotel,
        hotelNumber: hotelNumber,
        flightPricePerPerson: flightPricePerPerson,
        hotelPricePerPerson: hotelPricePerPerson
    };
}

function printDateFromTimestamp(timestamp) {
    // Create a Date object from the timestamp
    const date = new Date(timestamp);

    // Define options for formatting the date
    const options = {
        weekday: 'long', // e.g., Wednesday
        year: 'numeric', // e.g., 2023
        month: 'long',   // e.g., January
        day: 'numeric'   // e.g., 17
    };

    // Format the date as a readable string
    const formattedDate = date.toLocaleDateString('en-US', options);

    // Print the formatted date
    return formattedDate;
}
function parseDate(dateString) {
    const date = new Date(dateString);
    return date.getTime();
}

module.exports = router;
