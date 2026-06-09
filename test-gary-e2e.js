#!/usr/bin/env node
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://127.0.0.1:9876/productos.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.seedMockBands === 'function');
    await page.evaluate(() => window.seedMockBands());

    // Verificar seed en localStorage
    const seeded = await page.evaluate(() => {
        const accounts = JSON.parse(localStorage.getItem('desiertoSonoro_bandAccounts') || '[]');
        const profiles = JSON.parse(localStorage.getItem('desiertoSonoro_bandProfiles') || '{}');
        return {
            hasAccount: accounts.some(a => a.nombreKey === 'gary garcia'),
            hasProfile: !!profiles['gary garcia'],
            profileName: profiles['gary garcia']?.nombre,
            rating: profiles['gary garcia']?.rating
        };
    });

    console.log('Seed localStorage:', seeded);

    // Abrir login
    await page.click('#loginBtn');
    await page.waitForSelector('#loginModal.open');

    // Login Gary Garcia
    await page.fill('#loginIdentifier', 'Gary Garcia');
    await page.fill('#loginPassword', 'gary2024');
    await page.click('.login-submit');

    await page.waitForSelector('#bandProfilePanel.open', { timeout: 5000 });

    const profileVisible = await page.isVisible('#bandProfilePanel.open');
    const bandName = await page.textContent('.bpp-name');
    const premium = await page.isVisible('.bpp-premium-badge');
    const loginBtnText = await page.textContent('#loginBtn span');

    console.log('Perfil abierto:', profileVisible);
    console.log('Nombre en perfil:', bandName?.trim());
    console.log('Badge premium:', premium);
    console.log('Nav muestra banda:', loginBtnText?.trim());

    const ok = profileVisible && bandName?.includes('Gary Garcia') && premium && loginBtnText?.includes('Gary Garcia');
    console.log(ok ? '\n✅ E2E login + perfil OK' : '\n❌ E2E falló');

    await browser.close();
    process.exit(ok ? 0 : 1);
})().catch(err => {
    console.error('❌ E2E error:', err.message);
    process.exit(1);
});
