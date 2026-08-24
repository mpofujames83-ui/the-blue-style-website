const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();


// CONTACT FORM
router.post("/", (req, res) => {

    const {
        name,
        email,
        phone,
        subject,
        message
    } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            message: "Name, email and message are required"
        });
    }

    db.prepare(`
        INSERT INTO contact_messages
        (name, email, phone, subject, message)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        name,
        email,
        phone || "",
        subject || "",
        message
    );

    res.status(201).json({
        message: "Message sent successfully"
    });
});


// ADMIN CONTACT MESSAGES
router.get(
    "/",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const messages = db.prepare(`
            SELECT *
            FROM contact_messages
            ORDER BY created_at DESC
        `).all();

        res.json(messages);
    }
);


module.exports = router;