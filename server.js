require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const app = express();
const PORT = process.env.PORT || 80;

const { TourNFT } = require('./handler/crypto');

const User = require("./models/User");

mongoose
    .connect(
        process.env.MONGO_URL,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    )
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use("/assets", express.static(__dirname + "/public/assets"));
app.use(express.urlencoded({ extended: true }));


const userSession = session({
    name: "user.sid",
    secret: "swintouruser",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL
    }),
});

const adminSession = session({
    name: "admin.sid",
    secret: "swintouradmin",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL
    }),
});

app.use((req, res, next) => {
    if (req.path.startsWith("/admin")) {
        return next();
    }
    userSession(req, res, next);
});
app.use("/admin", adminSession);

const userMiddleware = async (req, res, next) => {
    if (req.session && req.session.userId) {
        const user = await User.findById(req.session.userId);
        if (user) {
            req.user = user;
            const tourNFTInstance = await TourNFT.deployed();
            const balance = await tourNFTInstance.getBalance({ from: user.ethAccount });
            req.balance = balance;
        };
    };
    next();
};

app.use(userMiddleware);

// Routes
const indexRouter = require("./routes/index");
const tourRouter = require("./routes/tour");
const adminRouter = require("./routes/admin");
const userRouter = require("./routes/user");
const orderRouter = require("./routes/order");
const staticRouter = require("./routes/static");

app.use("/", indexRouter);
app.use("/static", staticRouter);
app.use("/tours", tourRouter);
app.use("/admin", adminRouter);
app.use("/user", userRouter);
app.use("/order", orderRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
