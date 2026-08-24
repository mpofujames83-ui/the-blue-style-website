require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");
const contactRoutes = require("./routes/contact");
const analyticsRoutes = require("./routes/analytics");
const donationRoutes = require("./routes/donations");
const adminRoutes = require("./routes/admin");

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
    res.setHeader("X-Request-Id", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    next();
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many authentication attempts. Please try again later." }
});

app.get("/", (req, res) => res.json({ success: true, name: "TBS Backend", brand: "The Blue Style", version: "2.0.0" }));
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok", service: "tbs-api", environment: config.nodeEnv, timestamp: new Date().toISOString() }));
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
