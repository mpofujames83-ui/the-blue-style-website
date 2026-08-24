const express = require("express");
const crypto = require("crypto");
const db = require("../database");
const config = require("../config/env");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const validateBody = require("../middleware/validate");

const router = express.Router();
const methods = ["ecocash", "bank_transfer", "card"];
const statuses = ["pending", "successful", "failed", "refunded"];
const reference = () => `TBS-DON-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

router.post("/", validateBody({
    donor_name: { required: true, max: 120 },
    donor_email: { max: 254 },
    amount: { required: true },
    payment_method: { required: true, max: 30 }
}), (req, res, next) => {
    try {
        const amount = Number(req.body.amount);
        const paymentMethod = String(req.body.payment_method).trim().toLowerCase();
        if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) return res.status(400).json({ success: false, message: "Donation amount must be between $1 and $1,000,000" });
        if (!methods.includes(paymentMethod)) return res.status(400).json({ success: false, message: "Unsupported payment method" });
        const donationReference = reference();
        db.prepare(`INSERT INTO donations (reference, donor_name, donor_email, amount, payment_method) VALUES (?, ?, ?, ?, ?)`).run(donationReference, req.body.donor_name.trim(), req.body.donor_email?.trim().toLowerCase() || null, Math.round(amount * 100) / 100, paymentMethod);
        res.status(201).json({ success: true, message: "Donation created and awaiting payment confirmation", donation: { reference: donationReference, amount: Math.round(amount * 100) / 100, currency: "USD", paymentMethod, status: "pending" } });
    } catch (error) { next(error); }
});

router.post("/webhook", (req, res, next) => {
    try {
        if (req.headers["x-payment-webhook-secret"] !== config.paymentWebhookSecret) return res.status(401).json({ success: false, message: "Invalid webhook credentials" });
        const { reference: donationReference, payment_status: paymentStatus, provider_reference: providerReference } = req.body;
        if (!donationReference || !statuses.includes(paymentStatus)) return res.status(400).json({ success: false, message: "Invalid payment confirmation" });
        const confirmedAt = paymentStatus === "successful" ? new Date().toISOString() : null;
        const result = db.prepare(`UPDATE donations SET payment_status = ?, provider_reference = ?, confirmed_at = ? WHERE reference = ?`).run(paymentStatus, providerReference || null, confirmedAt, donationReference);
        if (!result.changes) return res.status(404).json({ success: false, message: "Donation not found" });
        res.json({ success: true, message: "Donation payment status updated" });
    } catch (error) { next(error); }
});

router.use(authenticateToken, adminOnly);
router.get("/overview", (req, res, next) => {
    try {
        const summary = db.prepare(`SELECT COALESCE(SUM(CASE WHEN payment_status = 'successful' THEN amount ELSE 0 END), 0) AS totalDonations, COALESCE(SUM(CASE WHEN payment_status = 'successful' AND date(created_at, 'localtime') = date('now', 'localtime') THEN amount ELSE 0 END), 0) AS donationsToday, COALESCE(SUM(CASE WHEN payment_status = 'successful' AND created_at >= datetime('now', '-29 days') THEN amount ELSE 0 END), 0) AS donationsThisMonth, COUNT(CASE WHEN payment_status = 'successful' THEN 1 END) AS successfulDonations, COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS pendingDonations FROM donations`).get();
        const recent = db.prepare(`SELECT reference, donor_name AS donorName, amount, currency, payment_method AS paymentMethod, payment_status AS status, created_at AS createdAt FROM donations ORDER BY created_at DESC LIMIT 20`).all();
        res.json({ success: true, summary, recent });
    } catch (error) { next(error); }
});

module.exports = router;
