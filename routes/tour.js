const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");
const User = require("../models/User");

// Main page route
router.get("/", async (req, res) => {
    try {
        const tours = await Tour.find();
        res.render("tours/tourList", { tours });
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
        }
        res.render("tours/tourDetail", { tour });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
