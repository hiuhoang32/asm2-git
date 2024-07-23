const express = require("express");
const router = express.Router();
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const bcrypt = require("bcryptjs");

const path = require("path");
const Admin = require("../models/Admin");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const Tour = require("../models/Tour");
const multer = require("multer");
const multerS3 = require("multer-s3");

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
// Load the 2FA secret from the file
const secretFilePath = path.join(__dirname, "../2fa-secret.json");
const secretData = JSON.parse(fs.readFileSync(secretFilePath, "utf8"));
const your2FASecret = secretData.base32;

router.get("/", (req, res) => {
    res.redirect("/admin/login");
});
router.get("/login", async (req, res) => {
    if (req.session.isAdminLoggedIn && req.session.is2FAVerified) {
        return res.redirect("/admin/dashboard");
    };
    res.render("admin/login");
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (admin && (await admin.matchPassword(password))) {
        req.session.adminUsername = admin.username;
        req.session.isAdminLoggedIn = true;

        // Redirect to 2FA setup if not set up, else to 2FA verification
        if (!admin.twoFASecret) {
            res.redirect("/admin/setup2fa");
        } else {
            res.redirect("/admin/verify2fa");
        }
    } else {
        res.redirect("/admin/login");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/admin/login');
        }
        res.clearCookie('connect.sid'); // Assuming you're using the default session cookie name
        res.redirect('/admin/login');
    });
});

router.get("/register", (req, res) => {
    res.render("admin/register");
});

router.post("/register", async (req, res) => {
    const { username, password, token } = req.body;

    // Verify the 2FA code
    const verified = speakeasy.totp.verify({
        secret: your2FASecret,
        encoding: "base32",
        token,
    });

    if (!verified) {
        return res.status(401).send("Invalid 2FA code.");
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new admin
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();

    res.redirect("/admin/dashboard");
});

// 2FA setup route
router.get("/setup2fa", async (req, res) => {
    if (!req.session.isAdminLoggedIn) {
        return res.redirect("/admin/login");
    }

    const secret = speakeasy.generateSecret({
        name: req.session.adminUsername + "asm2",
    });

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        res.render("admin/setup2fa", { secret: secret.base32, qrcode: data_url });
    });
});

router.post("/setup2fa", async (req, res) => {
    if (!req.session.isAdminLoggedIn) {
        return res.redirect("/admin/login");
    };
    const { secret, token } = req.body;
    const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
    });

    if (verified) {
        const admin = await Admin.findOne({ username: req.session.adminUsername });
        admin.twoFASecret = secret;
        await admin.save();
        res.redirect("/admin/dashboard");
    } else {
        res.redirect("/admin/setup2fa");
    }
});

// 2FA verification route
router.get("/verify2fa", (req, res) => {
    res.render("admin/verify2fa");
});

router.post("/verify2fa", async (req, res) => {
    if (!req.session.isAdminLoggedIn) {
        return res.redirect("/admin/login");
    }
    const { token } = req.body;
    const admin = await Admin.findOne({ username: req.session.adminUsername });

    const verified = speakeasy.totp.verify({
        secret: admin.twoFASecret,
        encoding: "base32",
        token,
    });

    if (verified) {
        req.session.is2FAVerified = true;
        res.redirect("/admin/dashboard");
    } else {
        res.redirect("/admin/verify2fa");
    }
});

// Admin dashboard route
router.get("/dashboard", async (req, res) => {
    if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
        return res.redirect("/admin/login");
    }
    try {
        const tours = await Tour.find();
        res.render("admin/dashboard", { tours });
    } catch (err) {
        res.status(500).send("Error fetching tours");
    }
});

router.get("/add-tour", (req, res) => {
    if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
        return res.redirect("/admin/login");
    }
    res.render("admin/addTours");
});

// Add tour route
router.post("/add-tour", upload.array("images", 10), async (req, res) => {
    if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
        return res.redirect("/admin/login");
    };

    
    // Handle any errors from multer's file filter
    if (req.fileValidationError) {
        return res.status(400).send(req.fileValidationError);
    }

    // Handle files and form data
    const images = req.files.map((file) => file.location); // Array of URLs to uploaded images

    const tourPlan = [];
    Object.keys(req.body).forEach(key => {
        if (key.startsWith('dayTitle')) {
            const dayNumber = key.replace('dayTitle', '');
            tourPlan.push({
                dayTitle: req.body[`dayTitle${dayNumber}`],
                dayDescription: req.body[`dayDescription${dayNumber}`]
            });
        }
    });



    const {
        title,
        location,
        duration,
        peopleCount,
        price,
        description,
        included,
        excluded
    } = req.body;

    const newTour = new Tour({
        title,
        location,
        duration,
        recommendedPeopleCount: peopleCount,
        basePrice: price,
        about: description,
        included: included.split("\n").filter(x => Boolean(x)).map(x => x.trim()),
        excluded: excluded.split("\n").filter(x => Boolean(x)).map(x => x.trim()),
        plan: tourPlan,
        images,
    });

    await newTour.save();
    res.redirect("/admin/dashboard");
});

router.delete('/deleteTour/:id', async (req, res) => {
    if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
        return res.redirect("/admin/login");
    };

    try {
        await Tour.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Tour deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting tour', error });
    }
});


module.exports = router;
