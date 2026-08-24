const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const validateBody = require("../middleware/validate");
const config = require("../config/env");

const router = express.Router();
const SESSION_MINUTES = 30;
const ONLINE_MINUTES = Math.max(1, config.analyticsOnlineMinutes);

function metricWindow(period) {
    if (period === "today") return "date('now', 'localtime')";
    if (period === "month") return "datetime('now', '-29 days')";
    return "datetime('now', '-6 days')";
}

function safeText(value, fallback, max) {
    if (typeof value !== "string") return fallback;
    return value.trim().slice(0, max) || fallback;
}

function track(req, res, next) {
    try {
        const visitorId = safeText(req.body.visitor_id, "", 100);
        const sessionId = safeText(req.body.session_id, "", 100);
        const eventId = safeText(req.body.event_id, "", 100);
        const pagePath = safeText(req.body.page_path, "/", 300);
        if (!visitorId || !sessionId || !eventId) {
            return res.status(400).json({ success: false, message: "visitor_id, session_id and event_id are required" });
        }

        const deviceType = safeText(req.body.device_type, "unknown", 20);
        const browser = safeText(req.body.browser, "unknown", 30);
        const operatingSystem = safeText(req.body.operating_system, "unknown", 30);
        const trafficSource = safeText(req.body.traffic_source, "direct", 120);
        const eventType = safeText(req.body.event_type, "pageview", 20);
        const displayName = safeText(req.body.display_name, "", 120);
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        const existingVisitor = db.prepare("SELECT visitor_id FROM analytics_visitors WHERE visitor_id = ?").get(visitorId);
        const existingSession = db.prepare("SELECT session_id FROM analytics_sessions WHERE session_id = ? AND last_seen > datetime('now', ?) ").get(sessionId, `-${SESSION_MINUTES} minutes`);

        db.exec("BEGIN");
        try {
            if (!existingVisitor) {
                db.prepare("INSERT INTO analytics_visitors (visitor_id, display_name, first_seen, last_seen, total_sessions) VALUES (?, ?, ?, ?, 0)").run(visitorId, displayName || `Visitor-${visitorId.slice(-6).toUpperCase()}`, now, now);
            } else {
                db.prepare("UPDATE analytics_visitors SET last_seen = ?, display_name = COALESCE(NULLIF(?, ''), display_name) WHERE visitor_id = ?").run(now, displayName, visitorId);
            }

            if (!existingSession) {
                db.prepare(`INSERT OR IGNORE INTO analytics_sessions
                    (session_id, visitor_id, started_at, last_seen, device_type, browser, operating_system, traffic_source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(sessionId, visitorId, now, now, deviceType, browser, operatingSystem, trafficSource);
                db.prepare("UPDATE analytics_visitors SET total_sessions = total_sessions + 1 WHERE visitor_id = ?").run(visitorId);
            } else {
                db.prepare("UPDATE analytics_sessions SET last_seen = ?, duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER) WHERE session_id = ?").run(now, now, sessionId);
            }

            const inserted = ["heartbeat", "session"].includes(eventType) ? { changes: 0 } : db.prepare(`INSERT OR IGNORE INTO analytics_pageviews
                (event_id, visitor_id, session_id, page_path, page_title, viewed_at)
                VALUES (?, ?, ?, ?, ?, ?)`).run(eventId, visitorId, sessionId, pagePath, safeText(req.body.page_title, "", 160), now);
            if (inserted.changes) {
                db.prepare("UPDATE analytics_sessions SET pageviews = pageviews + 1, last_seen = ? WHERE session_id = ?").run(now, sessionId);
                db.prepare("UPDATE analytics_visitors SET total_pageviews = total_pageviews + 1, last_seen = ? WHERE visitor_id = ?").run(now, visitorId);
            }
            db.exec("COMMIT");
        } catch (error) {
            db.exec("ROLLBACK");
            throw error;
        }
        res.status(202).json({ success: true, tracked: true, status: "online" });
    } catch (error) {
        next(error);
    }
}

router.post("/track", validateBody({
    visitor_id: { required: true, max: 100 },
    session_id: { required: true, max: 100 },
    event_id: { required: true, max: 100 },
    page_path: { max: 300 }
}), track);

const eventValidation = validateBody({
    visitor_id: { required: true, max: 100 },
    session_id: { required: true, max: 100 },
    event_id: { required: true, max: 100 },
    page_path: { max: 300 }
});
router.post("/session", eventValidation, (req, res, next) => { req.body.event_type = "session"; track(req, res, next); });
router.post("/pageview", eventValidation, (req, res, next) => { req.body.event_type = "pageview"; track(req, res, next); });
router.post("/heartbeat", eventValidation, (req, res, next) => {
    req.body.event_type = "heartbeat";
    req.body.event_id = req.body.event_id || `heartbeat-${req.body.session_id}-${Math.floor(Date.now() / 60000)}`;
    track(req, res, next);
});

router.use(authenticateToken, adminOnly);

router.get("/overview", (req, res, next) => {
    try {
        const window = metricWindow(req.query.period);
        const totalVisitors = db.prepare("SELECT COUNT(*) AS count FROM analytics_visitors").get().count;
        const visitorsToday = db.prepare("SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE started_at >= date('now', 'localtime')").get().count;
        const visitorsInPeriod = db.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE started_at >= ${window}`).get().count;
        const pageViews = db.prepare(`SELECT COUNT(*) AS count FROM analytics_pageviews WHERE viewed_at >= ${window}`).get().count;
        const currentlyOnline = db.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE last_seen >= datetime('now', '-${ONLINE_MINUTES} minutes')`).get().count;
        const newVisitors = db.prepare(`SELECT COUNT(*) AS count FROM analytics_visitors WHERE first_seen >= ${window}`).get().count;
        const returningVisitors = Math.max(visitorsInPeriod - newVisitors, 0);
        res.json({ success: true, period: req.query.period || "week", metrics: { totalVisitors, visitorsToday, visitorsThisPeriod: visitorsInPeriod, pageViews, currentlyOnline, newVisitors, returningVisitors } });
    } catch (error) { next(error); }
});

router.get("/pageviews", (req, res, next) => {
    try {
        const window = metricWindow(req.query.period);
        const pages = db.prepare(`SELECT page_path AS page, COUNT(*) AS views FROM analytics_pageviews WHERE viewed_at >= ${window} GROUP BY page_path ORDER BY views DESC LIMIT 10`).all();
        const activity = db.prepare(`SELECT date(viewed_at, 'localtime') AS day, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS pageviews FROM analytics_pageviews WHERE viewed_at >= ${window} GROUP BY day ORDER BY day`).all();
        res.json({ success: true, pages, activity });
    } catch (error) { next(error); }
});

router.get("/visitors", (req, res, next) => {
    try {
        const window = metricWindow(req.query.period);
        const breakdown = column => db.prepare(`SELECT ${column} AS name, COUNT(*) AS sessions FROM analytics_sessions WHERE started_at >= ${window} GROUP BY ${column} ORDER BY sessions DESC`).all();
        const recent = db.prepare(`SELECT s.visitor_id, COALESCE(v.display_name, 'Visitor-' || upper(substr(s.visitor_id, -6))) AS visitor, s.session_id, s.pageviews, s.device_type, s.browser, s.operating_system, s.traffic_source, s.last_seen, CASE WHEN s.last_seen >= datetime('now', '-${ONLINE_MINUTES} minutes') THEN 'Online' ELSE 'Offline' END AS status FROM analytics_sessions s JOIN analytics_visitors v ON v.visitor_id = s.visitor_id ORDER BY s.last_seen DESC LIMIT 30`).all();
        res.json({ success: true, breakdowns: { trafficSources: breakdown("traffic_source"), devices: breakdown("device_type"), browsers: breakdown("browser"), operatingSystems: breakdown("operating_system") }, recent });
    } catch (error) { next(error); }
});

router.get("/realtime", (req, res, next) => {
    try {
        const online = db.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE last_seen >= datetime('now', '-${ONLINE_MINUTES} minutes')`).get().count;
        const activity = db.prepare("SELECT page_path AS page, COUNT(*) AS views FROM analytics_pageviews WHERE viewed_at >= datetime('now', '-30 minutes') GROUP BY page_path ORDER BY views DESC LIMIT 5").all();
        res.json({ success: true, currentlyOnline: online, recentPages: activity, asOf: new Date().toISOString() });
    } catch (error) { next(error); }
});

router.get("/history", (req, res, next) => {
    try {
        const history = db.prepare(`SELECT p.event_id AS eventId, COALESCE(v.display_name, 'Visitor-' || upper(substr(p.visitor_id, -6))) AS visitor, p.page_path AS page, p.viewed_at AS viewedAt, s.device_type AS deviceType, s.browser, s.operating_system AS operatingSystem FROM analytics_pageviews p JOIN analytics_visitors v ON v.visitor_id = p.visitor_id JOIN analytics_sessions s ON s.session_id = p.session_id ORDER BY p.viewed_at DESC LIMIT 100`).all();
        res.json({ success: true, history });
    } catch (error) { next(error); }
});

module.exports = router;
