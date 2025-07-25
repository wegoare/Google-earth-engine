const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Not required for Google accounts
    googleId: { type: String }, // Optional, used only for Google sign-in
    photoURL: { type: String }, // Optional, useful for displaying profile image
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
