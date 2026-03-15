const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'home-full.png'),
    fullPage: true,
  });

  await page.goto('http://localhost:5173/gallery', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'gallery-full.png'),
    fullPage: true,
  });

  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'admin-full.png'),
    fullPage: true,
  });

  await browser.close();
  console.log('Screenshots saved to /screenshots');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
