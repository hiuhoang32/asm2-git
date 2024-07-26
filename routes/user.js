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
        const user = await User.findOne({ username: username });

        if (user) {
            return res.status(200).json({ isTaken: true });
        }

        return res.status(200).json({ isTaken: false });
    } catch (error) {
        console.error('Error checking username:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get("/login", async (req, res) => {
    if (req.session.username && req.session.isUserLoggedIn) {
        return res.redirect("/");
    };
    if (req.session.isLoggedIn) {
        return res.redirect("/");
    };
    res.render("user/login");
});

router.post("/login", async (req, res) => {
    if (req.session.username && req.session.isUserLoggedIn) {
        return res.redirect("/");
    };
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user) {
        const matchPassword = await user.matchPassword(password);
        if (!matchPassword) {
            res.redirect("/user/login");
        } else {
            req.session.username = user.username;
            req.session.isUserLoggedIn = true;
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

router.get("/register", (req, res) => {
    if (req.session.username && req.session.isUserLoggedIn) {
        return res.redirect("/");
    };
    const secret = speakeasy.generateSecret({
        name: req.session.username + "-SwinTours",
    });
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        res.render("user/register", { secret: secret.base32, qrcode: data_url });
    });
});

router.post("/register", async (req, res) => {
    if (req.session.username && req.session.isUserLoggedIn) {
        return res.redirect("/");
    };
    const { username, password1: password, secret, "2fatoken": token } = req.body;

    console.log(req.body);

    let twoFactorEnabled = false;

    if (secret && token) {
        twoFactorEnabled = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token,
        });
    };
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new admin
    const newUser = new User({ username, password: hashedPassword });
    if (twoFactorEnabled) newUser.twoFASecret = secret;
    await newUser.save();
    req.session.username = newUser.username;
    req.session.isUserLoggedIn = true;
    res.redirect("/");
});

router.post("/changeAvatar", upload.array("avatar", 1), async (req, res) => {
    if (!req.session.isUserLoggedIn || !req.session.username) {
        return res.redirect("/user/login");
    };
    if (req.fileValidationError) {
        return res.status(400).send(req.fileValidationError);
    }

    // Handle files and form data
    const images = req.files.map((file) => file.location);
    

    const user = await User.findOneAndUpdate({ username: req.session.username });

    if (!user) {
        return res.redirect("/user/logout");
    }

    user.profilePicture = images[0];

    await user.save();
    res.redirect("/");
});

// // Admin dashboard route
// router.get("/dashboard", async (req, res) => {
//     if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
//         return res.redirect("/admin/login");
//     }
//     try {
//         const tours = await Tour.find();
//         res.render("admin/dashboard", { tours });
//     } catch (err) {
//         res.status(500).send("Error fetching tours");
//     }
// });

// router.get("/add-tour", (req, res) => {
//     if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
//         return res.redirect("/admin/login");
//     }
//     res.render("admin/addTours");
// });

// // Add tour route
// router.post("/add-tour", upload.array("images", 10), async (req, res) => {
//     if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
//         return res.redirect("/admin/login");
//     };

    
//     // Handle any errors from multer's file filter
//     if (req.fileValidationError) {
//         return res.status(400).send(req.fileValidationError);
//     }

//     // Handle files and form data
//     const images = req.files.map((file) => file.location); // Array of URLs to uploaded images

//     const tourPlan = [];
//     Object.keys(req.body).forEach(key => {
//         if (key.startsWith('dayTitle')) {
//             const dayNumber = key.replace('dayTitle', '');
//             tourPlan.push({
//                 dayTitle: req.body[`dayTitle${dayNumber}`],
//                 dayDescription: req.body[`dayDescription${dayNumber}`]
//             });
//         }
//     });



//     const {
//         title,
//         location,
//         duration,
//         peopleCount,
//         price,
//         description,
//         included,
//         excluded
//     } = req.body;

//     const newTour = new Tour({
//         title,
//         location,
//         duration,
//         recommendedPeopleCount: peopleCount,
//         basePrice: price,
//         about: description,
//         included: included.split("\n").filter(x => Boolean(x)).map(x => x.trim()),
//         excluded: excluded.split("\n").filter(x => Boolean(x)).map(x => x.trim()),
//         plan: tourPlan,
//         images,
//     });

//     await newTour.save();
//     res.redirect("/admin/dashboard");
// });

// router.delete('/deleteTour/:id', async (req, res) => {
//     if (!req.session.isAdminLoggedIn || !req.session.is2FAVerified) {
//         return res.redirect("/admin/login");
//     };

//     try {
//         await Tour.findByIdAndDelete(req.params.id);
//         res.status(200).json({ message: 'Tour deleted successfully' });
//     } catch (error) {
//         res.status(500).json({ message: 'Error deleting tour', error });
//     }
// });


module.exports = router;
