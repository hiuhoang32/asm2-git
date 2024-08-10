const express = require("express");
const router = express.Router();
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("../models/User");
const { S3Client } = require("@aws-sdk/client-s3");
// const Tour = require("../models/Tour");
const multer = require("multer");
const multerS3 = require("multer-s3");
const crypto = require('crypto');

const { TourNFT, web3 } = require('../handler/crypto');

function isImage(file) {
    const validMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ];
    return validMimeTypes.includes(file.mimetype);
}

function initS3Upload() {
    const s3 = new S3Client(
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                  region: "ap-southeast-1",
                  credentials: {
                      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                  },
              }
            : { region: "ap-southeast-1" }
    );

    const upload = multer({
        fileFilter: (req, file, cb) => {
            if (isImage(file)) {
                cb(null, true);
            } else {
                cb(new Error("Invalid file type. Only images are allowed."));
            }
        },
        storage: multerS3({
            s3: s3,
            bucket: "asm2-cos30041",
            key: function (req, file, cb) {
                cb(
                    null,
                    Date.now().toString() + path.extname(file.originalname)
                ); // Use Date.now() for unique file keys
            },
        }),
    });
    return upload;
}

const upload = initS3Upload();


router.get("/", (req, res) => {
    res.redirect("/user/login");
});

router.get('/checkUsername/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) return res.status(404).json({ error: true });
        const user = await User.findOne({ username: username });

        if (user) {
            return res.status(200).json({ isTaken: true, twoFactorEnabled: Boolean(user.twoFASecret) });
        }

        return res.status(200).json({ isTaken: false });
    } catch (error) {
        console.error('Error checking username:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get("/login", async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    res.render("user/login");
});

router.get("/forgot-pass", async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    res.render("user/forgot-pass");
});

router.post("/forgot-pass", async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };

    res.redirect(`/user/verification?username=${req.body.username}`);
});

router.get('/verification', async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const { username } = req.query;
    if (!username) return res.redirect("/");
    const userExist = await User.findOne({ username: username });

    
    if (!userExist) {
        return res.redirect("/");
    } 

    if (!userExist.twoFASecret) return res.send("User has no 2FA method");

    res.render("user/verification", { username });

    // res.json(req.body);
});

router.post('/verification', async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const { username, code } = req.body;
    const userExist = await User.findOne({ username: username });

    if (!userExist) {
        return res.redirect("/");
    }

    if (!userExist.twoFASecret) return res.redirect("/");

    const verified = speakeasy.totp.verify({
        secret: userExist.twoFASecret,
        encoding: "base32",
        token: code,
    });

    if (verified) {
        const changePassToken = crypto.randomBytes(32).toString('hex');
        userExist.changePassToken = changePassToken;
        userExist.expireDateChangePass = Date.now() + 900000;
        await userExist.save();
        return res.redirect(`/user/new-password?token=${changePassToken}`);
    } else {
        res.send("Wrong 2FA code. Please go back and correct it.");
    }
});

router.get('/new-password', async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const { token } = req.query;
    if (!token) return res.redirect("/");

    const userExist = await User.findOne({ changePassToken: token });

    if (!userExist) {
        return res.redirect("/");
    };

    if (!userExist.expireDateChangePass || userExist.expireDateChangePass < Date.now()) return res.send("Incorrect or expired change password link.");

    res.render("user/new-password", { changePassToken: userExist.changePassToken });

    // res.json(req.body);
});

router.post('/new-password', async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const { changePassToken, txtPasswordLogin2 } = req.body;
    if (!changePassToken) return res.redirect("/");

    const userExist = await User.findOne({ changePassToken });

    if (!userExist) {
        return res.redirect("/");
    };

    if (!userExist.expireDateChangePass || userExist.expireDateChangePass < Date.now()) return res.send("Incorrect or expired change password link.");

    if (!userExist.twoFASecret) return res.redirect("/");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(txtPasswordLogin2, salt);

    userExist.password = hashedPassword; 
    userExist.changePassToken = null;

    await userExist.save();

    return res.send('<p>User password changed successfully.</p><br><a href="/">Home</a>');

    // res.json(req.body);
});

router.get("/deposit/:id", async (req, res) => {
    if (!req.user) {
        return res.redirect("/");
    };
    const { id } = req.params;
    if (!id) return res.redirect("/");
    if (id !== req.user._id.toString()) return res.send('<p>Invalid deposit link.</p><br><a href="/">Home</a>');

    return res.render('user/deposit.ejs', { user: req.user, balance: req.balance });

    // res.json(req.body);
})

router.post("/deposit/:id", async (req, res) => {
    if (!req.user || !req.body) {
        return res.redirect("/");
    };
    const { id } = req.params;
    if (!id) return res.redirect("/");
    if (id !== req.user._id.toString()) return res.send('<p>Invalid deposit link.</p><br><a href="/">Home</a>');

    const { amount } = req.body;

    if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) return res.send(`<p>Invalid deposit amount.</p><br><a href="/deposit/${id}">Go back</a>`);

    const tourNFTInstance = await TourNFT.deployed();
    
    await tourNFTInstance.addBalance(amount, { from: userAddress });

    return res.render('user/deposit.ejs', { user: req.user, balance: req.balance });

    // res.json(req.body);
})



router.post("/login", async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user) {
        const matchPassword = await user.matchPassword(password);
        if (!matchPassword) {
            res.redirect("/user/login");
        } else {
            req.session.userId = user._id;
            res.redirect("/");
        };

    } else {
        res.redirect("/user/login");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('user.sid'); // Assuming you're using the default session cookie name
        res.redirect('/');
    });
});

router.post("/check2fa", (req, res) => {
    const { secret, token } = req.body;

    if (!secret || !token) {
        return res.json({ verify: false });
    };
    const verify = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
    });
    return res.json({ verify, secret, token });
});

router.get("/register", (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const secret = speakeasy.generateSecret({
        name: `SwinTours-${Date.now()}`,
    });
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        res.render("user/register", { secret: secret.base32, qrcode: data_url });
    });
});


router.post("/register", async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    };
    const { username, password1: password, secret, "2fatoken": token } = req.body;

    if (!username || !password || !secret || !token) {
        return res.send("Missing input. Please fill in all fields.");
    }

    const verify = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
    });

    if (!verify) {
        return res.send("Invalid 2FA token. Please go back and try again.");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new admin
    const account = await web3.eth.personal.newAccount('');

    const newUser = new User({ username, password: hashedPassword, ethAccount: account, twoFASecret: secret });
    await newUser.save();
    req.session.userId = newUser._id;
    res.redirect("/");
});

router.post("/changeAvatar", upload.array("avatar", 1), async (req, res) => {
    if (!req.user) {
        return res.redirect("/user/login");
    };
    if (req.fileValidationError) {
        return res.status(400).send(req.fileValidationError);
    }

    // Handle files and form data
    const images = req.files.map((file) => file.location);

    req.user.profilePicture = images[0];

    await req.user.save();
    res.redirect("/");
});

module.exports = router;
