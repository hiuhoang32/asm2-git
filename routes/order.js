const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");

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
        res.render("order/payment", { tour, user: req.user, peopleCount: req.query.peopleCount || tour.recommendedPeopleCount, pricePerPerson, tourDetails, balance: req.balance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.post("/buy/:id", async (req, res) => {
    res.json(req.body)
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
