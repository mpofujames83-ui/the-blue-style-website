/* TBS API configuration. Set window.TBS_API_URL before this file for production. */
(function configureTbsApi() {
    const configuredUrl = window.TBS_API_URL;
    const isLocalFile = window.location.protocol === "file:";
    const isLocalWebsite = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const defaultUrl = isLocalFile || (isLocalWebsite && window.location.port === "5500")
        ? "http://localhost:5000"
        : window.location.origin;
    const apiUrl = String(configuredUrl || defaultUrl).replace(/\/$/, "");

    window.TBS_API_URL = apiUrl;
    window.TBS_API = `${apiUrl}/api`;

    window.tbsFetch = async function tbsFetch(path, options = {}, retries = 2) {
        const url = path.startsWith("http") ? path : `${window.TBS_API}${path.startsWith("/") ? path : `/${path}`}`;
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                console.warn(`[TBS API] ${response.status} ${options.method || "GET"} ${url}`);
            }
            return response;
        } catch (error) {
            console.warn(`[TBS API] Backend offline: ${url}`);
            if (retries > 0) {
                await new Promise(resolve => window.setTimeout(resolve, 500));
                return window.tbsFetch(path, options, retries - 1);
            }
            throw error;
        }
    };

    window.tbsCheckHealth = async function tbsCheckHealth() {
        try {
            const response = await window.tbsFetch("/health", {}, 1);
            if (!response.ok) throw new Error(`Health check failed (${response.status})`);
            console.info(`[TBS API] Connected: ${window.TBS_API_URL}`);
            return true;
        } catch (error) {
            console.warn(`[TBS API] Offline: ${window.TBS_API_URL}`);
            return false;
        }
    };

    window.tbsCheckHealth();
    window.setInterval(window.tbsCheckHealth, 60000);
})();
