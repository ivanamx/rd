/**
 * Cliente de autenticación y datos — usa API PostgreSQL con fallback a localStorage.
 */
(function () {
    const API_BASE = '';

    async function apiFetch(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    }

    async function login(identifier, password) {
        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ identifier, password })
            });
            return data;
        } catch (_) {
            return null;
        }
    }

    async function getProfile(nombreKey) {
        try {
            return await apiFetch(`/api/auth/profile?nombreKey=${encodeURIComponent(nombreKey)}`);
        } catch (_) {
            return null;
        }
    }

    async function fetchProductos() {
        try {
            const data = await apiFetch('/api/productos');
            return data.productos || null;
        } catch (_) {
            return null;
        }
    }

    async function fetchArtistas() {
        try {
            const data = await apiFetch('/api/artistas');
            return data.artistas || null;
        } catch (_) {
            return null;
        }
    }

    function syncSessionToLocalStorage(account, profile) {
        const ACCOUNTS_KEY = 'desiertoSonoro_bandAccounts';
        const PROFILES_KEY = 'desiertoSonoro_bandProfiles';
        const SESSION_KEY = 'desiertoSonoro_bandSession';

        try {
            const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
            const idx = accounts.findIndex(a => a.nombreKey === account.nombreKey);
            const stored = { ...account, password: '' };
            if (idx >= 0) accounts[idx] = { ...accounts[idx], ...stored };
            else accounts.push(stored);
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

            if (profile) {
                const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
                profiles[profile.nombreKey] = profile;
                localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
            }

            localStorage.setItem(SESSION_KEY, JSON.stringify({
                nombreKey: account.nombreKey,
                nombre: account.nombre,
                tipo: account.tipo || 'banda'
            }));
        } catch (_) { /* storage unavailable */ }
    }

    window.AuthAPI = {
        login,
        getProfile,
        fetchProductos,
        fetchArtistas,
        syncSessionToLocalStorage
    };
})();
