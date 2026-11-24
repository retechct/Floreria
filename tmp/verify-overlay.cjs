const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto('http://127.0.0.1:3000');
    await page.locator('[data-hero-dot="0"]').click();
    await page.waitForTimeout(350);
    const nav = page.locator('#hero-inmersivo .demo-nav');
    const background = await nav.evaluate(e => getComputedStyle(e).backgroundColor);
    if (background !== 'rgba(0, 0, 0, 0)') throw new Error(`${width}: ${background}`);
    await page.screenshot({ path: `tmp/transparent-fixed-${width}.png` });
    await page.evaluate(() => window.scrollTo(0, 180));
    await page.waitForTimeout(350);
    const scrolled = await nav.evaluate(e => getComputedStyle(e).backgroundColor);
    if (scrolled === 'rgba(0, 0, 0, 0)') throw new Error('Missing scroll background');
    console.log(`${width}: transparent at top, ${scrolled} on scroll`);
    await page.close();
  }
  await browser.close();
})();
