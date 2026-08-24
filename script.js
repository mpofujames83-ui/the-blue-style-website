/* =====================================
   TBS SHOP
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeAnalytics();
    initializeSignupForm();
    initializeBlueAI();

    let cart =
        JSON.parse(
            localStorage.getItem("tbsCart")
        ) || [];


    const products =
        document.querySelectorAll(
            ".tbs-product"
        );

    const filterButtons =
        document.querySelectorAll(
            ".filter-btn"
        );

    const addButtons =
        document.querySelectorAll(
            ".tbs-add-button"
        );

    const cartButton = document.getElementById("cartBtn");
    const cartPanel = document.getElementById("cartPanel");
    const closeCart = document.getElementById("closeCart");
    const overlay = document.getElementById("overlay");
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    const checkoutButton = document.getElementById("checkoutBtn");
    const modal = document.getElementById("modal");
    const modalContent = document.getElementById("modalContent");
    const modalClose = document.getElementById("modalClose");
    const deliveryFee = 5;
    const cartToast = document.getElementById("cartToast");
    const cartToastMessage = document.getElementById("cartToastMessage");
    const contactForm = document.getElementById("contactForm");
    const contactStatus = document.getElementById("contactStatus");
    const menuButton = document.getElementById("menuBtn");
    const navigation = document.getElementById("nav");
    const customButton = document.getElementById("customBtn");
    const bulkButton = document.getElementById("bulkBtn");
    let lastModalTrigger;
    let toastTimeout;

    function setCartOpen(isOpen) {
        if (!cartPanel || !overlay) {
            return;
        }

        cartPanel.classList.toggle("active", isOpen);
        overlay.classList.toggle("active", isOpen);
        cartPanel.setAttribute("aria-hidden", String(!isOpen));
    }

    function updateCart() {
        if (!cartItems || !cartTotal) {
            return;
        }

        cartItems.innerHTML = cart.length
            ? cart.map(item => `
                <div class="cart-item" data-cart-id="${item.id}">
                    <div class="cart-item-image"><img src="${item.image}" alt="${item.name}"></div>
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <span class="item-price">$${item.price.toFixed(2)}</span>
                        <div class="cart-quantity">
                            <button type="button" data-action="decrease" aria-label="Decrease ${item.name} quantity">−</button>
                            <span>${item.quantity}</span>
                            <button type="button" data-action="increase" aria-label="Increase ${item.name} quantity">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" type="button" data-action="remove">Remove</button>
                </div>
            `).join("")
            : `<div class="cart-empty">
                <h3>Your Cart Is Empty</h3>
                <p>Discover something you love from TBS and add it to your cart.</p>
                <button type="button" data-cart-action="shop">Shop TBS</button>
            </div>`;

        const subtotal = getCartTotal();
        cartTotal.innerHTML = cart.length
            ? `<span class="cart-total-breakdown">Subtotal $${subtotal.toFixed(2)}<br>Delivery $${deliveryFee.toFixed(2)}</span><strong>$${(subtotal + deliveryFee).toFixed(2)}</strong>`
            : "$0.00";
    }

    cartButton?.addEventListener("click", () => {
        updateCart();
        setCartOpen(true);
    });

    closeCart?.addEventListener("click", () => setCartOpen(false));
    overlay?.addEventListener("click", () => setCartOpen(false));

    menuButton?.addEventListener("click", () => {
        const isOpen = navigation?.classList.toggle("active") || false;
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });

    navigation?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("active");
            menuButton?.setAttribute("aria-expanded", "false");
            menuButton?.setAttribute("aria-label", "Open navigation");
        });
    });

    cartItems?.addEventListener("click", event => {
        const cartAction = event.target.closest("[data-cart-action]");

        if (cartAction?.dataset.cartAction === "shop") {
            setCartOpen(false);
            document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
            return;
        }

        const actionButton = event.target.closest("[data-action]");
        const cartItem = event.target.closest("[data-cart-id]");

        if (!actionButton || !cartItem) {
            return;
        }

        const item = cart.find(cartProduct => cartProduct.id === cartItem.dataset.cartId);

        if (!item) {
            return;
        }

        if (actionButton.dataset.action === "increase") {
            item.quantity += 1;
        } else if (actionButton.dataset.action === "decrease") {
            item.quantity -= 1;
        } else if (actionButton.dataset.action === "remove") {
            cart = cart.filter(cartProduct => cartProduct.id !== item.id);
        }

        cart = cart.filter(cartProduct => cartProduct.quantity > 0);
        localStorage.setItem("tbsCart", JSON.stringify(cart));
        updateCartCount();
        updateCart();
    });

    function getCartTotal() {
        return cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
    }

    function addProduct(product, shouldOpenCart = true) {
        const existing = cart.find(item => item.id === product.id);

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        localStorage.setItem("tbsCart", JSON.stringify(cart));
        updateCartCount();
        updateCart();

        showCartToast(product.name);

        if (shouldOpenCart) {
            setCartOpen(true);
        }
    }

    function showCartToast(productName) {
        if (!cartToast || !cartToastMessage) {
            return;
        }

        window.clearTimeout(toastTimeout);
        cartToastMessage.textContent = `${productName} has been added to your cart.`;
        cartToast.classList.add("visible");
        cartToast.setAttribute("aria-hidden", "false");
        toastTimeout = window.setTimeout(hideCartToast, 4500);
    }

    function hideCartToast() {
        cartToast?.classList.remove("visible");
        cartToast?.setAttribute("aria-hidden", "true");
    }

    document.getElementById("viewCartToast")?.addEventListener("click", () => {
        hideCartToast();
        updateCart();
        setCartOpen(true);
    });

    document.getElementById("continueShoppingToast")?.addEventListener("click", hideCartToast);
    document.getElementById("continueShoppingCart")?.addEventListener("click", () => setCartOpen(false));

    contactForm?.addEventListener("submit", async event => {
        event.preventDefault();
        const submitButton = contactForm.querySelector("button[type=submit]");
        const formData = new FormData(contactForm);
        const payload = Object.fromEntries(formData.entries());

        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
        contactStatus.textContent = "";
        contactStatus.className = "contact-status";

        try {
            const response = await window.tbsFetch("/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Contact request failed");
            }

            contactForm.reset();
            contactStatus.textContent = "Your message has been received. We will get back to you soon.";
            contactStatus.classList.add("sent");
        } catch (error) {
            contactStatus.textContent = "We could not send your message right now. Please call or email TBS directly.";
            contactStatus.classList.add("failed");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Send Message →";
        }
    });

    function productFromCard(product) {
        return {
            id: product.dataset.id,
            name: product.querySelector("h3").textContent.trim(),
            price: parseFloat(product.querySelector(".tbs-price").textContent.replace(/[^0-9.]/g, "")),
            image: product.querySelector("img")?.getAttribute("src") || ""
        };
    }

    products.forEach(product => {
        const buyButton = document.createElement("button");
        buyButton.className = "tbs-buy-button";
        buyButton.type = "button";
        buyButton.textContent = "Buy now";
        buyButton.addEventListener("click", () => {
            addProduct(productFromCard(product), false);
            openCheckout();
        });
        product.querySelector(".tbs-product-bottom")?.appendChild(buyButton);
    });

    function closeModal() {
        modal?.classList.remove("active");
        modal?.setAttribute("aria-hidden", "true");
        lastModalTrigger?.focus();
        lastModalTrigger = null;
    }

    function openCheckout() {
        if (!modal || !modalContent) {
            return;
        }

        if (!cart.length) {
            modalContent.innerHTML = `
                <h2 id="modalTitle">Your cart is empty</h2>
                <p class="modal-text">Add a product before proceeding to checkout.</p>
            `;
        } else {
            modalContent.innerHTML = `
                <h2 id="modalTitle">Complete Your Order</h2>
                <p class="modal-text">Enter your details and choose your preferred payment method.</p>
                <form class="modal-form" id="checkoutForm">
                    <label>Full Name<input type="text" name="name" placeholder="Your full name" required></label>
                    <label>Phone Number<input type="tel" name="phone" placeholder="+263 7XX XXX XXX" required></label>
                    <label>Email Address<input type="email" name="email" placeholder="you@example.com" required></label>
                    <label>Delivery / Collection Address<textarea name="address" placeholder="Enter your delivery or collection details" required></textarea></label>
                    <label>Order Notes<textarea name="notes" placeholder="Add any delivery or order notes (optional)"></textarea></label>
                    <fieldset class="payment-options">
                        <legend>Payment Method</legend>
                        <label class="payment-card"><input type="radio" name="payment" value="Cash" required><span><strong>Cash</strong><small>Pay when receiving or collecting your order.</small></span></label>
                        <label class="payment-card"><input type="radio" name="payment" value="Cash to Cash"><span><strong>Cash to Cash</strong><small>Arrange a direct cash payment with TBS.</small></span></label>
                        <label class="payment-card"><input type="radio" name="payment" value="EcoCash"><span><strong>EcoCash</strong><small>Pay securely using EcoCash.</small></span></label>
                        <label class="payment-card"><input type="radio" name="payment" value="Visa / Mastercard"><span><strong>Visa / Mastercard</strong><small>Pay using your bank card.</small></span></label>
                        <label class="payment-card"><input type="radio" name="payment" value="PayPal"><span><strong>PayPal</strong><small>Pay securely through PayPal.</small></span></label>
                    </fieldset>
                    <div class="checkout-products"><strong>Order Summary</strong>${cart.map(item => `<div><span>${item.name} x ${item.quantity}</span><span>$${(item.price * item.quantity).toFixed(2)}</span></div>`).join("")}</div>
                    <div class="checkout-total-row"><span>Subtotal</span><strong>$${getCartTotal().toFixed(2)}</strong></div>
                    <div class="checkout-total-row"><span>Delivery</span><strong>$${deliveryFee.toFixed(2)}</strong></div>
                    <div class="checkout-total-row"><span>Total</span><strong>$${(getCartTotal() + deliveryFee).toFixed(2)}</strong></div>
                    <p class="payment-note">Online payment options are prepared for future gateway integration. No payment is processed in this demo.</p>
                    <button class="btn btn-primary" type="submit">Place Order</button>
                </form>
            `;

            modalContent.querySelector("#checkoutForm")?.addEventListener("submit", event => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const payment = formData.get("payment");
                const subtotal = getCartTotal();
                const total = subtotal + deliveryFee;
                const orderNumber = `TBS-${Date.now().toString().slice(-6)}`;
                const order = {
                    orderNumber,
                    customerName: formData.get("name"),
                    phone: formData.get("phone"),
                    email: formData.get("email"),
                    address: formData.get("address"),
                    notes: formData.get("notes"),
                    paymentMethod: payment,
                    products: cart.map(item => ({ ...item })),
                    subtotal,
                    delivery: deliveryFee,
                    total,
                    date: new Date().toISOString(),
                    status: "Order Received"
                };

                const savedOrders = JSON.parse(localStorage.getItem("tbsOrders")) || [];
                savedOrders.push(order);
                localStorage.setItem("tbsOrders", JSON.stringify(savedOrders));

                modalContent.innerHTML = `
                    <div class="success">
                        <h2 id="modalTitle">Thank You for Supporting TBS!</h2>
                        <p>Your order has been received successfully.</p>
                        <p><strong>Order:</strong> ${orderNumber}<br><strong>Payment:</strong> ${payment}<br><strong>Total:</strong> $${total.toFixed(2)}<br><strong>Status:</strong> Order Received</p>
                        <p>Thank you for choosing TBS. Your support helps us continue creating better style, technology, printing and digital solutions.</p>
                        <button class="btn btn-primary" type="button" id="continueShopping">Continue Shopping</button>
                    </div>
                `;

                cart = [];
                localStorage.removeItem("tbsCart");
                updateCartCount();
                updateCart();
                document.getElementById("continueShopping")?.addEventListener("click", closeModal);
            });
        }

        setCartOpen(false);
        lastModalTrigger = document.activeElement;
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        modalClose?.focus();
    }

    checkoutButton?.addEventListener("click", openCheckout);
    modalClose?.addEventListener("click", closeModal);
    modal?.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (modal?.classList.contains("active")) {
                closeModal();
            } else if (cartPanel?.classList.contains("active")) {
                setCartOpen(false);
            }
        }
    });

    function openRequestForm(type, trigger) {
        if (!modal || !modalContent) {
            return;
        }

        const isCustom = type === "custom";
        lastModalTrigger = trigger;
        modalContent.innerHTML = isCustom
            ? `<h2 id="modalTitle">Request Custom Printing</h2>
                <p class="modal-text">Tell TBS what you would like printed and we will contact you.</p>
                <form class="modal-form request-form" data-endpoint="/api/custom-printing">
                    <label>Name<input name="name" required></label>
                    <label>Phone Number<input name="phone" type="tel" required></label>
                    <label>Quantity<input name="quantity" type="number" min="1" required></label>
                    <label>Design Details<textarea name="design" required></textarea></label>
                    <p class="request-status" aria-live="polite"></p>
                    <button class="btn btn-primary" type="submit">Send Request</button>
                </form>`
            : `<h2 id="modalTitle">Request a Bulk Quote</h2>
                <p class="modal-text">Share your requirements and TBS will prepare a tailored quote.</p>
                <form class="modal-form request-form" data-endpoint="/api/bulk-orders">
                    <label>Organisation<input name="organisation" required></label>
                    <label>Contact Name<input name="contact" required></label>
                    <label>Phone Number<input name="phone" type="tel" required></label>
                    <label>Quantity<input name="quantity" type="number" min="1" required></label>
                    <label>Order Details<textarea name="details" required></textarea></label>
                    <p class="request-status" aria-live="polite"></p>
                    <button class="btn btn-primary" type="submit">Request Quote</button>
                </form>`;

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        modalClose?.focus();

        modalContent.querySelector(".request-form")?.addEventListener("submit", async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const status = form.querySelector(".request-status");
            const submit = form.querySelector("button[type=submit]");
            submit.disabled = true;
            submit.textContent = "Sending...";

            try {
                const response = await window.tbsFetch(form.dataset.endpoint.replace(/^\/api/, ""), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
                });
                if (!response.ok) throw new Error("Request failed");
                form.reset();
                status.textContent = "Request received. TBS will contact you soon.";
                status.className = "request-status sent";
            } catch (error) {
                status.textContent = "We could not send this request. Please call or email TBS directly.";
                status.className = "request-status failed";
            } finally {
                submit.disabled = false;
                submit.textContent = isCustom ? "Send Request" : "Request Quote";
            }
        });
    }

    customButton?.addEventListener("click", event => openRequestForm("custom", event.currentTarget));
    bulkButton?.addEventListener("click", event => openRequestForm("bulk", event.currentTarget));


    /* =====================================
       FILTER PRODUCTS
    ====================================== */

    filterButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const filter =
                    button.dataset.filter;


                /* ACTIVE BUTTON */

                filterButtons.forEach(btn => {

                    btn.classList.remove(
                        "active"
                    );

                });


                button.classList.add(
                    "active"
                );


                /* SHOW PRODUCTS */

                products.forEach(product => {

                    const category =
                        product.dataset.category;


                    if (
                        filter === "all" ||
                        category === filter ||
                        (filter === "picks" && product.dataset.picks === "true")
                    ) {

                        product.classList.remove(
                            "hidden"
                        );

                    } else {

                        product.classList.add(
                            "hidden"
                        );

                    }

                });

            }
        );

    });


    /* =====================================
       ADD TO CART
    ====================================== */

    addButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const product =
                    button.closest(
                        ".tbs-product"
                    );


                if (!product) {
                    return;
                }


                const id =
                    product.dataset.id;


                const name =
                    product
                        .querySelector("h3")
                        .textContent
                        .trim();


                const priceText =
                    product
                        .querySelector(".tbs-price")
                        .textContent;


                const price =
                    parseFloat(
                        priceText.replace(
                            /[^0-9.]/g,
                            ""
                        )
                    );


                const image =
                    product
                        .querySelector("img")
                        ?.getAttribute("src") ||
                    "";


                addProduct({ id, name, price, image });


                /* BUTTON ANIMATION */

                const originalText =
                    button.innerHTML;


                button.innerHTML =
                    "✓ Added";


                button.classList.add(
                    "added"
                );


                setTimeout(() => {

                    button.innerHTML =
                        originalText;

                    button.classList.remove(
                        "added"
                    );

                }, 1200);


            }
        );

    });


    /* =====================================
       CART COUNT
    ====================================== */

    function updateCartCount() {

        const cartCount =
            document.getElementById(
                "cartCount"
            );


        if (!cartCount) {
            return;
        }


        const count =
            cart.reduce(
                (total, item) =>
                    total + item.quantity,
                0
            );


        cartCount.textContent =
            count;


        /* Small animation */

        cartCount.classList.remove(
            "cart-bump"
        );


        void cartCount.offsetWidth;


        cartCount.classList.add(
            "cart-bump"
        );

    }


    /* INITIAL COUNT */

    updateCartCount();

});

function initializeAnalytics() {
    const analyticsBase = `${window.TBS_API}/analytics`;
    const storageKey = "tbsAnonymousVisitorId";
    const sessionKey = "tbsAnalyticsSession";
    const visitorId = localStorage.getItem(storageKey) || crypto.randomUUID();
    const storedSession = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    const session = storedSession && Date.now() - storedSession.createdAt < 30 * 60 * 1000
        ? storedSession
        : { id: crypto.randomUUID(), createdAt: Date.now() };

    localStorage.setItem(storageKey, visitorId);
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    const userAgent = navigator.userAgent;
    const deviceType = /Mobi|Android/i.test(userAgent) ? "mobile" : /Tablet|iPad/i.test(userAgent) ? "tablet" : "desktop";
    const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Other";
    const operatingSystem = /Windows/i.test(userAgent) ? "Windows" : /Mac OS|Macintosh/i.test(userAgent) ? "macOS" : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" : /Linux/i.test(userAgent) ? "Linux" : "Other";
    const source = document.referrer ? new URL(document.referrer).hostname : "direct";
    let account;
    try {
        account = JSON.parse(localStorage.getItem("tbsUser") || "null");
    } catch (error) {
        account = null;
    }

    const eventPayload = eventType => ({
        visitor_id: visitorId,
        session_id: session.id,
        event_id: crypto.randomUUID(),
        event_type: eventType,
        page_path: window.location.pathname + window.location.hash,
        page_title: document.title,
        display_name: account?.full_name || account?.name || "",
        device_type: deviceType,
        browser,
        operating_system: operatingSystem,
        traffic_source: source
    });

    const sendEvent = (endpoint, eventType, retries = 2) => window.tbsFetch(`${analyticsBase}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload(eventType)),
        keepalive: true
    }, retries).catch(() => {});

    sendEvent("session", "session");
    sendEvent("pageview", "pageview");
    window.addEventListener("hashchange", () => sendEvent("pageview", "pageview"));
    const heartbeat = window.setInterval(() => {
        if (!document.hidden) sendEvent("heartbeat", "heartbeat");
    }, 60 * 1000);
    window.addEventListener("beforeunload", () => window.clearInterval(heartbeat), { once: true });
}

function initializeSignupForm() {
    const form = document.getElementById("signup-form");
    const status = document.getElementById("signup-status");

    if (!form || !status) {
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const submitButton = form.querySelector("button[type=submit]");
        const formData = new FormData(form);
        const payload = {
            full_name: formData.get("full_name") || document.getElementById("signup-name")?.value.trim(),
            email: formData.get("email") || document.getElementById("signup-email")?.value.trim(),
            password: formData.get("password") || document.getElementById("signup-password")?.value
        };

        if (payload.password.length < 8) {
            status.textContent = "Password must be at least 8 characters.";
            status.className = "signup-status failed";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";
        status.textContent = "";
        status.className = "signup-status";

        try {
            const response = await window.tbsFetch("/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Could not create your account");
            }

            form.reset();
            status.textContent = "Account created successfully. You can now log in.";
            status.className = "signup-status sent";
        } catch (error) {
            status.textContent = error.message;
            status.className = "signup-status failed";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Sign Up";
        }
    });
}

function initializeBlueAI() {
    const standaloneInput = document.getElementById("userInput");
    const standaloneSend = document.getElementById("sendBtn");
    const standaloneChat = document.getElementById("chatContainer");
    const widgetForm = document.getElementById("blueAiForm");
    const widgetInput = document.getElementById("blueAiInput");
    const widgetMessages = document.getElementById("blueAiMessages");
    const widgetButton = document.getElementById("blueAiButton");
    const widgetChat = document.getElementById("blueAiChat");
    const widgetClose = document.getElementById("blueAiClose");

    const getReply = question => {
        const text = question.toLowerCase();
        if (text.includes("service") || text.includes("offer")) {
            return "TBS offers fashion, technology products, custom printing, bulk orders and digital solutions.";
        }
        if (text.includes("product") || text.includes("sell") || text.includes("price")) {
            return "You can shop TBS clothing, mugs, power banks, smartphones, smart watches and wireless earbuds from the store.";
        }
        if (text.includes("order") || text.includes("buy")) {
            return "Choose a product, select Add to cart, open your cart, and continue to checkout.";
        }
        if (text.includes("print") || text.includes("shirt") || text.includes("brand")) {
            return "TBS creates custom T-shirts, apparel and branded products for businesses, schools, churches, teams and events.";
        }
        if (text.includes("bulk") || text.includes("team")) {
            return "Use the Bulk Orders section to request a tailored quote for your organisation or team.";
        }
        return "I can help with TBS products, services, custom printing, bulk orders and placing an order. What would you like to know?";
    };

    const addStandaloneMessage = (question, answer) => {
        if (!standaloneChat) return;
        standaloneChat.insertAdjacentHTML("beforeend", `
            <div class="message user-message"><div class="avatar">You</div><div class="bubble"><p>${escapeAIText(question)}</p></div></div>
            <div class="message ai-message"><div class="avatar">B</div><div class="bubble"><strong>Blue AI</strong><p>${escapeAIText(answer)}</p></div></div>`);
        standaloneChat.scrollTop = standaloneChat.scrollHeight;
    };

    const addWidgetMessage = (question, answer) => {
        if (!widgetMessages) return;
        widgetMessages.insertAdjacentHTML("beforeend", `
            <div class="blue-ai-message user"><div class="blue-ai-bubble"><p>${escapeAIText(question)}</p></div></div>
            <div class="blue-ai-message bot"><div class="blue-ai-bubble"><strong>Blue AI</strong><p>${escapeAIText(answer)}</p></div></div>`);
        widgetMessages.scrollTop = widgetMessages.scrollHeight;
    };

    const submitStandalone = () => {
        const question = standaloneInput?.value.trim();
        if (!question) return;
        standaloneInput.value = "";
        addStandaloneMessage(question, getReply(question));
    };

    const submitWidget = question => {
        const cleanQuestion = question.trim();
        if (!cleanQuestion) return;
        addWidgetMessage(cleanQuestion, getReply(cleanQuestion));
    };

    standaloneSend?.addEventListener("click", submitStandalone);
    standaloneInput?.addEventListener("keydown", event => {
        if (event.key === "Enter") submitStandalone();
    });
    widgetForm?.addEventListener("submit", event => {
        event.preventDefault();
        submitWidget(widgetInput.value);
        widgetInput.value = "";
    });
    document.querySelectorAll(".blue-ai-suggestions button").forEach(button => {
        button.addEventListener("click", () => submitWidget(button.dataset.question || button.textContent));
    });
    widgetButton?.addEventListener("click", () => {
        widgetChat?.classList.add("active");
        widgetChat?.setAttribute("aria-hidden", "false");
        widgetInput?.focus();
    });
    widgetClose?.addEventListener("click", () => {
        widgetChat?.classList.remove("active");
        widgetChat?.setAttribute("aria-hidden", "true");
        widgetButton?.focus();
    });
    document.querySelectorAll(".suggestions button").forEach(button => {
        button.addEventListener("click", () => {
            if (standaloneInput) {
                standaloneInput.value = button.dataset.question || button.textContent.trim();
                submitStandalone();
            }
        });
    });

    const voiceButton = document.getElementById("voiceBtn");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceButton?.addEventListener("click", () => {
        if (!SpeechRecognition || !standaloneInput) {
            standaloneInput?.focus();
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.onresult = event => {
            standaloneInput.value = event.results[0][0].transcript;
            submitStandalone();
        };
        recognition.start();
    });
}

function escapeAIText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
}

window.askSuggestion = function askSuggestion(question) {
    const input = document.getElementById("userInput");
    const send = document.getElementById("sendBtn");
    if (!input || !send) return;
    input.value = question;
    send.click();
};
