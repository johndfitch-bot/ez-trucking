const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE || 'http://localhost:5173';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

async function shoot(browser, url, file, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport(opts.viewport || DESKTOP);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, file), fullPage: opts.fullPage !== false });
  await page.close();
  console.log('shot', file);
}

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    await shoot(browser, `${BASE}/`, 'home-desktop.png');
    await shoot(browser, `${BASE}/`, 'home-mobile.png', { viewport: MOBILE });
    await shoot(browser, `${BASE}/gallery`, 'gallery-desktop.png');
  } finally {
    await browser.close();
  }
  console.log('Done');
}

main().catch((err) => { console.error(err); process.exit(1); });
