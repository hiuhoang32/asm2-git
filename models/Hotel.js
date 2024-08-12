const mongoose = require("mongoose");

const requiredInteger = {
    type: Number,
    required: true,
};

const requiredString = {
    type: String,
    required: true,
};


const hotelSchema = new mongoose.Schema({
    totalPriceHotel: requiredInteger,
    hotel: requiredString,
    hotelNumber: requiredString,
    hotelPricePerPerson: requiredInteger,
});

module.exports = mongoose.model("Hotel", hotelSchema);
