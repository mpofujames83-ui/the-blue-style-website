// Client-side login/signup behavior.
// This handles form submission and redirects the user after success.

function showNotification(message) {
    if (!message) return;
    alert(message);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#login-form');
    const signupForm = document.querySelector('#signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', event => {
            event.preventDefault();
            const email = document.querySelector('#login-email').value.trim();
            const password = document.querySelector('#login-password').value.trim();

            if (!email || !password) {
                showNotification('Please enter both email and password.');
                return;
            }

            localStorage.setItem('blueStyleUserEmail', email);
            localStorage.setItem('blueStyleLoggedIn', 'true');
            window.location.href = 'index.html';
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', event => {
            event.preventDefault();
            const name = document.querySelector('#signup-name').value.trim();
            const email = document.querySelector('#signup-email').value.trim();
            const password = document.querySelector('#signup-password').value.trim();

            if (!name || !email || !password) {
                showNotification('Please fill out all fields to sign up.');
                return;
            }

            // Simple client-side registration simulation
            localStorage.setItem('blueStyleUserEmail', email);
            localStorage.setItem('blueStyleUserName', name);
            localStorage.setItem('blueStyleLoggedIn', 'true');
            window.location.href = 'index.html';
        });
    }

    const welcomeBanner = document.querySelector('#welcome-banner');
    const isLoggedIn = localStorage.getItem('blueStyleLoggedIn') === 'true';
    const userName = localStorage.getItem('blueStyleUserName');
    const userEmail = localStorage.getItem('blueStyleUserEmail');

    if (welcomeBanner && isLoggedIn) {
        const displayName = userName || userEmail || 'Guest';
        welcomeBanner.textContent = `Welcome back, ${displayName}!`; 
        welcomeBanner.classList.remove('hidden');
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('login') === 'success') {
        showNotification('Login successful!');
    }
});
