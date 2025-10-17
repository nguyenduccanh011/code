// Runtime-configurable API base URL for frontend (standard: `window.API_BASE_URL`)
// - Production (same-origin behind reverse proxy): set to ''
// - Local dev default: http://127.0.0.1:5000 (unified server)
// Backward compatibility: support legacy `API_PROXY_BASE` + localStorage overrides.
(function configureApiBase() {
  try {
    const lsBase = (typeof localStorage !== 'undefined' && (localStorage.getItem('API_BASE_URL') || localStorage.getItem('API_PROXY_BASE'))) || undefined;
    const legacy = (typeof window !== 'undefined' && (window.API_PROXY_BASE)) || undefined;
    const explicit = (typeof window !== 'undefined' && window.API_BASE_URL !== undefined) ? window.API_BASE_URL : undefined;
    const sameOriginHint = explicit === '';
    const fallback = sameOriginHint ? '' : 'http://127.0.0.1:5000';
    const base = (explicit !== undefined ? explicit : (legacy || lsBase || fallback));
    window.API_BASE_URL = base;
    // Keep alias for older pages/scripts; prefer using API_BASE_URL going forward.
    window.API_PROXY_BASE = base;
  } catch (_) {
    // Safe fallback if anything goes wrong
    window.API_BASE_URL = window.API_BASE_URL === '' ? '' : (window.API_BASE_URL || 'http://127.0.0.1:5000');
    window.API_PROXY_BASE = window.API_BASE_URL;
  }
})();
