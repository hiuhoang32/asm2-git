const mongoose = require("mongoose");

const requiredInteger = {
    type: Number,
    required: true,
};

const requiredString = {
    type: String,
    required: true,
};


const Schema = new mongoose.Schema({
    pricePerPerson: requiredInteger,
    peopleCount: requiredInteger,
    flightNumber: requiredString,
    hotelNumber: requiredString,
    peopleCount: requiredInteger,
    startDate: requiredInteger,
    totalEthPrice: requiredInteger,
    baseTotalPrice: requiredInteger,
    baseTourId: requiredString,
    isForSale: {
        type: Boolean,
        default: false,
    },
    ownerId: requiredString
});

module.exports = mongoose.model("TourNFT", Schema);
