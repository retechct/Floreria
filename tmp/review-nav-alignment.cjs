const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 820, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto('http://localhost:3000', {waitUntil:'networkidle'});
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => scrollTo(0,0));
      await page.locator(`[data-hero-dot="${i}"]`).click();
      for (const y of [0,180]) {
        await page.evaluate(y => scrollTo(0,y), y);
        await page.waitForTimeout(300);
        const result = await page.locator('.hero-option.is-active').evaluate(slide => {
          const nav = slide.querySelector('.demo-nav, .hero-frame-header');
          const brand = nav.querySelector('.demo-brand, .hero-frame-brand');
          const text = brand.querySelector('span,strong') || brand;
          const nr = nav.getBoundingClientRect(), tr = text.getBoundingClientRect();
          return {offset:Math.round((tr.top+tr.bottom-nr.top-nr.bottom)/2),height:nr.height};
        });
        console.log(width, i+1, y, result);
      }
    }
    await page.close();
  }
  await browser.close();
})();
