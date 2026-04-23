/**
 * login-spotify.js - Eenmalige handmatige login voor Spotify for Creators.
 *
 * Opent Chromium in visible mode (NIET headless) zodat je via VNC kunt
 * inloggen via 'Continue with Google' SSO. De sessie (cookies, localStorage)
 * wordt bewaard in ~/spotify-uploader/chrome-profile/.
 * Daarna kan upload-spotify.js die profielmap hergebruiken zonder opnieuw in te loggen.
 *
 * Gebruik (via VNC op de Pi):
 *   node login-spotify.js
 *
 * Klaar wanneer je het creators.spotify.com dashboard ziet. Sluit dan het browservenster.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const CHROMIUM_PATH = '/usr/bin/chromium';
const PROFILE_DIR = path.join(process.env.HOME, 'spotify-uploader', 'chrome-profile');
const DASHBOARD_URL = 'https://creators.spotify.com/pod/dashboard/home';

fs.mkdirSync(PROFILE_DIR, { recursive: true });

(async function() {
    console.log('');
    console.log('==========================================================');
    console.log('  HANDMATIGE LOGIN voor Spotify for Creators');
    console.log('==========================================================');
    console.log('');
    console.log('Er opent zo een browservenster. Doe het volgende:');
    console.log('');
    console.log('  1. Klik "Continue with Google" (als niet ingelogd)');
    console.log('  2. Selecteer je Gmail-account');
    console.log('  3. Wacht tot je het Spotify Creator dashboard ziet');
    console.log('  4. Kies "Stay signed in" / "Blijf ingelogd" indien gevraagd');
    console.log('  5. Sluit dan het browservenster (klik het rode kruisje)');
    console.log('');
    console.log('De cookies worden automatisch opgeslagen in:');
    console.log('  ' + PROFILE_DIR);
    console.log('');
    console.log('Starting browser...');
    console.log('');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: CHROMIUM_PATH,
        userDataDir: PROFILE_DIR,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--start-maximized'
        ]
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' }).catch(function(e) {
        console.log('Navigation note:', e.message);
    });

    browser.on('disconnected', function() {
        console.log('');
        console.log('Browser gesloten. Sessie opgeslagen in:');
        console.log('  ' + PROFILE_DIR);
        console.log('');
        console.log('Je kunt nu autonoom uploaden met:');
        console.log('  node upload-spotify.js --audio /pad/naar/file.m4a --title "..." --description "..."');
        console.log('');
        process.exit(0);
    });
})();
