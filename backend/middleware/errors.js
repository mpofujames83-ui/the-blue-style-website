function notFound(req, res) {
    res.status(404).json({ success: false, message: "Route not found" });
}

function errorHandler(error, req, res, next) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
    const status = error.statusCode || 500;
    res.status(status).json({
        success: false,
        message: status === 500 ? "Internal server error" : error.message
    });
}

module.exports = { notFound, errorHandler };
