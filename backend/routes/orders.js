const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();


// CREATE ORDER
router.post(
    "/",
    authenticateToken,
    (req, res) => {

        try {

            const {
                delivery_address,
                items
            } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    message: "Order must contain products"
                });
            }

            const user = db.prepare(
                "SELECT * FROM users WHERE id = ?"
            ).get(req.user.id);

            let total = 0;

            const orderItems = [];

            for (const item of items) {

                const product = db.prepare(
                    "SELECT * FROM products WHERE id = ?"
                ).get(item.product_id);

                if (!product) {
                    return res.status(404).json({
                        message: `Product ${item.product_id} not found`
                    });
                }

                const quantity = Number(item.quantity);

                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {
                    return res.status(400).json({
                        message: "Invalid quantity"
                    });
                }

                if (product.stock < quantity) {
                    return res.status(400).json({
                        message: `${product.name} is out of stock`
                    });
                }

                total += product.price * quantity;

                orderItems.push({
                    product,
                    quantity
                });
            }

            const createOrder = db.transaction(() => {

                const order = db.prepare(`
                    INSERT INTO orders
                    (
                        user_id,
                        customer_name,
                        phone,
                        email,
                        delivery_address,
                        total,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    user.id,
                    user.full_name,
                    user.phone,
                    user.email,
                    delivery_address || "",
                    total,
                    "Pending"
                );

                const orderId = order.lastInsertRowid;

                for (const item of orderItems) {

                    db.prepare(`
                        INSERT INTO order_items
                        (
                            order_id,
                            product_id,
                            product_name,
                            price,
                            quantity
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `).run(
                        orderId,
                        item.product.id,
                        item.product.name,
                        item.product.price,
                        item.quantity
                    );

                    db.prepare(`
                        UPDATE products
                        SET stock = stock - ?
                        WHERE id = ?
                    `).run(
                        item.quantity,
                        item.product.id
                    );
                }

                return orderId;
            });

            const orderId = createOrder();

            res.status(201).json({
                message: "Order placed successfully",
                orderId,
                total
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Could not create order"
            });
        }
    }
);


// CUSTOMER ORDERS
router.get(
    "/my-orders",
    authenticateToken,
    (req, res) => {

        const orders = db.prepare(`
            SELECT *
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(req.user.id);

        res.json(orders);
    }
);


// ADMIN ALL ORDERS
router.get(
    "/",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const orders = db.prepare(`
            SELECT *
            FROM orders
            ORDER BY created_at DESC
        `).all();

        res.json(orders);
    }
);


// ADMIN UPDATE ORDER STATUS
router.put(
    "/:id/status",
    authenticateToken,
    adminOnly,
    (req, res) => {

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Processing",
            "Shipped",
            "Completed",
            "Cancelled"
        ];

        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const result = db.prepare(`
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `).run(
            status,
            req.params.id
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.json({
            message: "Order status updated"
        });
    }
);


module.exports = router;