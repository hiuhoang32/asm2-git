const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");
const Flight = require("../models/Flight");
const Hotel = require("../models/Hotel");
const TourNFT = require("../models/Tour");
const { TourNFT, web3 } = require('../handler/crypto');
const fundingAccounts = require('../assets/fundingAccounts.json');
const speakeasy = require("speakeasy");
// Main page route
router.get("/", async (req, res) => {
    return res.redirect("/");
});
// Tour details route
router.get("/buy/:id", async (req, res) => {
    
    if (!req.user) return res.send("You have to login before ordering a tour.");
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) {
            return res.send("Tour not found");
        };
        const pricePerPerson = Math.floor(tour.basePrice / (req.query.peopleCount || tour.recommendedPeopleCount));
        const tourDetails = generateRandomTourDetails();
        res.render("order/payment", { tour, user: req.user, peopleCount: req.query.peopleCount || tour.recommendedPeopleCount, pricePerPerson, tourDetails, balance: req.balance, usdBalance: req.usdBalance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.post("/checkFees/", async (req, res) => {
    const { eth, from } = req.body;

    if (!eth || !from) return res.json({});
    
    const transaction = {
        from: from,
        to: getRandomElement(fundingAccounts),
        value: web3.toWei(eth.toString(), 'ether')
    };

    const gasEstimate = await web3.eth.estimateGas(transaction);

    const totalFee = web3.eth.gasPrice * gasEstimate;

    return res.json({ totalFee: web3.fromWei(totalFee, 'ether') });
});


router.post("/buy/:id", async (req, res) => {
    if (!req.user) return res.send("You have to login before ordering a tour.");

    const { totalEthPayment } = req.body;

    // Get the tour details from the request body
    const { flightNumber, airline, hotel, hotelNumber, flightPricePerPerson, hotelPricePerPerson } = req.body;

    // Calculate the total price for flight and hotel
    const totalPriceFlight = flightPricePerPerson * (req.query.peopleCount || 1);
    const totalPriceHotel = hotelPricePerPerson * (req.query.peopleCount || 1);

    // Create a new document in the mongoose schema for flight and hotel
    const flight = new Flight({
        flightNumber: flightNumber,
        airline: airline,
        flightPricePerPerson: flightPricePerPerson,
        totalPriceFlight: totalPriceFlight
    });

    // const hotel = new Hotel({
    //     hotel: hotel,
    //     hotelNumber: hotelNumber,
    //     pricePerPerson: hotelPricePerPerson,
    //     totalPrice: totalPriceHotel
    // });

    // Save the flight and hotel documents to the database
    await flight.save();
    await hotel.save();

    // Perform the tour purchase logic here
    // ...

    // Return a success message
    res.send("Tour purchased successfully");

    // Convert totalEthPayment to number
    const ethPayment = parseFloat(totalEthPayment);

    // Check if totalEthPayment is a valid number
    if (isNaN(ethPayment)) {
        return res.send("Invalid payment amount");
    }

    // Perform the tour purchase logic here
    // ...

    // Return a success message
    res.send("Tour purchased successfully");
}); 

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

module.exports = router;
