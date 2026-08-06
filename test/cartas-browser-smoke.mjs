import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const executablePath = process.env.CHROME_EXECUTABLE_PATH || '';
const results = [];

async function runViewport(browser, name, viewport, outcome = '', extra = false) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleErrors.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`.trim());
  });

  const url = `http://localhost:4173/cartas/?mockCartas=1${outcome ? `&mockOutcome=${outcome}` : ''}${extra ? '&mockExtra=1' : ''}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const initialTitle = await page.locator('h1').innerText();
  const mockNoteVisible = await page.locator('[data-mock-note]').isVisible();
  const saveInitiallyDisabled = await page.locator('[data-save-deck]').isDisabled();
  await page.locator('[data-photo-form] button').click();
  await page.waitForSelector('.cartas-game-card', { timeout: 5000 });
  const cards = await page.locator('.cartas-game-card').count();
  const selectedInitially = await page.locator('.cartas-game-card.is-selected').count();
  const saveEnabledAfterCards = !(await page.locator('[data-save-deck]').isDisabled());
  await page.locator('[data-card-detail]').first().click();
  await page.waitForSelector('[data-card-detail-modal]:not([hidden])', { timeout: 5000 });
  const modalOpened = await page.locator('[data-card-detail-modal]').isVisible();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('[data-card-detail-modal]')?.hidden === true, null, { timeout: 5000 });
  const modalClosed = !(await page.locator('[data-card-detail-modal]').isVisible());
  await page.locator('[data-toggle-card]').first().click();
  const selectedAfterRemoval = await page.locator('.cartas-game-card.is-selected').count();
  const saveDisabledAfterRemoval = await page.locator('[data-save-deck]').isDisabled();
  await page.locator('[data-toggle-card]').first().click();
  const selectedAfterReselect = await page.locator('.cartas-game-card.is-selected').count();
  let limitMessage = '';
  if (extra) {
    await page.locator('[data-toggle-card]').nth(3).click();
    limitMessage = await page.locator('[data-card-status]').innerText();
  }
  const deckItems = await page.locator('[data-deck] article').count();
  const synergiesText = await page.locator('[data-synergies]').innerText();
  await page.locator('[data-save-deck]').click();
  await page.locator('[data-start-battle]').click();
  await page.waitForSelector('[data-battle]:not([hidden])', { timeout: 5000 });
  await page.locator('[data-battle-action="attack"]').click();
  await page.locator('[data-battle-action="defend"]').click();
  await page.locator('[data-battle-action="ability"]').click();
  await page.locator('[data-switch-select]').selectOption('1');
  await page.locator('[data-battle-action="switch"]').click();
  for (let index = 0; index < 25; index += 1) {
    const status = await page.locator('[data-card-status]').innerText();
    if (/Tutorial vencido|máquina venceu/i.test(status)) break;
    await page.locator('[data-battle-action="ability"]').click();
  }
  const finalStatus = await page.locator('[data-card-status]').innerText();

  results.push({
    name: outcome ? `${name}-${outcome}` : name,
    initialTitle,
    mockNoteVisible,
    saveInitiallyDisabled,
    cards,
    selectedInitially,
    saveEnabledAfterCards,
    modalOpened,
    modalClosed,
    selectedAfterRemoval,
    saveDisabledAfterRemoval,
    selectedAfterReselect,
    limitMessage,
    deckItems,
    hasSynergy: /Trindade|sinergia|bônus/i.test(synergiesText),
    battleVisible: await page.locator('[data-battle]').isVisible(),
    logItems: await page.locator('[data-battle-log] li').count(),
    finalStatus,
    horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2),
    consoleErrors,
    failedRequests
  });

  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {})
});

await runViewport(browser, 'desktop', { width: 1440, height: 1000 });
await runViewport(browser, 'mobile', { width: 390, height: 844 });
await runViewport(browser, 'desktop', { width: 1440, height: 1000 }, 'defeat');
await runViewport(browser, 'desktop-extra', { width: 1440, height: 1000 }, '', true);

const protectionPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await protectionPage.goto('http://0.0.0.0:4173/cartas/?mockCartas=1', { waitUntil: 'networkidle' });
results.push({
  name: 'mock-protection-non-localhost',
  mockLoadedOutsideLocalhost: await protectionPage.locator('[data-mock-note]').isVisible(),
  status: await protectionPage.locator('[data-card-status]').innerText().catch(() => '')
});
await protectionPage.close();
await browser.close();

console.log(JSON.stringify(results, null, 2));
