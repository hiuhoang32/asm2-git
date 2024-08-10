const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");

// Main page route
router.get("/", async (req, res) => {
    try {
        const tours = await Tour.find();
        tours.forEach(tour => {
            tour.pricePerPerson = Math.floor(tour.basePrice / tour.recommendedPeopleCount)
        });
        res.render("tours/tourList", { tours, user: req.user, balance: req.balance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});



router.get("/detail/", async (req, res) => {
    res.redirect("/tours"); 
});

// Tour details route
router.get("/detail/:id", async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) {
            return res.status(404).send("Tour not found");
        };
        const pricePerPerson = Math.floor(tour.basePrice / (tour.recommendedPeopleCount));
        res.render("tours/tourDetail", { tour, user: req.user, pricePerPerson, balance: req.balance });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
