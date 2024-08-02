const express = require("express");
const router = express.Router();

const Tour = require("../models/Tour");

router.get('/', async (req, res) => {
    const tours = await Tour.find();
    res.render('index.ejs', { user: req.user, tours });
});

module.exports = router;
