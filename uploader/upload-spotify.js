/**
 * upload-spotify.js - Autonome Spotify for Creators podcast upload via Puppeteer
 * Versie 2.0 - 2026-04-23 (Pi/ARM, systeem-Chromium, persistent session)
 */

const puppeteer = require('puppeteer');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

program
    .requiredOption('--audio <path>', 'Absolute path to .m4a file')
    .requiredOption('--title <title>', 'Episode title')
    .requiredOption('--description <description>', 'Episode description')
    .option('--debug', 'Save screenshots + verbose logging', false);

program.parse(process.argv);
const opts = program.opts();

const DASHBOARD_URL = 'https://creators.spotify.com/pod/dashboard/home';
const TIMEOUT = 120000;
const UPLOAD_WAIT = 300000;
const CHROMIUM_PATH = '/usr/bin/chromium';
const PROFILE_DIR = path.join(process.env.HOME, 'spotify-uploader', 'chrome-profile');

if (!fs.existsSync(opts.audio)) {
    console.log(JSON.stringify({ status: 'failed', error: 'Audio file not found: ' + opts.audio }));
    process.exit(1);
}

if (!fs.existsSync(PROFILE_DIR)) {
    console.log(JSON.stringify({
        status: 'failed',
        error: 'Profile dir not found. Run login-spotify.js first.'
    }));
    process.exit(1);
}

const log = function() {
    const args = Array.prototype.slice.call(arguments);
    console.error('[' + new Date().toISOString() + ']', args.join(' '));
};

const ssDir = path.join(process.env.HOME, 'logs', 'spotify-uploader', 'screenshots');
fs.mkdirSync(ssDir, { recursive: true });

async function screenshot(page, name) {
    try {
        const file = path.join(ssDir, Date.now() + '-' + name + '.png');
        await page.screenshot({ path: file, fullPage: true });
        log('Screenshot:', file);
    } catch (e) {
        log('Screenshot failed:', e.message);
    }
}

async function run() {
    log('Launching Chromium with persistent profile:', PROFILE_DIR);

    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: CHROMIUM_PATH,
        userDataDir: PROFILE_DIR,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    let page;
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        log('Navigating to dashboard');
        await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
        await screenshot(page, '01-initial');

        const currentUrl = page.url();
        log('Current URL:', currentUrl);

        if (currentUrl.includes('accounts.spotify.com') || currentUrl.includes('login') || currentUrl.includes('accounts.google.com')) {
            throw new Error('Session expired. Re-run login-spotify.js to refresh cookies.');
        }

        log('Waiting for dashboard elements');
        await page.waitForFunction(function() {
            var text = document.body.innerText.toLowerCase();
            return text.indexOf('new episode') !== -1 || text.indexOf('nieuwe aflevering') !== -1;
        }, { timeout: TIMEOUT });
        await screenshot(page, '02-dashboard');

        log('Clicking New Episode');
        await page.evaluate(function() {
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button, a'));
            var btn = buttons.find(function(b) {
                var t = b.textContent.trim().toLowerCase();
                return t === 'new episode' || t === 'nieuwe aflevering' ||
                       t.indexOf('new episode') !== -1 || t.indexOf('nieuwe aflevering') !== -1;
            });
            if (btn) btn.click();
        });

        await page.waitForSelector('input[type="file"]', { timeout: TIMEOUT });
        await screenshot(page, '03-upload-screen');

        log('Uploading file:', opts.audio);
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(opts.audio);
        log('File sent, waiting for upload progress');

        await page.waitForFunction(function() {
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
            return buttons.some(function(b) {
                var t = b.textContent.trim().toLowerCase();
                return (t === 'next' || t === 'volgende') && !b.disabled;
            });
        }, { timeout: UPLOAD_WAIT });
        await screenshot(page, '04-upload-complete');
        log('Upload complete');

        await page.evaluate(function() {
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
            var btn = buttons.find(function(b) {
                var t = b.textContent.trim().toLowerCase();
                return (t === 'next' || t === 'volgende') && !b.disabled;
            });
            if (btn) btn.click();
        });
        log('Clicked Next');

        var titleSel = 'input[name="title"], input[data-testid="title-input"], input[placeholder*="title" i], input[placeholder*="titel" i]';
        await page.waitForSelector(titleSel, { timeout: TIMEOUT });

        await page.evaluate(function(sel) {
            var el = document.querySelector(sel);
            if (el) { el.focus(); el.select(); }
        }, titleSel);
        await page.keyboard.press('Delete');
        await page.type(titleSel, opts.title, { delay: 30 });
        log('Title filled');

        var descFilled = await page.evaluate(function(desc) {
            var selectors = [
                'textarea[name="description"]',
                '[data-testid="description-input"]',
                'div[role="textbox"][contenteditable="true"]',
                'div[contenteditable="true"]'
            ];
            for (var i = 0; i < selectors.length; i++) {
                var el = document.querySelector(selectors[i]);
                if (el) {
                    el.focus();
                    if (el.tagName === 'TEXTAREA') {
                        el.value = desc;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        el.innerText = desc;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    return selectors[i];
                }
            }
            return null;
        }, opts.description);
        log('Description filled via:', descFilled);

        await screenshot(page, '05-metadata-filled');

        await page.evaluate(function() {
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
            var btn = buttons.find(function(b) {
                var t = b.textContent.trim().toLowerCase();
                return (t === 'next' || t === 'volgende') && !b.disabled;
            });
            if (btn) btn.click();
        });
        log('Clicked Next - review page');

        await page.waitForFunction(function() {
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
            return buttons.some(function(b) {
                var t = b.textContent.trim().toLowerCase();
                return (t === 'publish' || t === 'publiceren' || t === 'publish now') && !b.disabled;
            });
        }, { timeout: TIMEOUT });
        await screenshot(page, '06-review');

        await page.evaluate(function() {
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
            var btn = buttons.find(function(b) {
                var t = b.textContent.trim().toLowerCase();
                return (t === 'publish' || t === 'publiceren' || t === 'publish now') && !b.disabled;
            });
            if (btn) btn.click();
        });
        log('Clicked Publish');

        await page.waitForFunction(function() {
            var text = document.body.innerText.toLowerCase();
            return text.indexOf('published') !== -1 || text.indexOf('gepubliceerd') !== -1 ||
                   text.indexOf('your episode is live') !== -1 || text.indexOf('je aflevering is live') !== -1;
        }, { timeout: TIMEOUT });
        await screenshot(page, '07-published');
        log('Publication confirmed');

        var episodeUrl = await page.evaluate(function() {
            var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="/episode/"]'));
            return links.length > 0 ? links[0].href : null;
        });

        const result = {
            status: 'success',
            episode_url: episodeUrl || page.url(),
            published_at: new Date().toISOString()
        };
        console.log(JSON.stringify(result));
        await browser.close();
        process.exit(0);

    } catch (err) {
        log('ERROR:', err.message);
        if (page) { await screenshot(page, '99-error').catch(function() {}); }
        console.log(JSON.stringify({ status: 'failed', error: err.message }));
        await browser.close().catch(function() {});
        process.exit(1);
    }
}

run();
