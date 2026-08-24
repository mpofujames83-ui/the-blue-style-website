require("dotenv").config();

const app = require("./app");
const config = require("./config/env");

const server = app.listen(config.port, () => {
    console.log(`TBS API listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
    console.log(`${signal}: shutting down TBS API`);
    server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
