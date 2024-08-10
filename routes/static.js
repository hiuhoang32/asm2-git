const express = require("express");
const router = express.Router();

router.get("/:page", async (req, res) => {
    const page = req.params.page;
    res.render("static/" + page, { user: req.user, balance: req.balance }, (err, html) => {
        if (err) {
            return res.status(404).send("Page not found");
        }
        res.send(html);
    });
});

module.exports = router;
