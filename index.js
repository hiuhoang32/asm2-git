require('dotenv').config();

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const app = express();
const PORT = 80;

// Connect to MongoDB (adjust as per your MongoDB URI)
mongoose
    .connect(
        "mongodb+srv://r3zenix:i3MvACPd9JFrdfi9@main.awegdum.mongodb.net/?retryWrites=true&w=majority&appName=Main",
        {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    )
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// Middleware
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
    session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: "mongodb+srv://r3zenix:i3MvACPd9JFrdfi9@main.awegdum.mongodb.net/?retryWrites=true&w=majority&appName=Main",
        }),
    })
);

// Routes
const indexRouter = require("./routes/index");
const adminRouter = require("./routes/admin");

app.use("/tours", indexRouter);
app.use("/admin", adminRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
