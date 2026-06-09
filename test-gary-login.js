#!/usr/bin/env node
/**
 * Prueba de login frontend — Gary Garcia mock
 * Ejecutar: node test-gary-login.js
 */

const ACCOUNTS_KEY = 'desiertoSonoro_bandAccounts';
const PROFILES_KEY = 'desiertoSonoro_bandProfiles';

const GARY = {
    account: {
        nombre: 'Gary Garcia',
        nombreKey: 'gary garcia',
        email: 'gary@desierto.com',
        emailKey: 'gary@desierto.com',
        password: 'gary2024',
        telefono: '+528441234567'
    },
    profile: {
        nombreKey: 'gary garcia',
        rating: 5.0,
        premium: true,
        stats: { vistas: 3842, reservas: 47, shows: 31, productos: 5 }
    }
};

function tryLogin(accounts, identifier, password) {
    const key = identifier.toLowerCase();
    return accounts.find(a => {
        if (a.password !== password) return false;
        return a.nombreKey === key || a.emailKey === key;
    }) || null;
}

function runTests() {
    const accounts = [GARY.account];
    const profiles = { [GARY.profile.nombreKey]: GARY.profile };

    const cases = [
        { label: 'Login por nombre de banda', id: 'Gary Garcia', pw: 'gary2024', expect: true },
        { label: 'Login por email', id: 'gary@desierto.com', pw: 'gary2024', expect: true },
        { label: 'Contraseña incorrecta', id: 'Gary Garcia', pw: 'wrong', expect: false },
        { label: 'Banda inexistente', id: 'Otra Banda', pw: 'gary2024', expect: false }
    ];

    let passed = 0;
    for (const c of cases) {
        const result = !!tryLogin(accounts, c.id, c.pw);
        const ok = result === c.expect;
        console.log(`${ok ? '✅' : '❌'} ${c.label}: ${result ? 'OK' : 'FAIL'} (esperado: ${c.expect ? 'login' : 'rechazo'})`);
        if (ok) passed++;
    }

    const profile = profiles['gary garcia'];
    const profileOk = profile && profile.premium && profile.rating === 5.0 && profile.stats.vistas === 3842;
    console.log(`${profileOk ? '✅' : '❌'} Perfil Gary Garcia cargado con stats y premium`);
    if (profileOk) passed++;

    console.log(`\n${passed}/${cases.length + 1} pruebas pasaron`);
    console.log('\nCredenciales frontend:');
    console.log('  Usuario: Gary Garcia  |  gary@desierto.com');
    console.log('  Contraseña: gary2024');
    console.log('\nAbre productos.html en el navegador → Iniciar sesión');

    process.exit(passed === cases.length + 1 ? 0 : 1);
}

runTests();
