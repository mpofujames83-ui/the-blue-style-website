/* =====================================================
   TBS - MAIN JAVASCRIPT
   Blue AI + Navigation + Cart + General Functions
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("TBS JavaScript loaded");
    window.__tbsBlueAiInitialized = true;


    /* =====================================================
       BLUE AI
    ===================================================== */

    const blueAiButton = document.getElementById("blueAiButton");
    const blueAiChat = document.getElementById("blueAiChat");
    const blueAiClose = document.getElementById("blueAiClose");
    const blueAiForm = document.getElementById("blueAiForm");
    const blueAiInput = document.getElementById("blueAiInput");
    const blueAiMessages = document.getElementById("blueAiMessages");
    const blueAiSend = document.getElementById("blueAiSend");
    const blueAiSuggestions =
        document.querySelectorAll(".blue-ai-suggestions button");


    /* =====================================================
       API CONFIGURATION
    ===================================================== */

    const API_BASE =
        window.TBS_API ||
        "http://localhost:5000/api";


    /* =====================================================
       OPEN BLUE AI
    ===================================================== */

    function openBlueAI() {

        if (!blueAiChat) {
            console.error("Blue AI chat was not found.");
            return;
        }

        blueAiChat.classList.add("open");

        blueAiChat.setAttribute(
            "aria-hidden",
            "false"
        );

        if (blueAiButton) {
            blueAiButton.setAttribute(
                "aria-expanded",
                "true"
            );

            blueAiButton.classList.add("active");
        }

        setTimeout(() => {

            if (blueAiInput) {
                blueAiInput.focus();
            }

        }, 150);
    }


    /* =====================================================
       CLOSE BLUE AI
    ===================================================== */

    function closeBlueAI() {

        if (!blueAiChat) {
            return;
        }

        blueAiChat.classList.remove("open");

        blueAiChat.setAttribute(
            "aria-hidden",
            "true"
        );

        if (blueAiButton) {

            blueAiButton.setAttribute(
                "aria-expanded",
                "false"
            );

            blueAiButton.classList.remove("active");
        }
    }


    /* =====================================================
       BUTTON EVENTS
    ===================================================== */

    if (blueAiButton) {

        blueAiButton.addEventListener(
            "click",
            openBlueAI
        );

    }


    if (blueAiClose) {

        blueAiClose.addEventListener(
            "click",
            closeBlueAI
        );

    }


    /* =====================================================
       ESC KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                blueAiChat &&
                blueAiChat.classList.contains("open")
            ) {

                closeBlueAI();

            }

        }
    );


    /* =====================================================
       ADD USER MESSAGE
    ===================================================== */

    function addUserMessage(message) {

        if (!blueAiMessages) {
            return;
        }

        const messageElement =
            document.createElement("div");

        messageElement.className =
            "blue-ai-message user";

        messageElement.innerHTML = `
            <div class="blue-ai-bubble">
                <p>${escapeHTML(message)}</p>
            </div>
        `;

        blueAiMessages.appendChild(
            messageElement
        );

        scrollBlueAI();
    }


    /* =====================================================
       ADD AI MESSAGE
    ===================================================== */

    function addAIMessage(message) {

        if (!blueAiMessages) {
            return;
        }

        const messageElement =
            document.createElement("div");

        messageElement.className =
            "blue-ai-message bot";

        messageElement.innerHTML = `
            <div class="blue-ai-bubble">
                <strong>Blue AI</strong>
                <p>${formatAIResponse(message)}</p>
            </div>
        `;

        blueAiMessages.appendChild(
            messageElement
        );

        scrollBlueAI();
    }


    /* =====================================================
       TYPING MESSAGE
    ===================================================== */

    function showTyping() {

        if (!blueAiMessages) {
            return;
        }

        removeTyping();

        const typing =
            document.createElement("div");

        typing.id =
            "blueAiTyping";

        typing.className =
            "blue-ai-message bot";

        typing.innerHTML = `
            <div class="blue-ai-bubble typing">
                <strong>Blue AI</strong>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        blueAiMessages.appendChild(
            typing
        );

        scrollBlueAI();
    }


    /* =====================================================
       REMOVE TYPING
    ===================================================== */

    function removeTyping() {

        const typing =
            document.getElementById(
                "blueAiTyping"
            );

        if (typing) {
            typing.remove();
        }
    }


    /* =====================================================
       SCROLL CHAT
    ===================================================== */

    function scrollBlueAI() {

        if (!blueAiMessages) {
            return;
        }

        blueAiMessages.scrollTop =
            blueAiMessages.scrollHeight;
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(text) {

        const div =
            document.createElement("div");

        div.textContent =
            text;

        return div.innerHTML;
    }


    /* =====================================================
       FORMAT AI RESPONSE
    ===================================================== */

    function formatAIResponse(text) {

        if (!text) {
            return "I couldn't generate a response.";
        }

        let safe =
            escapeHTML(text);

        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );

        safe =
            safe.replace(
                /\n/g,
                "<br>"
            );

        return safe;
    }


    /* =====================================================
       SEND MESSAGE TO BACKEND
    ===================================================== */

    async function sendBlueAIMessage(message) {

        const cleanMessage =
            message.trim();

        if (!cleanMessage) {
            return;
        }


        /* USER MESSAGE */

        addUserMessage(
            cleanMessage
        );


        /* CLEAR INPUT */

        if (blueAiInput) {
            blueAiInput.value = "";
        }


        /* DISABLE SEND */

        if (blueAiSend) {

            blueAiSend.disabled =
                true;

            blueAiSend.textContent =
                "Thinking...";
        }


        /* TYPING */

        showTyping();


        try {

            console.log(
                "Sending Blue AI request to:",
                API_BASE
            );


            const response =
                await window.tbsFetch(
                    "/ai/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                        body: JSON.stringify({
                            message:
                                cleanMessage
                        })
                    }
                );


            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            let data;


            if (
                contentType.includes(
                    "application/json"
                )
            ) {

                data =
                    await response.json();

            } else {

                const text =
                    await response.text();

                console.error(
                    "Backend returned non-JSON:",
                    text
                );

                throw new Error(
                    "Backend did not return JSON."
                );

            }


            removeTyping();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    data.error ||
                    "AI request failed."
                );

            }


            /*
                Support several common
                backend response formats.
            */

            const aiResponse =
                data.reply ||
                data.response ||
                data.message ||
                data.answer ||
                data.output;


            if (!aiResponse) {

                throw new Error(
                    "The AI server returned no answer."
                );

            }


            addAIMessage(
                aiResponse
            );


        } catch (error) {

            console.error(
                "Blue AI error:",
                error
            );

            removeTyping();


            addAIMessage(
                "I'm having trouble connecting to the TBS AI server right now. Please make sure your Node.js backend is running on port 5000."
            );

        } finally {

            if (blueAiSend) {

                blueAiSend.disabled =
                    false;

                blueAiSend.textContent =
                    "Send";

            }

            if (blueAiInput) {
                blueAiInput.focus();
            }
        }
    }


    /* =====================================================
       FORM SUBMIT
    ===================================================== */

    if (blueAiForm) {

        blueAiForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const message =
                    blueAiInput
                        ? blueAiInput.value
                        : "";

                await sendBlueAIMessage(
                    message
                );

            }
        );

    }


    /* =====================================================
       SUGGESTION BUTTONS
    ===================================================== */

    blueAiSuggestions.forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    const question =
                        button.dataset.question;

                    if (!question) {
                        return;
                    }

                    openBlueAI();

                    await sendBlueAIMessage(
                        question
                    );

                }
            );

        }
    );


    /* =====================================================
       ENTER TO SEND
    ===================================================== */

    if (blueAiInput) {

        blueAiInput.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    if (blueAiForm) {
                        blueAiForm.requestSubmit();
                    }

                }

            }
        );

    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    const menuBtn =
        document.getElementById(
            "menuBtn"
        );

    const nav =
        document.getElementById(
            "nav"
        );


    if (menuBtn && nav) {

        menuBtn.addEventListener(
            "click",
            () => {

                const open =
                    nav.classList.toggle(
                        "open"
                    );

                menuBtn.setAttribute(
                    "aria-expanded",
                    String(open)
                );

            }
        );


        nav.querySelectorAll("a")
            .forEach(
                (link) => {

                    link.addEventListener(
                        "click",
                        () => {

                            nav.classList.remove(
                                "open"
                            );

                            menuBtn.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }
                    );

                }
            );
    }


    /* =====================================================
       SHOP FILTER
    ===================================================== */

    const filterButtons =
        document.querySelectorAll(
            ".filter-btn"
        );

    const products =
        document.querySelectorAll(
            ".tbs-product"
        );

    const productSearch = document.getElementById("productSearch");

    function matchesProduct(product, filter) {
        const category = product.dataset.category;
        const term = productSearch?.value.trim().toLowerCase() || "";
        const searchable = `${product.textContent} ${category}`.toLowerCase();
        const categoryMatches = filter === "all" || category === filter || (filter === "picks" && product.dataset.pick === "true");
        return categoryMatches && searchable.includes(term);
    }


    filterButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const filter =
                        button.dataset.filter;


                    filterButtons.forEach(
                        (btn) => {

                            btn.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    products.forEach(
                        (product) => {

                            const show = matchesProduct(product, filter);


                            product.style.display =
                                show
                                    ? ""
                                    : "none";

                        }
                    );

                }
            );

        }
    );

    productSearch?.addEventListener("input", () => {
        const filter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
        products.forEach(product => { product.style.display = matchesProduct(product, filter) ? "" : "none"; });
    });


    /* =====================================================
       ADD TO CART
    ===================================================== */

    const addButtons =
        document.querySelectorAll(
            ".tbs-add-button"
        );

    let cart =
        JSON.parse(
            localStorage.getItem(
                "tbsCart"
            ) || "[]"
        );


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
    }


    addButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const productId =
                        button.dataset.productId;

                    const product =
                        document.querySelector(
                            `[data-id="${productId}"]`
                        );


                    if (!product) {
                        return;
                    }


                    const name =
                        product.querySelector(
                            "h3"
                        )?.textContent.trim();


                    const priceText =
                        product.querySelector(
                            ".tbs-price"
                        )?.textContent
                        .replace(
                            "$",
                            ""
                        );


                    const price =
                        Number(
                            priceText
                        ) || 0;


                    const existing =
                        cart.find(
                            item =>
                                item.id ===
                                productId
                        );


                    if (existing) {

                        existing.quantity++;

                    } else {

                        cart.push({

                            id:
                                productId,

                            name:
                                name,

                            price:
                                price,

                            quantity:
                                1

                        });

                    }


                    localStorage.setItem(
                        "tbsCart",
                        JSON.stringify(cart)
                    );


                    updateCartCount();


                    button.textContent =
                        "Added";


                    setTimeout(
                        () => {

                            button.innerHTML =
                                `<span class="cart-icon">+</span> Add to cart`;

                        },
                        1200
                    );

                }
            );

        }
    );


    updateCartCount();


    /* =====================================================
       CONTACT FORM
    ===================================================== */

    const contactForm =
        document.getElementById(
            "contactForm"
        );

    const contactStatus =
        document.getElementById(
            "contactStatus"
        );


    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                if (contactStatus) {

                    contactStatus.textContent =
                        "Sending...";

                }


                const formData =
                    new FormData(
                        contactForm
                    );


                try {

                    const response =
                        await fetch(
                            `${API_BASE}/contact`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    name:
                                        formData.get(
                                            "name"
                                        ),

                                    email:
                                        formData.get(
                                            "email"
                                        ),

                                    service:
                                        formData.get(
                                            "service"
                                        ),

                                    message:
                                        formData.get(
                                            "message"
                                        )

                                })
                            }
                        );


                    if (!response.ok) {
                        throw new Error(
                            "Contact request failed"
                        );
                    }


                    if (contactStatus) {

                        contactStatus.textContent =
                            "Message sent successfully.";

                    }


                    contactForm.reset();


                } catch (error) {

                    console.error(
                        error
                    );


                    if (contactStatus) {

                        contactStatus.textContent =
                            "We could not send your message right now. Please call or email TBS directly.";

                    }

                }

            }
        );

    }


    /* =====================================================
       BLUE AI READY
    ===================================================== */

    console.log(
        "Blue AI initialized."
    );

});
/* =====================================
   TBS BLUE AI
====================================== */

document.addEventListener("DOMContentLoaded", () => {

    if (window.__tbsBlueAiInitialized) return;

    const blueAiButton = document.getElementById("blueAiButton");
    const blueAiChat = document.getElementById("blueAiChat");
    const blueAiClose = document.getElementById("blueAiClose");
    const blueAiForm = document.getElementById("blueAiForm");
    const blueAiInput = document.getElementById("blueAiInput");
    const blueAiMessages = document.getElementById("blueAiMessages");
    const suggestions = document.querySelectorAll(
        ".blue-ai-suggestions button"
    );


    /* =====================================
       OPEN BLUE AI
    ===================================== */

    function openBlueAI() {

        if (!blueAiChat) return;

        blueAiChat.classList.add("active");

        blueAiChat.setAttribute(
            "aria-hidden",
            "false"
        );

        setTimeout(() => {

            if (blueAiInput) {
                blueAiInput.focus();
            }

        }, 200);

    }


    /* =====================================
       CLOSE BLUE AI
    ===================================== */

    function closeBlueAI() {

        if (!blueAiChat) return;

        blueAiChat.classList.remove("active");

        blueAiChat.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    /* =====================================
       BUTTON EVENTS
    ===================================== */

    if (blueAiButton) {

        blueAiButton.addEventListener(
            "click",
            openBlueAI
        );

    }


    if (blueAiClose) {

        blueAiClose.addEventListener(
            "click",
            closeBlueAI
        );

    }


    /* =====================================
       ESC KEY
    ===================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                blueAiChat &&
                blueAiChat.classList.contains("active")
            ) {

                closeBlueAI();

            }

        }
    );


    /* =====================================
       ADD MESSAGE
    ===================================== */

    function addMessage(
        message,
        type = "bot"
    ) {

        if (!blueAiMessages) return;

        const wrapper =
            document.createElement("div");

        wrapper.className =
            `blue-ai-message ${type}`;

        const bubble =
            document.createElement("div");

        bubble.className =
            "blue-ai-bubble";

        bubble.innerHTML =
            message;

        wrapper.appendChild(bubble);

        blueAiMessages.appendChild(wrapper);

        blueAiMessages.scrollTop =
            blueAiMessages.scrollHeight;

    }


    /* =====================================
       TYPING MESSAGE
    ===================================== */

    function showTyping() {

        const typing =
            document.createElement("div");

        typing.className =
            "blue-ai-message bot";

        typing.id =
            "blueAiTyping";

        typing.innerHTML = `
            <div class="blue-ai-bubble blue-ai-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        blueAiMessages.appendChild(typing);

        blueAiMessages.scrollTop =
            blueAiMessages.scrollHeight;

    }


    function removeTyping() {

        const typing =
            document.getElementById(
                "blueAiTyping"
            );

        if (typing) {
            typing.remove();
        }

    }


    /* =====================================
       TBS KNOWLEDGE
    ===================================== */

    function getTBSAnswer(question) {

        const q =
            question
                .toLowerCase()
                .trim();


        /* PRODUCTS */

        if (
            q.includes("product") ||
            q.includes("sell") ||
            q.includes("shop") ||
            q.includes("buy")
        ) {

            return `
                <strong>TBS Products</strong>
                <p>
                    TBS sells fashion, technology and
                    custom-printed products.
                </p>

                <p>
                    Some products include:
                </p>

                <ul>
                    <li>Custom Print T-shirts — $22</li>
                    <li>TBS Hoodie — $35</li>
                    <li>Smartphone — $180</li>
                    <li>Smart Watch — $45</li>
                    <li>Wireless Earbuds — $28</li>
                    <li>TBS Mug — $15</li>
                    <li>TBS Cap — $12</li>
                    <li>Power Bank — $30</li>
                </ul>
            `;

        }


        /* CUSTOM PRINTING */

        if (
            q.includes("custom") ||
            q.includes("print") ||
            q.includes("t-shirt") ||
            q.includes("shirt")
        ) {

            return `
                <strong>Custom Printing</strong>

                <p>
                    TBS provides custom printing for
                    T-shirts, businesses, schools,
                    churches, sports teams and events.
                </p>

                <p>
                    A Custom Print Tee starts from
                    <strong>$22.00</strong>.
                </p>

                <p>
                    Go to the
                    <strong>Custom Printing</strong>
                    section to request an order.
                </p>
            `;

        }


        /* BULK ORDERS */

        if (
            q.includes("bulk") ||
            q.includes("large order") ||
            q.includes("quantity") ||
            q.includes("team") ||
            q.includes("school")
        ) {

            return `
                <strong>Bulk Orders</strong>

                <p>
                    Yes. TBS accepts bulk orders for
                    businesses, schools, churches,
                    sports teams and organisations.
                </p>

                <p>
                    Contact TBS for a personalised
                    bulk quotation.
                </p>
            `;

        }


        /* ORDERING */

        if (
            q.includes("order") ||
            q.includes("checkout") ||
            q.includes("cart")
        ) {

            return `
                <strong>How to Order</strong>

                <p>
                    1. Choose a product from the TBS shop.
                </p>

                <p>
                    2. Click <strong>Add to Cart</strong>.
                </p>

                <p>
                    3. Open your cart.
                </p>

                <p>
                    4. Review your products and total.
                </p>

                <p>
                    5. Continue to checkout.
                </p>
            `;

        }


        /* PRICE */

        if (
            q.includes("price") ||
            q.includes("cost") ||
            q.includes("how much")
        ) {

            return `
                <strong>TBS Prices</strong>

                <p>
                    Current featured prices include:
                </p>

                <ul>
                    <li>Custom Print Tee — $22</li>
                    <li>TBS Hoodie — $35</li>
                    <li>Smartphone — $180</li>
                    <li>Smart Watch — $45</li>
                    <li>Wireless Earbuds — $28</li>
                    <li>TBS Mug — $15</li>
                    <li>TBS Cap — $12</li>
                    <li>Power Bank — $30</li>
                </ul>
            `;

        }


        /* CONTACT */

        if (
            q.includes("contact") ||
            q.includes("email") ||
            q.includes("phone") ||
            q.includes("whatsapp")
        ) {

            return `
                <strong>Contact TBS</strong>

                <p>
                    Email:
                    <strong>
                        mpofujames83@gmail.com
                    </strong>
                </p>

                <p>
                    Phone:
                    <strong>
                        +263 78 858 7669
                    </strong>
                </p>

                <p>
                    Location:
                    Victoria Falls, Zimbabwe.
                </p>

                <p>
                    You can also use the Contact section
                    on this website.
                </p>
            `;

        }


        /* ABOUT */

        if (
            q.includes("who") ||
            q.includes("about") ||
            q.includes("tbs")
        ) {

            return `
                <strong>About TBS</strong>

                <p>
                    TBS means
                    <strong>The Blue Style</strong>.
                </p>

                <p>
                    TBS is a Zimbabwean brand focused
                    on fashion, technology, custom
                    printing and digital solutions.
                </p>

                <p>
                    TBS is owned by
                    <strong>
                        Mpofu James
                    </strong>
                    and
                    <strong>
                        Perfect Nkomazana
                    </strong>.
                </p>
            `;

        }


        /* GREETING */

        if (
            q.includes("hello") ||
            q.includes("hi") ||
            q.includes("hey")
        ) {

            return `
                <strong>Hello!</strong>

                <p>
                    Welcome to Blue AI, the TBS Assistant.
                </p>

                <p>
                    I can help you with products,
                    prices, custom printing, bulk
                    orders and ordering.
                </p>
            `;

        }


        /* DEFAULT */

        return `
            <strong>I'm Blue AI.</strong>

            <p>
                I can help you with:
            </p>

            <ul>
                <li>TBS products</li>
                <li>Product prices</li>
                <li>Custom printing</li>
                <li>Bulk orders</li>
                <li>How to place an order</li>
                <li>TBS contact information</li>
            </ul>

            <p>
                Try asking:
                <strong>
                    "How much is a hoodie?"
                </strong>
            </p>
        `;

    }


    /* =====================================
       SEND QUESTION
    ===================================== */

    async function askBlueAI(question) {

        if (!question) return;

        addMessage(
            `<p>${escapeHTML(question)}</p>`,
            "user"
        );

        showTyping();


        /* Small realistic delay */

        await new Promise(
            resolve =>
                setTimeout(resolve, 600)
        );


        removeTyping();

        const answer =
            getTBSAnswer(question);

        addMessage(
            answer,
            "bot"
        );

    }


    /* =====================================
       FORM SUBMIT
    ===================================== */

    if (blueAiForm) {

        blueAiForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const question =
                    blueAiInput.value.trim();

                if (!question) return;

                blueAiInput.value = "";

                await askBlueAI(question);

            }
        );

    }


    /* =====================================
       QUICK QUESTIONS
    ===================================== */

    suggestions.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const question =
                        button.dataset.question;

                    if (!question) return;

                    await askBlueAI(question);

                }
            );

        }
    );


    /* =====================================
       HTML ESCAPE
    ===================================== */

    function escapeHTML(value) {

        const div =
            document.createElement("div");

        div.textContent =
            value;

        return div.innerHTML;

    }

});