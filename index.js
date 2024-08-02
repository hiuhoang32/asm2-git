require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const app = express();
const PORT = 80;

const User = require("./models/User");

// Connect to MongoDB (adjust as per your MongoDB URI)
mongoose
    .connect(
        "mongodb+srv://r3zenix:i3MvACPd9JFrdfi9@main.awegdum.mongodb.net/?retryWrites=true&w=majority&appName=Main",
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    )
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use("/assets", express.static(__dirname + "/public/assets"));
// Middleware
app.use(express.urlencoded({ extended: true }));

const userSession = session({
    name: "user.sid",
    secret: "swintouruser",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl:
            "mongodb+srv://r3zenix:i3MvACPd9JFrdfi9@main.awegdum.mongodb.net/?retryWrites=true&w=majority&appName=Main",
    }),
});

const adminSession = session({
    name: "admin.sid",
    secret: "swintouradmin",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl:
            "mongodb+srv://r3zenix:i3MvACPd9JFrdfi9@main.awegdum.mongodb.net/?retryWrites=true&w=majority&appName=Main",
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
    if (req.session && req.session.username) {
        const user = await User.findOne({ username: req.session.username });
        if (user) {
            req.user = user;
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
const staticRouter = require("./routes/static")

app.use("/", indexRouter);
app.use("/static", staticRouter);
app.use("/tours", tourRouter);
app.use("/admin", adminRouter);
app.use("/user", userRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
