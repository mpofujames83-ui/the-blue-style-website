const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database");

const router = express.Router();


// REGISTER
router.post("/register", async (req, res) => {

    try {

        const {
            full_name,
            email,
            phone,
            password
        } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                message: "Full name, email and password are required"
            });
        }

        const existingUser = db.prepare(
            "SELECT id FROM users WHERE email = ?"
        ).get(email);

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        const result = db.prepare(`
            INSERT INTO users
            (full_name, email, phone, password, role)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            full_name,
            email,
            phone || "",
            hashedPassword,
            "customer"
        );

        res.status(201).json({
            message: "Account created successfully",
            userId: result.lastInsertRowid
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// LOGIN
router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = db.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).get(email);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login successful",

            token,

            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;