require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use(limiter);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "TBS Backend API is running!"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "TBS Backend is healthy"
    });
});

app.listen(PORT, () => {
    console.log(`TBS Backend running on http://localhost:${PORT}`);
});