const express = require("express");
const validateBody = require("../middleware/validate");

const router = express.Router();
const answer = question => {
    const text = question.toLowerCase();
    if (text.includes("product") || text.includes("price") || text.includes("shop")) return "TBS offers clothing, mugs, power banks, smartphones, smart watches and wireless earbuds. Visit the Shop section for current prices.";
    if (text.includes("print") || text.includes("shirt") || text.includes("brand")) return "TBS creates custom T-shirts, apparel and branded products for businesses, schools, churches, teams and events.";
    if (text.includes("bulk") || text.includes("team")) return "TBS accepts bulk orders. Use the Bulk Orders section to request a tailored quote.";
    if (text.includes("contact") || text.includes("phone") || text.includes("email")) return "Contact TBS at mpofujames83@gmail.com or +263 78 858 7669. TBS is based in Victoria Falls, Zimbabwe.";
    if (text.includes("order") || text.includes("cart")) return "Choose a product, add it to your cart, review the total, and continue to checkout.";
    return "I can help with TBS products, prices, custom printing, bulk orders, contact details and placing an order.";
};

router.post("/chat", validateBody({ message: { required: true, max: 1000 } }), (req, res) => {
    res.json({ success: true, reply: answer(req.body.message) });
});

module.exports = router;
