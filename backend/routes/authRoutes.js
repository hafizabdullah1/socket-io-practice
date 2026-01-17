import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

const generateToken = (id, username) => {
    return jwt.sign({ id, username }, "myjwtsecret" || "fallbackSecret", {
        expiresIn: "30d",
    });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
router.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please add all fields" });
    }

    // Check if user exists
    const userExists = await User.findOne({ username });

    if (userExists) {
        return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        username,
        password: hashedPassword,
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id, username),
        });
    } else {
        res.status(400).json({ message: "Invalid user data" });
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Check for user email
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id, username),
        });
    } else {
        res.status(400).json({ message: "Invalid credentials" });
    }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Public (for now)
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
