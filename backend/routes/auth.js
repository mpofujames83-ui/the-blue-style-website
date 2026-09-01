const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database");
const config = require("../config/env");
const validateBody = require("../middleware/validate");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// REGISTER
async function registerUser(req, res) {
    try {
        const { full_name, email, phone, password } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
        if (existingUser) return res.status(409).json({ success: false, message: "Email already registered" });
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = db.prepare("INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)").run(full_name.trim(), normalizedEmail, phone || "", hashedPassword, "customer");
        const user = { id: Number(result.lastInsertRowid), full_name: full_name.trim(), email: normalizedEmail, phone: phone || "", role: "customer" };
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
        res.status(201).json({ success: true, message: "Account created successfully", token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const registrationValidation = validateBody({
    full_name: { required: true, max: 120 },
    email: { required: true, max: 254 },
    password: { required: true, max: 128 }
});

router.post("/register", registrationValidation, registerUser);
router.post("/signup", registrationValidation, registerUser);

router.get("/me", authenticateToken, (req, res) => {
    const user = db.prepare("SELECT id, full_name, email, phone, role, created_at, last_login FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
});

router.post("/logout", authenticateToken, (req, res) => {
    res.json({ success: true, message: "Session ended. Remove the client token to complete logout." });
});

router.get("/google", (req, res) => res.status(503).json({ success: false, message: "Google OAuth is not configured. Add provider credentials before enabling it." }));
router.get("/facebook", (req, res) => res.status(503).json({ success: false, message: "Facebook OAuth is not configured. Add provider credentials before enabling it." }));

/* Legacy registration implementation retained below for compatibility context. */
router.post("/register-legacy", validateBody({
    full_name: { required: true, max: 120 },
    email: { required: true, max: 254 },
    password: { required: true, max: 128 }
}), async (req, res) => {

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

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = db.prepare(
            "SELECT id FROM users WHERE email = ?"
        ).get(normalizedEmail);

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
            full_name.trim(),
            normalizedEmail,
            phone || "",
            hashedPassword,
            "customer"
        );

        const user = {
            id: Number(result.lastInsertRowid),
            full_name: full_name.trim(),
            email: normalizedEmail,
            phone: phone || "",
            role: "customer"
        };
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// LOGIN
router.post("/login", validateBody({
    email: { required: true, max: 254 },
    password: { required: true, max: 128 }
}), async (req, res) => {

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
        ).get(email.trim().toLowerCase());

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

        db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            config.jwtSecret,
            {
                expiresIn: config.jwtExpiresIn
            }
        );

        try {
            db.prepare("CREATE TABLE IF NOT EXISTS admin_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, details TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
            if (user.role === "admin") {
                db.prepare("INSERT INTO admin_activity (user_id, action, details) VALUES (?, ?, ?)").run(user.id, "Login", "Administrator signed in");
            }
        } catch (activityError) {
            console.error("Could not record login activity", activityError);
        }

        res.json({
            message: "Login successful",

            token,

            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                last_login: new Date().toISOString()
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