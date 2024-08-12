const mongoose = require("mongoose");

const requiredInteger = {
    type: Number,
    required: true,
};

const requiredString = {
    type: String,
    required: true,
};


const flightSchema = new mongoose.Schema({
    flightPricePerPerson: requiredInteger,
    flightNumber: requiredString,
    airline: requiredString,
    totalPriceFlight: requiredInteger,
});

module.exports = mongoose.model("Flight", flightSchema);
