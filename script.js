/* =========================================
   TBS — THE BLUE STYLE
   WEBSITE JAVASCRIPT
========================================= */


/* =========================================
   PRODUCTS
========================================= */

const products = [

    {
        id: 1,
        name: "TBS Signature Tee",
        category: "fashion",
        price: 18,
        icon: "👕",
        description: "Premium everyday T-shirt",
        tag: "TBS PICK"
    },

    {
        id: 2,
        name: "Custom Print Tee",
        category: "fashion",
        price: 22,
        icon: "🎨",
        description: "Made for your design",
        tag: "CUSTOM"
    },

    {
        id: 3,
        name: "TBS Hoodie",
        category: "fashion",
        price: 35,
        icon: "🧥",
        description: "Comfortable premium hoodie",
        tag: "NEW"
    },

    {
        id: 4,
        name: "Smartphone",
        category: "tech",
        price: 180,
        icon: "📱",
        description: "Modern smart device",
        tag: "TECH"
    },

    {
        id: 5,
        name: "Smart Watch",
        category: "tech",
        price: 45,
        icon: "⌚",
        description: "Stay connected on the go",
        tag: "POPULAR"
    },

    {
        id: 6,
        name: "Wireless Earbuds",
        category: "tech",
        price: 28,
        icon: "🎧",
        description: "Compact wireless audio",
        tag: "TECH"
    },

    {
        id: 7,
        name: "TBS Cap",
        category: "fashion",
        price: 12,
        icon: "🧢",
        description: "Classic branded cap",
        tag: "TBS"
    },

    {
        id: 8,
        name: "Power Bank",
        category: "tech",
        price: 25,
        icon: "🔋",
        description: "Portable everyday power",
        tag: "TECH"
    }

];


/* =========================================
   CART
========================================= */

let cart = [];

try {

    cart =
        JSON.parse(
            localStorage.getItem("tbsCart")
        ) || [];

    if (!Array.isArray(cart)) {
        cart = [];
    }

} catch (error) {

    console.error(
        "Could not load cart:",
        error
    );

    cart = [];
}


/* =========================================
   DOM ELEMENTS
========================================= */

const productsContainer =
    document.getElementById("products");

const cartPanel =
    document.getElementById("cartPanel");

const cartItems =
    document.getElementById("cartItems");

const cartTotal =
    document.getElementById("cartTotal");

const cartCount =
    document.getElementById("cartCount");

const overlay =
    document.getElementById("overlay");

const modal =
    document.getElementById("modal");

const modalContent =
    document.getElementById("modalContent");

const nav =
    document.getElementById("nav");

const menuButton =
    document.getElementById("menuBtn");


/* =========================================
   DISPLAY PRODUCTS
========================================= */

function displayProducts(filter = "all") {

    if (!productsContainer) {
        return;
    }

    const filteredProducts =
        products.filter(product => {

            if (filter === "all") {
                return true;
            }

            return product.category === filter;

        });


    productsContainer.innerHTML =
        filteredProducts.map(product => {

            return `

                <article class="product-card">

                    <div class="product-image">

                        <span class="product-tag">
                            ${product.tag}
                        </span>

                        ${product.icon}

                    </div>


                    <div class="product-info">

                        <h3>
                            ${product.name}
                        </h3>

                        <p>
                            ${product.description}
                        </p>


                        <div class="product-row">

                            <span class="price">
                                $${product.price.toFixed(2)}
                            </span>


                            <button
                                class="add-to-cart"
                                type="button"
                                onclick="addToCart(${product.id})"
                            >
                                Add to cart
                            </button>

                        </div>

                    </div>

                </article>

            `;

        }).join("");

}


/* =========================================
   ADD TO CART
========================================= */

function addToCart(product) {

    if (typeof product === "number") {
        product = products.find(item => item.id === product);
    }


    if (!product) {
        return;
    }


    cart.push({
        ...product
    });


    saveCart();

    openCart();

}


/* =========================================
   SAVE CART
========================================= */

function saveCart() {

    try {

        localStorage.setItem(
            "tbsCart",
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error(
            "Could not save cart:",
            error
        );

    }


    updateCartCount();

    displayCart();

}


/* =========================================
   UPDATE CART COUNT
========================================= */

function updateCartCount() {

    if (!cartCount) {
        return;
    }

    cartCount.textContent =
        cart.length;

}


/* =========================================
   DISPLAY CART
========================================= */

function displayCart() {

    if (!cartItems) {
        return;
    }


    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="cart-empty">

                <div class="cart-empty-icon">
                    🛒
                </div>

                <strong>
                    Your TBS cart is empty.
                </strong>

                <p>
                    Add something you love.
                </p>

            </div>

        `;


        if (cartTotal) {
            cartTotal.textContent = "$0.00";
        }

        return;
    }


    cartItems.innerHTML =
        cart.map(
            (product, index) => {

                return `

                    <div class="cart-item">

                        <div class="cart-item-image">
                            ${
                                product.image
                                    ? `<img src="${product.image}" alt="${product.name}">`
                                    : (product.icon || "")
                            }
                        </div>


                        <div class="cart-item-info">

                            <h4>
                                ${product.name}
                            </h4>

                            <p>
                                ${product.description}
                            </p>

                            <span class="item-price">
                                $${product.price.toFixed(2)}
                            </span>

                        </div>


                        <button
                            class="cart-item-remove"
                            type="button"
                            onclick="removeFromCart(${index})"
                        >
                            Remove
                        </button>

                    </div>

                `;

            }
        ).join("");


    const total =
        cart.reduce(
            (sum, product) =>
                sum + Number(product.price || 0),
            0
        );


    if (cartTotal) {

        cartTotal.textContent =
            "$" + total.toFixed(2);

    }

}


/* =========================================
   REMOVE FROM CART
========================================= */

function removeFromCart(index) {

    if (
        index < 0 ||
        index >= cart.length
    ) {
        return;
    }


    cart.splice(index, 1);

    saveCart();

}


/* =========================================
   OPEN CART
========================================= */

function openCart() {

    if (!cartPanel || !overlay) {
        return;
    }


    cartPanel.classList.add("active");

    overlay.classList.add("active");

    document.body.style.overflow = "hidden";

}


/* =========================================
   CLOSE CART
========================================= */

function closeCart() {

    if (!cartPanel || !overlay) {
        return;
    }


    cartPanel.classList.remove("active");

    overlay.classList.remove("active");

    document.body.style.overflow = "";

}


/* =========================================
   CART BUTTONS
========================================= */

document
    .getElementById("cartBtn")
    ?.addEventListener(
        "click",
        openCart
    );


/* =========================================
   GALLERY — ADD TO CART
======================================== */

document
    .querySelectorAll(".tbs-add-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const card =
                    button.closest(".tbs-product");

                if (!card) {
                    return;
                }

                const name =
                    card.querySelector("h3").textContent.trim();

                const priceText =
                    card.querySelector(".tbs-price").textContent.trim();

                const price =
                    parseFloat(
                        priceText.replace(/[^0-9.]/g, "")
                    );

                const image =
                    card.querySelector("img").getAttribute("src");

                const descriptionNode =
                    card.querySelector(".tbs-product-info p");

                const description =
                    descriptionNode
                        ? descriptionNode.textContent.trim()
                        : "";

                addToCart({
                    name,
                    price,
                    image,
                    description
                });

            }
        );

    });


/* =========================================
   PRODUCT SEARCH + CATEGORY LINKS
======================================== */

let activeFilter = "all";
let searchTerm = "";

function applyProductFilters() {

    if (!productsContainer) {
        return;
    }

    const term =
        searchTerm
            .trim()
            .toLowerCase();

    const filtered =
        products.filter(product => {

            const matchesFilter =
                activeFilter === "all" ||
                product.category === activeFilter;

            const matchesSearch =
                !term ||
                product.name.toLowerCase().includes(term) ||
                product.description.toLowerCase().includes(term);

            return matchesFilter && matchesSearch;

        });

    productsContainer.innerHTML = "";

    if (filtered.length === 0) {

        productsContainer.innerHTML = `
            <p style="color:#667085;">
                No products match your search.
            </p>
        `;

        return;

    }

    displayProductsList(filtered);

}


function displayProductsList(list) {

    productsContainer.innerHTML =
        list.map(product => {

            return `

                <article class="product-card">

                    <div class="product-image">

                        <span class="product-tag">
                            ${product.tag}
                        </span>

                        ${product.icon}

                    </div>


                    <div class="product-info">

                        <h3>
                            ${product.name}
                        </h3>

                        <p>
                            ${product.description}
                        </p>


                        <div class="product-row">

                            <span class="price">
                                $${product.price.toFixed(2)}
                            </span>


                            <button
                                class="add-to-cart"
                                type="button"
                                onclick="addToCart(${product.id})"
                            >
                                Add to cart
                            </button>

                        </div>

                    </div>

                </article>

            `;

        }).join("");

}


const productSearch =
    document.getElementById("productSearch");

productSearch?.addEventListener(
    "input",
    event => {

        searchTerm = event.target.value;

        applyProductFilters();

    }
);


document
    .querySelectorAll(".filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".filter")
                    .forEach(btn => {
                        btn.classList.remove("active");
                    });

                button.classList.add("active");

                activeFilter = button.dataset.filter;

                applyProductFilters();

            }
        );

    });


document
    .querySelectorAll(".category-card[data-category-link]")
    .forEach(card => {

        card.addEventListener(
            "click",
            event => {

                const category =
                    card.dataset.categoryLink;

                if (!category) {
                    return;
                }

                event.preventDefault();

                nav?.classList.remove("active");

                document
                    .getElementById("shop")
                    ?.scrollIntoView(
                        { behavior: "smooth" }
                    );

                activeFilter = category;

                document
                    .querySelectorAll(".filter")
                    .forEach(btn => {
                        btn.classList.toggle(
                            "active",
                            btn.dataset.filter === category
                        );
                    });

                applyProductFilters();

            }
        );

    });


document
    .getElementById("closeCart")
    ?.addEventListener(
        "click",
        closeCart
    );


overlay?.addEventListener(
    "click",
    closeCart
);


/* =========================================
   PRODUCT FILTERS
========================================= */

document
    .querySelectorAll(".filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".filter")
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                applyProductFilters();

            }
        );

    });


/* =========================================
   MOBILE MENU
========================================= */

menuButton?.addEventListener(
    "click",
    () => {

        nav?.classList.toggle(
            "active"
        );

    }
);


document
    .querySelectorAll("#nav a")
    .forEach(link => {

        link.addEventListener(
            "click",
            () => {

                nav?.classList.remove(
                    "active"
                );

            }
        );

    });


/* =========================================
   MODAL
========================================= */

function showModal(
    title,
    content
) {

    if (!modal || !modalContent) {
        return;
    }


    modalContent.innerHTML = `

        <h2>
            ${title}
        </h2>

        ${content}

    `;


    modal.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";

}


function closeModal() {

    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


document
    .getElementById("modalClose")
    ?.addEventListener(
        "click",
        closeModal
    );


modal?.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {

            closeModal();

        }

    }
);


/* =========================================
   ESCAPE KEY
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }

        closeModal();
        closeCart();

    }
);


/* =========================================
   CUSTOM PRINTING
========================================= */

function customRequest() {

    showModal(

        "Custom Printing",

        `

        <p class="modal-text">
            Tell TBS what you would like printed
            and our team can help you plan your order.
        </p>


        <form id="customForm" class="modal-form">

            <input
                type="text"
                name="name"
                placeholder="Full name"
                required
            >


            <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                required
            >


            <input
                type="email"
                name="email"
                placeholder="Email address"
                required
            >


            <input
                type="text"
                name="organisation"
                placeholder="Company / School / Team"
            >


            <textarea
                name="requirements"
                rows="5"
                placeholder="Describe your printing requirements..."
                required
            ></textarea>


            <button
                type="submit"
                class="btn btn-primary"
            >
                Send Request →
            </button>

        </form>

        `

    );


    document
        .getElementById("customForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                showSuccess(
                    "Request received!",
                    "Thank you for contacting TBS. We will contact you about your custom printing request."
                );

            }
        );

}


document
    .getElementById("customBtn")
    ?.addEventListener(
        "click",
        customRequest
    );


/* =========================================
   BULK ORDERS
========================================= */

function openBulkOrder() {

    showModal(

        "Bulk Order Quote",

        `

        <p class="modal-text">
            Request a quote for your school,
            church, business, sports team or event.
        </p>


        <form id="bulkForm" class="modal-form">

            <input
                type="text"
                name="name"
                placeholder="Full name"
                required
            >


            <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                required
            >


            <input
                type="email"
                name="email"
                placeholder="Email address"
                required
            >


            <input
                type="text"
                name="organisation"
                placeholder="Organisation / School / Team"
            >


            <input
                type="number"
                name="quantity"
                placeholder="Estimated quantity"
                min="1"
                required
            >


            <textarea
                name="details"
                rows="4"
                placeholder="Tell us about your order..."
                required
            ></textarea>


            <button
                type="submit"
                class="btn btn-primary"
            >
                Request Quote →
            </button>

        </form>

        `

    );


    document
        .getElementById("bulkForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                showSuccess(
                    "Quote request received!",
                    "TBS will contact you with your bulk-order quotation."
                );

            }
        );

}


document
    .getElementById("bulkBtn")
    ?.addEventListener(
        "click",
        openBulkOrder
    );


/* =========================================
   LOGIN
========================================= */

function openLogin() {

    showModal(

        "Sign in to TBS",

        `

        <p class="modal-text">
            Sign in to manage your TBS account
            and orders.
        </p>


        <form id="loginForm" class="modal-form">

            <input
                type="email"
                name="email"
                placeholder="Email address"
                required
            >


            <input
                type="password"
                name="password"
                placeholder="Password"
                required
            >


            <button
                type="submit"
                class="btn btn-primary"
            >
                Sign In
            </button>

        </form>

        `

    );


    document
        .getElementById("loginForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                showSuccess(
                    "Demo login",
                    "The login interface is working. A real account system requires a backend and database."
                );

            }
        );

}


document
    .getElementById("loginBtn")
    ?.addEventListener(
        "click",
        openLogin
    );


/* =========================================
   HEADER LOGIN LINK
========================================= */

document
    .querySelector(
        '.header-actions a[href="#login"]'
    )
    ?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openLogin();

        }
    );


/* =========================================
   SIGN UP
========================================= */

function openSignup() {

    showModal(

        "Create TBS Account",

        `

        <p class="modal-text">
            Create your customer account.
        </p>


        <form id="signupForm" class="modal-form">

            <input
                type="text"
                name="name"
                placeholder="Full name"
                required
            >


            <input
                type="email"
                name="email"
                placeholder="Email address"
                required
            >


            <input
                type="password"
                name="password"
                placeholder="Create password"
                minlength="6"
                required
            >


            <select
                name="accountType"
                required
            >

                <option value="Customer">
                    Customer
                </option>

                <option value="Business">
                    Business
                </option>

            </select>


            <button
                type="submit"
                class="btn btn-primary"
            >
                Create Account
            </button>

        </form>

        `

    );


    document
        .getElementById("signupForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                showSuccess(
                    "Account created",
                    "The signup interface is working. Connect this form to your backend when you are ready for real customer accounts."
                );

            }
        );

}


document
    .getElementById("signupBtn")
    ?.addEventListener(
        "click",
        openSignup
    );


/* =========================================
   CONTACT FORM
========================================= */

document
    .getElementById("contactForm")
    ?.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            event.target.reset();


            showSuccess(
                "Message Sent",
                "Thank you! Your message has been received by TBS."
            );

        }
    );


/* =========================================
   SUCCESS MESSAGE
========================================= */

function showSuccess(
    title,
    message
) {

    showModal(

        title,

        `

        <div class="success">

            <strong>
                ${message}
            </strong>

        </div>

        `

    );

}


/* =========================================
   CHECKOUT
========================================= */

function openCheckout() {

    if (cart.length === 0) {

        showModal(

            "Your Cart Is Empty",

            `

            <p class="modal-text">
                Add a TBS product before checking out.
            </p>

            `

        );

        return;
    }


    const total =
        cart.reduce(
            (sum, product) =>
                sum + Number(product.price || 0),
            0
        );


    const items =
        cart.map(
            product =>
                `<div>
                    ${product.name}
                    — $${Number(product.price).toFixed(2)}
                </div>`
        ).join("");


    showModal(

        "TBS Checkout",

        `

        <div class="order-summary">

            <strong>
                Order Summary
            </strong>

            <br><br>

            ${items}

            <hr style="margin:12px 0;border:none;border-top:1px solid #ddd;">

            <strong>
                Total: $${total.toFixed(2)}
            </strong>

        </div>


        <form id="checkoutForm" class="modal-form">

            <input
                type="text"
                name="name"
                placeholder="Full name"
                required
            >


            <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                required
            >


            <input
                type="text"
                name="location"
                placeholder="Delivery location"
                required
            >


            <select
                name="payment"
                required
            >

                <option value="EcoCash">
                    EcoCash
                </option>

                <option value="Bank Transfer">
                    Bank Transfer
                </option>

                <option value="Cash on Collection">
                    Cash on Collection
                </option>

            </select>


            <button
                type="submit"
                class="btn btn-primary"
            >
                Place Order →
            </button>

        </form>

        `

    );


    document
        .getElementById("checkoutForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const orderNumber =
                    "TBS-" +
                    Date.now()
                        .toString()
                        .slice(-6);


                cart = [];


                saveCart();


                closeCart();


                showSuccess(
                    "Order Received!",
                    `Your TBS order ${orderNumber} has been recorded. We will contact you to confirm payment and delivery.`
                );

            }
        );

}


document
    .getElementById("checkoutBtn")
    ?.addEventListener(
        "click",
        openCheckout
    );


/* =========================================
   BLUE AI ASSISTANT
======================================== */

const blueAiButton = document.getElementById("blueAiButton");
const blueAiChat   = document.getElementById("blueAiChat");
const blueAiClose  = document.getElementById("blueAiClose");
const blueAiForm   = document.getElementById("blueAiForm");
const blueAiInput  = document.getElementById("blueAiInput");
const blueAiSend   = document.getElementById("blueAiSend");
const blueAiMessages = document.getElementById("blueAiMessages");

function openBlueAi() {
    blueAiChat?.classList.add("active");
    blueAiInput?.focus();
}

function closeBlueAi() {
    blueAiChat?.classList.remove("active");
}

function addBlueAiMessage(text, sender) {

    if (!blueAiMessages) return;

    const message = document.createElement("div");

    message.className = "blue-ai-message " + sender;

    message.innerHTML =
        `<div class="blue-ai-avatar">✦</div>` +
        `<div class="blue-ai-bubble"><p>${text}</p></div>`;

    blueAiMessages.appendChild(message);

    blueAiMessages.scrollTop = blueAiMessages.scrollHeight;

}


function getBlueAiReply(question) {

    const q = question.toLowerCase();

    if (q.includes("product") || q.includes("sell") || q.includes("shop") || q.includes("buy")) {

        return "TBS sells fashion & T-shirts, phones & technology, custom printed apparel and bulk-order products. Browse the Shop section or tap a category card on the homepage to explore.";

    }

    if (q.includes("custom") || q.includes("print") || q.includes("tshirt") || q.includes("t-shirt") || q.includes("design")) {

        return "Our Custom Printing service puts your brand, team or idea on T-shirts, uniforms and branded products. Prices start from around $22 for a custom print tee. Tap “Request Custom Printing” and tell us what you need.";

    }

    if (q.includes("order") || q.includes("place") || q.includes("how to")) {

        return "Ordering is easy: 1) Choose a product or describe your print, 2) Send your artwork or work with us on the design, 3) Approve quantity & delivery, 4) We produce and deliver. Use the contact form or any “Request” button to start.";

    }

    if (q.includes("bulk") || q.includes("team") || q.includes("school") || q.includes("church") || q.includes("business") || q.includes("quote")) {

        return "Yes! TBS accepts bulk orders for schools, churches, businesses, sports teams and events. Tap “Request Bulk Quote” and we’ll send you a tailored price.";

    }

    if (q.includes("deliver") || q.includes("zimbabwe") || q.includes("ship") || q.includes("collect")) {

        return "TBS is Zimbabwe based and offers delivery or collection across the country. Delivery details are confirmed when you place your order.";

    }

    if (q.includes("price") || q.includes("cost") || q.includes("much") || q.includes("fee")) {

        return "Our prices range from about $18 for a signature tee up to $899 for laptops. Custom and bulk pricing depends on quantity and design — request a quote for exact numbers.";

    }

    if (q.includes("account") || q.includes("login") || q.includes("sign") || q.includes("register")) {

        return "You can create a TBS account to save details and track orders. Use the “Sign In” / “Create Account” buttons or visit the login and sign-up pages.";

    }

    if (q.includes("contact") || q.includes("whatsapp") || q.includes("email") || q.includes("reach")) {

        return "Reach TBS via the contact form on the homepage, WhatsApp at +263 788 587 669, or email mpofujames83@gmail.com. We reply to online enquiries 24/7.";

    }

    if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("help")) {

        return "Hey! I’m Blue AI, your TBS assistant. Ask me about products, custom printing, bulk orders, pricing or how to order. 👋";

    }

    return "Thanks for your question! TBS — The Blue Style — offers fashion, technology, custom printing and bulk orders in Zimbabwe. For a quick answer, contact us via the form or WhatsApp +263 788 587 669.";

}


function sendBlueAiMessage(text) {

    if (!text || !text.trim()) return;

    addBlueAiMessage(text.trim(), "user");

    blueAiInput.value = "";

    setTimeout(() => {

        addBlueAiMessage(getBlueAiReply(text), "bot");

    }, 450);

}


blueAiButton?.addEventListener("click", openBlueAi);

blueAiClose?.addEventListener("click", closeBlueAi);

blueAiForm?.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        sendBlueAiMessage(blueAiInput.value);

    }
);

blueAiSend?.addEventListener(
    "click",
    () => sendBlueAiMessage(blueAiInput.value)
);

document
    .querySelectorAll(".blue-ai-suggestions button")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => sendBlueAiMessage(button.dataset.question)
            );

        }
    );


/* =========================================
   INITIALIZE WEBSITE
======================================== */

displayProducts();

updateCartCount();

displayCart();


console.log(
    "TBS — The Blue Style website loaded successfully."
);