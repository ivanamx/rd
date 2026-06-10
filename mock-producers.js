/**
 * Datos mock de productores de radio (localStorage).
 * Credenciales Hector Garcia:
 *   Usuario: Hector Garcia  o  producer@desierto.com
 *   Contraseña: producer2024
 */
(function () {
    const ACCOUNTS_KEY = 'desiertoSonoro_bandAccounts';

    const HECTOR_GARCIA = {
        nombre: 'Hector Garcia',
        nombreKey: 'hector garcia',
        email: 'producer@desierto.com',
        emailKey: 'producer@desierto.com',
        password: 'producer2024',
        telefono: '+528441987654',
        tipo: 'producer'
    };

    function upsertAccount(account) {
        const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
        const idx = accounts.findIndex(a => a.nombreKey === account.nombreKey);
        if (idx >= 0) accounts[idx] = { ...accounts[idx], ...account };
        else accounts.push(account);
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }

    window.seedMockProducers = function seedMockProducers() {
        upsertAccount(HECTOR_GARCIA);
    };

    window.MOCK_PRODUCER_CREDENTIALS = {
        hectorGarcia: {
            name: HECTOR_GARCIA.nombre,
            email: HECTOR_GARCIA.email,
            password: HECTOR_GARCIA.password
        }
    };
})();
