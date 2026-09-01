const express = require("express");
const db = require("../database");
const authenticateToken = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const validateBody = require("../middleware/validate");

const router = express.Router();


// CREATE ORDER
router.post(
    "/",
    authenticateToken,
    validateBody({
        delivery_address: { required: true, max: 500 },
        items: { required: true, type: "object" },
        payment_method: { required: true, max: 40 }
    }),
    (req, res) => {

        try {

            const {
                delivery_address,
                items,
                payment_method
            } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    message: "Order must contain products"
                });
            }

            const paymentMethods = ["cash_on_delivery", "ecocash", "bank_transfer", "card"];
            if (!paymentMethods.includes(payment_method)) {
                return res.status(400).json({
                    success: false,
                    message: "Unsupported payment method"
                });
            }

            const user = db.prepare(
                "SELECT * FROM users WHERE id = ?"
            ).get(req.user.id);

            let total = 0;

            const orderItems = [];

            for (const item of items) {

                const product = db.prepare(
                    "SELECT * FROM products WHERE id = ? OR slug = ?"
                ).get(item.product_id, item.product_id);

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

            const createOrder = () => {
                const orderNumber = `TBS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-6)}`;

                const order = db.prepare(`
                    INSERT INTO orders
                    (
                        order_number,
                        user_id,
                        customer_name,
                        phone,
                        email,
                        delivery_address,
                        total,
                        status,
                        payment_method,
                        payment_status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    orderNumber,
                    user.id,
                    user.full_name,
                    user.phone,
                    user.email,
                    delivery_address || "",
                    total,
                    "Pending",
                    payment_method,
                    payment_method === "card" ? "awaiting_gateway" : "pending"
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

                return { orderId, orderNumber };
            };

            db.exec("BEGIN");
            let createdOrder;
            try {
                createdOrder = createOrder();
                db.exec("COMMIT");
            } catch (error) {
                db.exec("ROLLBACK");
                throw error;
            }

            res.status(201).json({
                success: true,
                message: "Order placed successfully",
                orderId: createdOrder.orderId,
                orderNumber: createdOrder.orderNumber,
                total,
                currency: "USD",
                paymentMethod: payment_method,
                paymentStatus: payment_method === "card" ? "awaiting_gateway" : "pending"
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

// ADMIN PAYMENT STATUS / GATEWAY WEBHOOK TARGET
router.put(
    "/:id/payment",
    authenticateToken,
    adminOnly,
    validateBody({
        payment_status: { required: true, max: 40 },
        payment_reference: { max: 160 }
    }),
    (req, res) => {
        const allowedStatuses = ["pending", "awaiting_gateway", "paid", "failed", "refunded"];
        if (!allowedStatuses.includes(req.body.payment_status)) {
            return res.status(400).json({ success: false, message: "Invalid payment status" });
        }

        const result = db.prepare(`
            UPDATE orders
            SET payment_status = ?, payment_reference = ?
            WHERE id = ?
        `).run(req.body.payment_status, req.body.payment_reference || null, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.json({ success: true, message: "Payment status updated" });
    }
);


module.exports = router;