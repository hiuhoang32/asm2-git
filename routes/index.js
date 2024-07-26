const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.get('/', async (req, res) => {
    let user;
    if (req.session.username && req.session.isUserLoggedIn) {
        user = await User.findOne({ username: req.session.username });
    };
    res.render('index.ejs', { user });
});

module.exports = router;
