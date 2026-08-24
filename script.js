require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(helmet());

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
});

app.use("/api/", limiter);


// HOME
app.get("/", (req, res) => {
    res.json({
        name: "TBS Backend",
        brand: "The Blue Style",
        status: "Online",
        version: "1.0.0"
    });
});


// HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "TBS backend is running"
    });
});


// TEST API
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "TBS API is working!"
    });
});


// 404
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});


// START SERVER
app.listen(PORT, () => {
    console.log(`
=========================================
        TBS BACKEND
        THE BLUE STYLE
=========================================

Server running:
http://localhost:${PORT}

Health:
http://localhost:${PORT}/api/health

Test:
http://localhost:${PORT}/api/test

=========================================
`);
});
async function testBackend() {
    try {
        const response = await fetch("http://localhost:5000/api/health");
        const data = await response.json();

        console.log("Backend response:", data);

    } catch (error) {
        console.error("Backend connection failed:", error);
    }
}

testBackend();