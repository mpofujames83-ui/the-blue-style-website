const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const config = require("./config/env");

const databasePath = path.resolve(__dirname, config.databasePath);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        image_url TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        user_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        delivery_address TEXT,
        total REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        payment_method TEXT NOT NULL DEFAULT 'not_selected',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_number TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        quantity INTEGER,
        details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analytics_visitors (
        visitor_id TEXT PRIMARY KEY,
        display_name TEXT,
        first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_sessions INTEGER NOT NULL DEFAULT 0,
        total_pageviews INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id TEXT PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        pageviews INTEGER NOT NULL DEFAULT 0,
        device_type TEXT NOT NULL DEFAULT 'unknown',
        browser TEXT NOT NULL DEFAULT 'unknown',
        operating_system TEXT NOT NULL DEFAULT 'unknown',
        traffic_source TEXT NOT NULL DEFAULT 'direct',
        FOREIGN KEY (visitor_id) REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics_pageviews (
        event_id TEXT PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        page_path TEXT NOT NULL,
        page_title TEXT,
        viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visitor_id) REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES analytics_sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        donor_name TEXT NOT NULL,
        donor_email TEXT,
        amount REAL NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'USD',
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        provider_reference TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        invited_by INTEGER NOT NULL,
        accepted_user_id INTEGER,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invited_by) REFERENCES users(id),
        FOREIGN KEY (accepted_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen ON analytics_visitors(last_seen);
    CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen ON analytics_sessions(last_seen);
    CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_viewed_at ON analytics_pageviews(viewed_at);
    CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
    CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(payment_status);
    CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity(created_at);
`);

const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map(column => column.name);
if (!orderColumns.includes("order_number")) db.exec("ALTER TABLE orders ADD COLUMN order_number TEXT");
if (!orderColumns.includes("payment_method")) db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'not_selected'");
if (!orderColumns.includes("payment_status")) db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'");
if (!orderColumns.includes("payment_reference")) db.exec("ALTER TABLE orders ADD COLUMN payment_reference TEXT");

db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)");

const analyticsVisitorColumns = db.prepare("PRAGMA table_info(analytics_visitors)").all().map(column => column.name);
if (!analyticsVisitorColumns.includes("display_name")) db.exec("ALTER TABLE analytics_visitors ADD COLUMN display_name TEXT");

const userColumns = db.prepare("PRAGMA table_info(users)").all().map(column => column.name);
if (!userColumns.includes("profile_photo")) db.exec("ALTER TABLE users ADD COLUMN profile_photo TEXT");
if (!userColumns.includes("last_login")) db.exec("ALTER TABLE users ADD COLUMN last_login DATETIME");

module.exports = db;