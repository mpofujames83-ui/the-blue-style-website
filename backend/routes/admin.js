const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../database");
const config = require("../config/env");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const validateBody = require("../middleware/validate");

const router = express.Router();
const primaryOnly = (req, res, next) => {
    if (req.user.email !== config.primaryAdminEmail) return res.status(403).json({ success: false, message: "Primary administrator access required" });
    next();
};
const logActivity = (userId, action, details = "") => db.prepare("INSERT INTO admin_activity (user_id, action, details) VALUES (?, ?, ?)").run(userId, action, details);
const publicUser = user => ({ id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at });

router.post("/invitations/accept", validateBody({ token: { required: true, max: 200 }, password: { required: true, max: 128 }, name: { required: true, max: 120 } }), async (req, res, next) => {
    try {
        const tokenHash = crypto.createHash("sha256").update(req.body.token).digest("hex");
        const invitation = db.prepare("SELECT * FROM admin_invitations WHERE token_hash = ? AND status = 'pending' AND expires_at > datetime('now')").get(tokenHash);
        if (!invitation) return res.status(400).json({ success: false, message: "Invitation is invalid or expired" });
        const email = invitation.email.toLowerCase();
        if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return res.status(409).json({ success: false, message: "An account already exists for this email" });
        const passwordHash = await bcrypt.hash(req.body.password, 12);
        const user = db.prepare("INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)").run(req.body.name.trim(), email, invitation.phone || "", passwordHash, invitation.role);
        db.prepare("UPDATE admin_invitations SET status = 'accepted', accepted_user_id = ? WHERE id = ?").run(user.lastInsertRowid, invitation.id);
        res.status(201).json({ success: true, message: "Administrator account created" });
    } catch (error) { next(error); }
});

router.use(authenticateToken, adminOnly);
router.get("/profile", (req, res, next) => { try { const user = db.prepare("SELECT id, full_name, email, phone, role, profile_photo, last_login, created_at FROM users WHERE id = ?").get(req.user.id); if (!user) return res.status(404).json({ success: false, message: "Admin profile not found" }); res.json({ success: true, profile: { ...publicUser(user), status: "Active", profile_photo: user.profile_photo || null, last_login: user.last_login || null } }); } catch (error) { next(error); } });
router.put("/profile", validateBody({ full_name: { required: true, max: 120 }, email: { required: true, max: 254 }, phone: { max: 40 }, profile_photo: { max: 500 } }), (req, res, next) => { try { const email = req.body.email.trim().toLowerCase(); const result = db.prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, profile_photo = ? WHERE id = ? AND role = 'admin'").run(req.body.full_name.trim(), email, req.body.phone?.trim() || "", req.body.profile_photo?.trim() || null, req.user.id); if (!result.changes) return res.status(404).json({ success: false, message: "Admin profile not found" }); logActivity(req.user.id, "Profile changes", "Updated profile information"); res.json({ success: true, message: "Profile updated" }); } catch (error) { next(error); } });
router.get("/settings", (req, res, next) => { try { const rows = db.prepare("SELECT setting_key, setting_value FROM admin_settings").all(); res.json({ success: true, settings: Object.fromEntries(rows.map(row => [row.setting_key, JSON.parse(row.setting_value)])) }); } catch (error) { next(error); } });
router.put("/settings", (req, res, next) => { try { for (const [key, value] of Object.entries(req.body || {})) { if (!/^[a-z0-9_]{1,50}$/.test(key)) return res.status(400).json({ success: false, message: "Invalid setting key" }); db.prepare("INSERT OR REPLACE INTO admin_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, JSON.stringify(value)); } logActivity(req.user.id, "Settings changes", "Updated admin settings"); res.json({ success: true, message: "Settings updated" }); } catch (error) { next(error); } });
router.put("/password", validateBody({ current_password: { required: true, max: 128 }, new_password: { required: true, max: 128 } }), async (req, res, next) => { try { if (req.body.new_password.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters" }); const user = db.prepare("SELECT password FROM users WHERE id = ? AND role = 'admin'").get(req.user.id); if (!user || !(await bcrypt.compare(req.body.current_password, user.password))) return res.status(401).json({ success: false, message: "Current password is incorrect" }); db.prepare("UPDATE users SET password = ? WHERE id = ?").run(await bcrypt.hash(req.body.new_password, 12), req.user.id); logActivity(req.user.id, "Password changes", "Changed administrator password"); res.json({ success: true, message: "Password changed. Sign in again on other devices." }); } catch (error) { next(error); } });
router.get("/users", primaryOnly, (req, res, next) => { try { const users = db.prepare("SELECT id, full_name, email, phone, role, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC").all(); res.json({ success: true, users }); } catch (error) { next(error); } });
router.get("/activity", (req, res, next) => { try { const activity = db.prepare("SELECT a.id, a.action, a.details, a.created_at, u.full_name FROM admin_activity a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 100").all(); res.json({ success: true, activity }); } catch (error) { next(error); } });
router.post("/invitations", primaryOnly, validateBody({ name: { required: true, max: 120 }, email: { required: true, max: 254 }, phone: { max: 40 }, message: { max: 500 } }), (req, res, next) => { try { const rawToken = crypto.randomBytes(32).toString("hex"); const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex"); db.prepare("INSERT INTO admin_invitations (token_hash, name, email, phone, role, message, expires_at, invited_by) VALUES (?, ?, ?, ?, 'admin', ?, datetime('now', '+7 days'), ?)").run(tokenHash, req.body.name.trim(), req.body.email.trim().toLowerCase(), req.body.phone?.trim() || "", req.body.message?.trim() || "", req.user.id); logActivity(req.user.id, "Admin invitations", `Invited ${req.body.email}`); const inviteLink = `${config.publicAppUrl}/admin-invite.html?token=${rawToken}`; const invitationText = `TBS Admin Invitation\n\nHello,\n\nYou have been invited to join The Blue Style (TBS) administration team.\n\nPlease use this secure invitation link to accept your invitation and create your administrator account:\n${inviteLink}\n\nThe Blue Style\nStyle. Technology. Creativity.\n\nThank you,\nMpofu James\nTBS Administrator`; res.status(201).json({ success: true, invitation: { email: req.body.email, inviteLink, whatsappUrl: `https://wa.me/${(req.body.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(invitationText)}`, emailUrl: `mailto:${req.body.email}?subject=${encodeURIComponent("TBS Admin Invitation")}&body=${encodeURIComponent(invitationText)}` } }); } catch (error) { next(error); } });
router.post("/logout-all", primaryOnly, (req, res) => { logActivity(req.user.id, "Logout", "Requested logout from all devices"); res.json({ success: true, message: "All active sessions should be revoked by your session provider." }); });

module.exports = router;
