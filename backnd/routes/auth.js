const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/users"); // Create this model
const router = express.Router();

// Secret key for JWT
const JWT_SECRET = "your_secret_key";

// Signup Route
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, user: { id: user.id, name, email } });

    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// Signin Route
router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT Token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "Login successful", user, token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Google Signin / Save User
router.post("/google-auth", async (req, res) => {
    try {
        const { uid, email, name, photoURL } = req.body;

        let user = await User.findOne({ email });

        if (!user) {
            // New user - create entry
            user = new User({ name, email, googleId: uid, photoURL });
            await user.save();
        }

        // Create token for session
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "Google Auth successful", user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Google Auth failed", error: error.message });
    }
});

module.exports = router;
