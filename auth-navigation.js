/* Shared TBS authentication state and navigation. */
(function tbsAuthNavigation() {
    const currentPage = location.pathname.split("/").pop() || "index.html";
    const publicPages = ["login.html", "signup.html", "thankyou.html", "blue-ai.html", "donate.html", "index.html", ""];
    const protectedPages = ["admin.html", "account.html", "profile.html", "orders.html", "settings.html"];
    const token = () => localStorage.getItem("tbsToken");
    const storedUser = () => {
        try { return JSON.parse(localStorage.getItem("tbsUser") || "null"); } catch (error) { return null; }
    };
    const clearSession = () => { localStorage.removeItem("tbsToken"); localStorage.removeItem("tbsUser"); localStorage.removeItem("tbsLoggedIn"); };
    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));

    function createAccountMenu(user) {
        const host = document.querySelector(".header-actions, .site-header .navbar, body > header .navbar");
        if (!host || document.getElementById("tbsAccountMenu")) return;
        const menu = document.createElement("div");
        menu.className = "tbs-account-menu";
        menu.id = "tbsAccountMenu";
        menu.innerHTML = `<button class="tbs-account-toggle" type="button" aria-expanded="false" aria-controls="tbsAccountDropdown">${escapeHtml(user?.full_name || user?.name || "Account")} <span aria-hidden="true">&#9662;</span></button><div class="tbs-account-dropdown" id="tbsAccountDropdown" hidden><strong>${escapeHtml(user?.full_name || user?.name || "TBS Customer")}</strong><small>${escapeHtml(user?.email || "")}</small><a href="account.html">My Account</a><a href="profile.html">My Profile</a><a href="orders.html">My Orders</a><a href="settings.html">Settings</a><button type="button" data-tbs-logout>Logout</button></div>`;
        host.appendChild(menu);
        const toggle = menu.querySelector(".tbs-account-toggle");
        const dropdown = menu.querySelector(".tbs-account-dropdown");
        toggle.addEventListener("click", () => { const open = toggle.getAttribute("aria-expanded") === "true"; toggle.setAttribute("aria-expanded", String(!open)); dropdown.hidden = open; });
        menu.querySelector("[data-tbs-logout]").addEventListener("click", () => { clearSession(); window.location.href = "index.html"; });
        document.addEventListener("click", event => { if (!menu.contains(event.target)) { toggle.setAttribute("aria-expanded", "false"); dropdown.hidden = true; } });
    }

    function updateNavigation(user) {
        document.querySelectorAll('a[href="login.html"], a[href="signup.html"], .login-link, .signup-link').forEach(link => link.classList.toggle("tbs-auth-hidden", Boolean(user)));
        if (user) createAccountMenu(user);
    }

    async function validateSession() {
        if (!token()) { updateNavigation(null); if (protectedPages.includes(currentPage)) window.location.href = "login.html"; return null; }
        try {
            const response = await window.tbsFetch("/users/me", { headers: { Authorization: `Bearer ${token()}` } }, 1);
            if (!response.ok) throw new Error("Session expired");
            const data = await response.json();
            const user = data.user || data;
            localStorage.setItem("tbsUser", JSON.stringify(user));
            updateNavigation(user);
            return user;
        } catch (error) {
            clearSession(); updateNavigation(null);
            if (protectedPages.includes(currentPage)) window.location.href = "login.html";
            return null;
        }
    }

    function authSubmit(form, endpoint, fields, redirect) {
        form.addEventListener("submit", async event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const button = form.querySelector("button[type=submit]");
            const message = form.querySelector("[role=status], .login-message, .signup-status") || document.createElement("p");
            if (!message.parentNode) form.appendChild(message);
            const body = Object.fromEntries(new FormData(form));
            const payload = Object.fromEntries(fields.map(field => [field, body[field] || document.getElementById(field === "full_name" ? "signup-name" : `signup-${field}`)?.value || ""]));
            if (payload.password && payload.password.length < 8) { message.textContent = "Password must be at least 8 characters."; message.className = "signup-status failed"; return; }
            button.disabled = true; button.textContent = "Connecting...";
            try {
                const response = await window.tbsFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 0);
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.message || "Authentication failed");
                if (result.token) { localStorage.setItem("tbsToken", result.token); localStorage.setItem("tbsUser", JSON.stringify(result.user)); localStorage.setItem("tbsLoggedIn", "true"); updateNavigation(result.user); window.location.href = result.user?.role === "admin" ? "admin.html" : redirect; }
                else { message.textContent = "Account created. Please log in."; message.className = "signup-status sent"; setTimeout(() => { window.location.href = "login.html"; }, 700); }
            } catch (error) { message.textContent = error.message; message.className = "signup-status failed"; } finally { button.disabled = false; button.textContent = endpoint.includes("register") ? "Sign Up" : "Sign In"; }
        }, true);
    }

    document.addEventListener("DOMContentLoaded", () => {
        validateSession();
        const loginForm = document.querySelector("form") && currentPage === "login.html" ? document.querySelector("form") : null;
        const signupForm = document.getElementById("signup-form");
        if (loginForm) authSubmit(loginForm, "/auth/login", ["email", "password"], "index.html");
        if (signupForm) authSubmit(signupForm, "/auth/register", ["full_name", "email", "password"], "index.html");
    });
})();
