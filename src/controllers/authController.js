const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Wait for MongoDB connection if it's still connecting
        if (mongoose.connection.readyState === 2) { // 2 = connecting
            console.log("MongoDB is connecting, waiting...");
            await new Promise((resolve) => {
                const checkConnection = () => {
                    if (mongoose.connection.readyState !== 2) {
                        resolve();
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        }

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) { // 1 = connected
            return res.status(503).json({ 
                message: "Database connection not available. Please try again later." 
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username,
                bio: user.bio || "",
                pronouns: user.pronouns || "",
                avatar: user.avatar,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Wait for MongoDB connection if it's still connecting
        if (mongoose.connection.readyState === 2) { // 2 = connecting
            console.log("MongoDB is connecting, waiting...");
            await new Promise((resolve) => {
                const checkConnection = () => {
                    if (mongoose.connection.readyState !== 2) {
                        resolve();
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        }

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) { // 1 = connected
            return res.status(503).json({ 
                message: "Database connection not available. Please try again later." 
            });
        }

        // Find user by email
        const user = await User.findOne({ email }).select("+password");

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username,
                bio: user.bio || "",
                pronouns: user.pronouns || "",
                avatar: user.avatar,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username,
                bio: user.bio || "",
                pronouns: user.pronouns || "",
                avatar: user.avatar,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { displayName, bio, pronouns, avatar } = req.body;

        // Wait for MongoDB connection if it's still connecting
        if (mongoose.connection.readyState === 2) { // 2 = connecting
            console.log("MongoDB is connecting, waiting...");
            await new Promise((resolve) => {
                const checkConnection = () => {
                    if (mongoose.connection.readyState !== 2) {
                        resolve();
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        }

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) { // 1 = connected
            return res.status(503).json({ 
                message: "Database connection not available. Please try again later." 
            });
        }

        const user = await User.findById(req.user.id);

        if (user) {
            user.displayName = displayName || user.displayName;
            user.bio = bio || user.bio;
            user.pronouns = pronouns || user.pronouns;
            user.avatar = avatar || user.avatar;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                displayName: updatedUser.displayName || updatedUser.username,
                bio: updatedUser.bio || "",
                pronouns: updatedUser.pronouns || "",
                avatar: updatedUser.avatar,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
    try {
        const { email, username, avatar } = req.body;

        // Wait for MongoDB connection if it's still connecting
        if (mongoose.connection.readyState === 2) { // 2 = connecting
            console.log("MongoDB is connecting, waiting...");
            await new Promise((resolve) => {
                const checkConnection = () => {
                    if (mongoose.connection.readyState !== 2) {
                        resolve();
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        }

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) { // 1 = connected
            // Fallback mode: Return a mock user response for development
            console.warn("MongoDB not connected, using fallback mode for Google login");
            return res.json({
                _id: "fallback_" + Date.now(),
                username: username || email.split("@")[0],
                email: email,
                displayName: username || email.split("@")[0],
                bio: "",
                pronouns: "",
                avatar: avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
                token: "fallback_token_" + Date.now(),
                fallback: true // Flag to indicate this is a fallback session
            });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create user for Google Login (random password as they'll use Google)
            user = await User.create({
                username: username || email.split("@")[0],
                email,
                avatar: avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
                password: Math.random().toString(36).slice(-10) + Date.now(),
                displayName: username,
            });
        }

        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username,
                bio: user.bio || "",
                pronouns: user.pronouns || "",
                avatar: user.avatar,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error("Google Login Error:", error);
        
        // Provide specific error messages based on the error type
        if (error.name === 'MongoTimeoutError') {
            res.status(503).json({ 
                message: "Database connection timeout. Please try again later." 
            });
        } else if (error.name === 'MongoServerError') {
            res.status(503).json({ 
                message: "Database server error. Please try again later." 
            });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};
