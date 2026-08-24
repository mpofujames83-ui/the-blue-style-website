const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();


// GET ALL PRODUCTS
router.get("/", (req, res) => {

    const products = db.prepare(`
        SELECT *
        FROM products
        ORDER BY created_at DESC
    `).all();

    res.json(products);
});


// GET ONE PRODUCT
router.get("/:id", (req, res) => {

    const product = db.prepare(
        "SELECT * FROM products WHERE id = ?"
    ).get(req.params.id);

    if (!product) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    res.json(product);
});


// ADD PRODUCT
router.post(
    "/",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const {
            name,
            description,
            price,
            category,
            image_url,
            stock
        } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({
                message: "Product name and price are required"
            });
        }

        const result = db.prepare(`
            INSERT INTO products
            (name, description, price, category, image_url, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            name,
            description || "",
            Number(price),
            category || "",
            image_url || "",
            Number(stock || 0)
        );

        res.status(201).json({
            message: "Product created",
            productId: result.lastInsertRowid
        });
    }
);


// UPDATE PRODUCT
router.put(
    "/:id",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const {
            name,
            description,
            price,
            category,
            image_url,
            stock
        } = req.body;

        const result = db.prepare(`
            UPDATE products
            SET
                name = ?,
                description = ?,
                price = ?,
                category = ?,
                image_url = ?,
                stock = ?
            WHERE id = ?
        `).run(
            name,
            description || "",
            Number(price),
            category || "",
            image_url || "",
            Number(stock || 0),
            req.params.id
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product updated"
        });
    }
);


// DELETE PRODUCT
router.delete(
    "/:id",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const result = db.prepare(
            "DELETE FROM products WHERE id = ?"
        ).run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product deleted"
        });
    }
);


module.exports = router;