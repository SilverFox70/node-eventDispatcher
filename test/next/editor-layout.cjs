const assert = require('node:assert/strict');
const { join } = require('node:path');

async function verifyWorkspaceLayout(page, server, evidence) {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 1720, height: 1100 });
    await page.goto(server.url + '/editor');
    const viewport = page.locator('.nodeflow-viewport');
    assert((await page.locator('main.editor-demo').boundingBox()).width > 1650);
    const bounds = await viewport.boundingBox();
    for (const [name, panel] of [['Palette width', '.nodeflow-palette'], ['Inspector width', '.nodeflow-inspector']]) {
      const width = (await page.locator(panel).boundingBox()).width;
      await page.getByRole('slider', { name }).press('ArrowRight');
      assert((await page.locator(panel).boundingBox()).width > width);
    }
    assert((await viewport.boundingBox()).width < bounds.width);
    const inspector = page.locator('.nodeflow-inspector');
    const widthBeforeDrag = (await inspector.boundingBox()).width;
    const slider = await page.getByRole('slider', { name: 'Inspector width' }).boundingBox();
    const sliderY = slider.y + slider.height / 2;
    await page.mouse.move(slider.x + slider.width * .35, sliderY);
    await page.mouse.down();
    await page.mouse.move(slider.x + slider.width * .75, sliderY, { steps: 5 });
    await page.mouse.up();
    assert((await inspector.boundingBox()).width > widthBeforeDrag);
    await page.getByRole('slider', { name: 'Canvas height' }).press('ArrowRight');
    assert((await viewport.boundingBox()).height > bounds.height);
    await page.screenshot({ path: join(evidence, 'editor-workspace-wide.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.getByRole('slider', { name: 'Palette width' }).count(), 0);
    assert.equal(await page.getByRole('slider', { name: 'Inspector width' }).count(), 0);
    assert((await viewport.boundingBox()).width < 390);
    assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth));
    await page.screenshot({ path: join(evidence, 'editor-workspace-narrow.png') });
  } finally { await page.setViewportSize(original); }
}

module.exports = { verifyWorkspaceLayout };
