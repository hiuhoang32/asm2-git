const mongoose = require("mongoose");

const tourSchema = new mongoose.Schema({
    title: String,
    location: String,
    duration: String,
    recommendedPeopleCount: Number,
    basePrice: Number,
    about: String,
    included: [String],
    excluded: [String],
    plan: [
        {
            dayTitle: String,
            dayDescription: String,
        },
    ],
    images: [String], // Array of image URLs
});

module.exports = mongoose.model("Tour", tourSchema);
