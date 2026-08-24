function validateBody(rules) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rule] of Object.entries(rules)) {
            const value = req.body?.[field];
            if (rule.required && (value === undefined || value === null || String(value).trim() === "")) {
                errors.push(`${field} is required`);
                continue;
            }
            if (value !== undefined && rule.type && typeof value !== rule.type) {
                errors.push(`${field} must be a ${rule.type}`);
            }
            if (value !== undefined && rule.max && String(value).length > rule.max) {
                errors.push(`${field} must be ${rule.max} characters or fewer`);
            }
        }

        if (errors.length) {
            return res.status(400).json({ success: false, message: "Validation failed", errors });
        }
        next();
    };
}

module.exports = validateBody;
