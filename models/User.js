const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: {
        type: String,
        default: "/assets/images/default/avatar.webp",
    },
    twoFASecret: { type: String, required: true },
    changePassToken: { type: String },
    expireDateChangePass: { type: Number },
    ethAccount: { type: String, required: true },
    passphrase: { type: String, required: true }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
