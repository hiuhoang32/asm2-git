const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.get('/:page', async (req, res) => {
    if (req.session.username && req.session.isUserLoggedIn) {
    };
    const page = req.params.page;
    res.render(page, (err, html) => {
        if (err) {
            return res.status(404).send('Page not found');
        }
        res.send(html);
    });
});

module.exports = router;
