const required = ["JWT_SECRET"];

function loadConfig() {
    const missing = required.filter(name => !process.env[name]);

    if (missing.length && process.env.NODE_ENV === "production") {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    return {
        nodeEnv: process.env.NODE_ENV || "development",
        port: Number(process.env.PORT || 5000),
        jwtSecret: process.env.JWT_SECRET || "development-only-change-me",
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
        paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "development-only-webhook-secret",
        databasePath: process.env.DATABASE_PATH || "./data/tbs.db",
        corsOrigins: (process.env.CORS_ORIGINS || "http://127.0.0.1:5500,http://localhost:5500")
            .split(",")
            .map(origin => origin.trim())
            .filter(Boolean)
    };
}

module.exports = loadConfig();
