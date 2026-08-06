import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const executablePath = process.env.CHROME_EXECUTABLE_PATH || '';

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {})
});

for (const [name, viewport] of Object.entries({
  desktop: { width: 1440, height: 1100 },
  mobile: { width: 390, height: 1200 }
})) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:4173/cartas/?mockCartas=1', { waitUntil: 'networkidle' });
  await page.locator('[data-photo-form] button').click();
  await page.waitForSelector('.cartas-game-card', { timeout: 5000 });
  await page.screenshot({ path: `test/screenshots/cartas-${name}.png`, fullPage: true });
  await page.close();
}

await browser.close();
