document.addEventListener("DOMContentLoaded", () => {
    const items = document.getElementById("cartItemsPage");
    const subtotalNode = document.getElementById("cartSubtotal");
    const shippingNode = document.getElementById("cartShipping");
    const totalNode = document.getElementById("cartTotalPage");
    const cartCount = document.getElementById("cartCountPage");
    const shipping = 5;
    let cart = readCart();

    function readCart() {
        try { return JSON.parse(localStorage.getItem("tbsCart") || "[]"); } catch (error) { return []; }
    }

    function saveCart() { localStorage.setItem("tbsCart", JSON.stringify(cart)); }

    function render() {
        const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
        if (cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
        if (subtotalNode) subtotalNode.textContent = `$${subtotal.toFixed(2)}`;
        if (shippingNode) shippingNode.textContent = cart.length ? `$${shipping.toFixed(2)}` : "$0.00";
        if (totalNode) totalNode.textContent = `$${(cart.length ? subtotal + shipping : 0).toFixed(2)}`;
        if (!items) return;
        items.innerHTML = cart.length ? cart.map(item => `<article class="cart-page-item" data-id="${escapeHtml(item.id)}"><img src="${escapeHtml(item.image || "images/logo.png")}" alt="${escapeHtml(item.name)}"><div><h2>${escapeHtml(item.name)}</h2><p>$${Number(item.price).toFixed(2)} each</p><div class="cart-page-controls"><button type="button" data-action="decrease" aria-label="Decrease quantity">-</button><strong>${item.quantity}</strong><button type="button" data-action="increase" aria-label="Increase quantity">+</button><button type="button" data-action="remove">Remove</button></div></div><strong>$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong></article>`).join("") : `<div class="cart-page-empty"><h2>Your cart is empty</h2><p>You haven't added any products yet.</p><a class="btn btn-primary" href="index.html#shop">Continue Shopping</a></div>`;
    }

    items?.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        const row = event.target.closest("[data-id]");
        if (!button || !row) return;
        const item = cart.find(product => product.id === row.dataset.id);
        if (!item) return;
        if (button.dataset.action === "increase") item.quantity += 1;
        if (button.dataset.action === "decrease") item.quantity = Math.max(1, item.quantity - 1);
        if (button.dataset.action === "remove") cart = cart.filter(product => product.id !== item.id);
        saveCart(); render();
    });

    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
    render();
});
