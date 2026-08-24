const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();


// MY PROFILE
router.get(
    "/me",
    authenticateToken,
    (req, res) => {

        const user = db.prepare(`
            SELECT id, full_name, email, phone, role, created_at
            FROM users
            WHERE id = ?
        `).get(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(user);
    }
);


// ALL USERS - ADMIN
router.get(
    "/",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const users = db.prepare(`
            SELECT
                id,
                full_name,
                email,
                phone,
                role,
                created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        res.json(users);
    }
);

module.exports = router;