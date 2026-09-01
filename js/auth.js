/* Shared TBS login state and navigation controls. */
(function tbsAuth() {
    const protectedPages = ["admin.html", "account.html", "profile.html", "orders.html", "settings.html", "checkout.html"];
    const currentPage = location.pathname.split("/").pop() || "index.html";
    const token = () => localStorage.getItem("tbsToken");
    const getStoredUser = () => {
        try { return JSON.parse(localStorage.getItem("tbsUser") || "null"); } catch (error) { return null; }
    };
    const clearSession = () => {
        localStorage.removeItem("tbsToken");
        localStorage.removeItem("tbsUser");
        localStorage.removeItem("tbsLoggedIn");
    };
    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));

    function buildControls(user) {
        const host = document.querySelector(".header-actions, .site-header .navbar, body > header .navbar");
        if (!host || document.getElementById("tbsAuthButtons")) return;
        const controls = document.createElement("div");
        controls.className = "auth-buttons";
        controls.id = "tbsAuthButtons";
        controls.innerHTML = `<div id="loggedOutButtons"><a href="login.html" class="nav-btn login-btn">Login</a><a href="signup.html" class="nav-btn signup-btn">Sign Up</a></div><div id="loggedInButtons" hidden><button id="accountBtn" class="nav-btn account-btn" type="button" aria-expanded="false" aria-controls="accountMenu">${escapeHtml(user?.full_name || user?.name || "Account")} &#9662;</button><div id="accountMenu" class="account-menu" hidden><strong>${escapeHtml(user?.full_name || user?.name || "Account")}</strong><small>${escapeHtml(user?.email || "")}</small><a href="account.html">My Account</a><a href="profile.html">My Profile</a><a href="orders.html">My Orders</a><a href="settings.html">Settings</a><button id="logoutBtn" type="button">Logout</button></div></div>`;
        host.appendChild(controls);
        const accountButton = controls.querySelector("#accountBtn");
        const accountMenu = controls.querySelector("#accountMenu");
        accountButton?.addEventListener("click", () => {
            const open = accountButton.getAttribute("aria-expanded") === "true";
            accountButton.setAttribute("aria-expanded", String(!open));
            accountMenu.hidden = open;
        });
        controls.querySelector("#logoutBtn")?.addEventListener("click", () => {
            clearSession();
            window.location.href = "index.html";
        });
        document.addEventListener("click", event => {
            if (!controls.contains(event.target)) {
                accountButton?.setAttribute("aria-expanded", "false");
                if (accountMenu) accountMenu.hidden = true;
            }
        });
    }

    function updateButtons(user) {
        if (currentPage !== "index.html") {
            buildControls(user);
        }
        const loggedOut = document.getElementById("loggedOutButtons");
        const loggedIn = document.getElementById("loggedInButtons");
        if (loggedOut && loggedIn) {
            loggedOut.hidden = Boolean(user);
            loggedIn.hidden = !user;
        }
        document.querySelectorAll('a[href="login.html"], a[href="signup.html"]').forEach(link => {
            if (!link.closest("#tbsAuthButtons")) link.classList.toggle("tbs-auth-hidden", Boolean(user));
        });
    }

    async function checkSession() {
        const storedUser = getStoredUser();
        if (!token()) {
            updateButtons(null);
            if (protectedPages.includes(currentPage)) window.location.replace("login.html");
            return null;
        }
        try {
            const response = await window.tbsFetch("/users/me", { headers: { Authorization: `Bearer ${token()}` } }, 1);
            if (!response.ok) throw new Error("Session expired");
            const responseUser = await response.json();
            const user = responseUser.user || responseUser || storedUser;
            localStorage.setItem("tbsUser", JSON.stringify(user));
            updateButtons(user);
            return user;
        } catch (error) {
            clearSession();
            updateButtons(null);
            if (protectedPages.includes(currentPage)) window.location.replace("login.html");
            return null;
        }
    }

    function attachAuthForm(form, endpoint, redirect) {
        if (!form) return;
        form.addEventListener("submit", async event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const button = form.querySelector("button[type=submit]");
            const status = form.querySelector("[role=status], .login-message, .signup-status") || document.createElement("p");
            if (!status.parentNode) form.appendChild(status);
            const values = Object.fromEntries(new FormData(form));
            const payload = endpoint.includes("register")
                ? { full_name: values.full_name || document.getElementById("signup-name")?.value.trim(), email: values.email || document.getElementById("signup-email")?.value.trim(), phone: values.phone || document.getElementById("signup-phone")?.value.trim(), password: values.password || document.getElementById("signup-password")?.value }
                : { email: values.email, password: values.password };
            if (!payload.password || payload.password.length < 8) {
                status.textContent = "Password must be at least 8 characters.";
                status.className = "login-message error";
                return;
            }
            if (endpoint.includes("register") && payload.password !== values.confirm_password) {
                status.textContent = "Passwords do not match.";
                status.className = "login-message error";
                return;
            }
            if (endpoint.includes("register") && !form.querySelector("[name=terms]")?.checked) {
                status.textContent = "Please accept the Terms and Conditions.";
                status.className = "login-message error";
                return;
            }
            button.disabled = true;
            try {
                const response = await window.tbsFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 0);
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.message || "Authentication failed");
                if (!result.token || !result.user) throw new Error("Authentication response was incomplete");
                localStorage.setItem("tbsToken", result.token);
                localStorage.setItem("tbsUser", JSON.stringify(result.user));
                localStorage.setItem("tbsLoggedIn", "true");
                updateButtons(result.user);
                window.location.href = result.user.role === "admin" ? "admin.html" : redirect;
            } catch (error) {
                status.textContent = error.message;
                status.className = "login-message error";
            } finally {
                button.disabled = false;
            }
        }, true);
    }

    let initialized = false;
    function initialize() {
        if (initialized) return;
        initialized = true;
        updateButtons(getStoredUser());
        checkSession();
        attachAuthForm(document.querySelector("#signup-form"), "/auth/register", "index.html");
        attachAuthForm(currentPage === "login.html" ? document.querySelector("form") : null, "/auth/login", "index.html");
        document.addEventListener("click", event => {
            const socialButton = event.target.closest(".google-login-button, .facebook-login-button, .oauth-placeholder");
            if (!socialButton) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const status = document.querySelector("#signupMessage, #loginMessage, #signup-status");
            if (status) {
                status.textContent = `${socialButton.dataset.provider || "Social"} sign-in is not configured yet. Use email and password.`;
                status.className = "login-message error";
            }
        }, true);
        document.querySelectorAll(".oauth-placeholder").forEach(button => {
            button.addEventListener("click", async () => {
                const provider = button.dataset.provider?.toLowerCase();
                try {
                    const response = await window.tbsFetch(`/auth/${provider}`, {}, 0);
                    const result = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(result.message || `${button.dataset.provider} sign-in is not configured.`);
                    if (result.authorizationUrl) window.location.href = result.authorizationUrl;
                } catch (error) {
                    const status = document.querySelector("#signupMessage, #loginMessage");
                    if (status) { status.textContent = error.message; status.className = "login-message error"; }
                }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
