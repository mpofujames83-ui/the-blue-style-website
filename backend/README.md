# TBS API

Secure REST API for TBS - The Blue Style. The API owns catalog data, authentication, checkout, orders, customers, contact messages, and admin operations.

## Local setup

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm start
```

The API runs at `http://localhost:5000`. Check `GET /api/health` before connecting the frontend.

Frontend pages load the shared `api-config.js`. Local files and a Live Server page on port `5500` use `http://localhost:5000`; a deployed same-origin site uses its own origin. For a separately deployed API, define `window.TBS_API_URL` before loading `api-config.js` with the deployed backend URL.

For a separately hosted production frontend, set the URL before the config script:

```html
<script>window.TBS_API_URL = "https://your-real-tbs-backend.example.com";</script>
<script src="api-config.js"></script>
```

Set a long random `JWT_SECRET` in `.env`. Never commit `.env`, `data/`, or payment credentials.

## Architecture

- `app.js`: Express application, security middleware, rate limits, and route mounting
- `server.js`: production-friendly process bootstrap and graceful shutdown
- `config/`: environment configuration
- `middleware/`: authentication, authorization, validation, and error handling
- `routes/`: REST resources for auth, products, orders, users, and contact
- `database.js`: SQLite connection, migrations, foreign keys, and schema

## API flow

1. Register or log in at `POST /api/auth/register` or `POST /api/auth/login`.
	Compatibility aliases are also available at `POST /api/signup` and `POST /api/login`.
2. Send `Authorization: Bearer <token>` for checkout and customer/admin endpoints.
3. Read products from `GET /api/products` and send product IDs plus quantities to `POST /api/orders`.
4. The server validates stock, calculates totals from its catalog, creates an order number, decrements stock atomically, and records payment status.
5. Admins use `GET /api/orders`, `PUT /api/orders/:id/status`, `GET /api/products`, and `GET /api/users`.

Authentication also exposes `GET /api/auth/me` and `POST /api/auth/logout` (both protected). Google and Facebook buttons intentionally return a configuration error until real OAuth client credentials and callback handlers are configured; they never create fake accounts or tokens.

## Visitor analytics

The website automatically posts anonymous events to `POST /api/analytics/track`. The browser stores a random visitor ID locally and a 30-minute session ID in session storage. Duplicate event IDs are ignored, so a repeated request cannot inflate page-view totals. The server stores no names, emails, passwords, payment data, exact location, or raw IP address.

The browser uses `POST /api/analytics/session` on entry, `POST /api/analytics/pageview` for page changes, and `POST /api/analytics/heartbeat` every minute while the page is visible. A visitor is online only when `last_seen` is within `ANALYTICS_ONLINE_MINUTES` (default five minutes).

Admin reporting endpoints require an admin JWT:

- `GET /api/analytics/overview?period=today|week|month`
- `GET /api/analytics/visitors?period=today|week|month`
- `GET /api/analytics/pageviews?period=today|week|month`
- `GET /api/analytics/realtime`
- `GET /api/analytics/history`

Open `analytics.html`, enter an admin token, and select a period to view the dashboard. For production, set `TBS_ANALYTICS_API` before loading the website if the API is hosted on a different origin.

## Donations

- `POST /api/donations` creates a pending donation and returns a unique reference.
- `POST /api/donations/webhook` accepts a provider-signed status update using `X-Payment-Webhook-Secret`.
- `GET /api/donations/overview` returns admin-only totals and recent supporters.

The public form never accepts or stores card numbers, CVV, bank credentials, or payment tokens. Integrate a real payment provider at the `pending` step and call the webhook only after the provider confirms payment. Set `PAYMENT_WEBHOOK_SECRET` in production.

Card data is never accepted or stored by this API. A payment gateway should tokenize or process card details externally, then update the order using a gateway webhook and the stored `payment_reference`.

## Production

Use `NODE_ENV=production`, a strong secret, a persistent `DATABASE_PATH`, explicit `CORS_ORIGINS`, HTTPS, and a process manager such as systemd, Docker, or PM2. Put the API behind a reverse proxy and configure backups for the SQLite database or replace `database.js` with a managed SQL adapter without changing route contracts.
