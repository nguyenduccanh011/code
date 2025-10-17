// Runtime-configurable API base URL for frontend
// - In production behind Nginx reverse proxy, set to '' (same-origin)
// - In local dev without proxy, leave undefined to fall back to localhost:5000
// You can override at deploy time by redefining `window.API_BASE_URL` before DataProvider loads.
window.API_BASE_URL = window.API_BASE_URL || '';

