const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const validateBody = require("../middleware/validate");

const router = express.Router();
const SESSION_MINUTES = 30;
const PERIODS = { today: "-0 days", week: "-6 days", month: "-29 days" };

function dateFilter(period) {
    return PERIODS[period] || PERIODS.week;
}

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
        const now = new Date().toISOString();
        const existingVisitor = db.prepare("SELECT visitor_id FROM analytics_visitors WHERE visitor_id = ?").get(visitorId);
        const existingSession = db.prepare("SELECT session_id FROM analytics_sessions WHERE session_id = ? AND last_seen > datetime('now', ?) ").get(sessionId, `-${SESSION_MINUTES} minutes`);

        db.exec("BEGIN");
        try {
            if (!existingVisitor) {
                db.prepare("INSERT INTO analytics_visitors (visitor_id, first_seen, last_seen, total_sessions) VALUES (?, ?, ?, 1)").run(visitorId, now, now);
            } else {
                db.prepare("UPDATE analytics_visitors SET last_seen = ? WHERE visitor_id = ?").run(now, visitorId);
            }

            if (!existingSession) {
                db.prepare(`INSERT OR IGNORE INTO analytics_sessions
                    (session_id, visitor_id, started_at, last_seen, device_type, browser, operating_system, traffic_source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(sessionId, visitorId, now, now, deviceType, browser, operatingSystem, trafficSource);
            } else {
                db.prepare("UPDATE analytics_sessions SET last_seen = ?, duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER) WHERE session_id = ?").run(now, now, sessionId);
            }

            const inserted = db.prepare(`INSERT OR IGNORE INTO analytics_pageviews
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
        res.status(202).json({ success: true, tracked: true });
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

router.use(authenticateToken, adminOnly);

router.get("/overview", (req, res, next) => {
    try {
        const window = metricWindow(req.query.period);
        const totalVisitors = db.prepare("SELECT COUNT(*) AS count FROM analytics_visitors").get().count;
        const visitorsToday = db.prepare("SELECT COUNT(*) AS count FROM analytics_visitors WHERE last_seen >= date('now', 'localtime')").get().count;
        const visitorsInPeriod = db.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE started_at >= ${window}`).get().count;
        const pageViews = db.prepare(`SELECT COUNT(*) AS count FROM analytics_pageviews WHERE viewed_at >= ${window}`).get().count;
        const currentlyOnline = db.prepare("SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE last_seen >= datetime('now', '-5 minutes')").get().count;
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
        const recent = db.prepare("SELECT visitor_id, session_id, pageviews, device_type, browser, operating_system, traffic_source, last_seen FROM analytics_sessions ORDER BY last_seen DESC LIMIT 30").all();
        res.json({ success: true, breakdowns: { trafficSources: breakdown("traffic_source"), devices: breakdown("device_type"), browsers: breakdown("browser"), operatingSystems: breakdown("operating_system") }, recent });
    } catch (error) { next(error); }
});

router.get("/realtime", (req, res, next) => {
    try {
        const online = db.prepare("SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_sessions WHERE last_seen >= datetime('now', '-5 minutes')").get().count;
        const activity = db.prepare("SELECT page_path AS page, COUNT(*) AS views FROM analytics_pageviews WHERE viewed_at >= datetime('now', '-30 minutes') GROUP BY page_path ORDER BY views DESC LIMIT 5").all();
        res.json({ success: true, currentlyOnline: online, recentPages: activity, asOf: new Date().toISOString() });
    } catch (error) { next(error); }
});

module.exports = router;
