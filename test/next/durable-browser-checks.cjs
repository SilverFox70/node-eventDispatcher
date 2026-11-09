const assert = require('node:assert/strict');

const text = (page, message) => page.getByText(message, { exact: true }).waitFor();

async function verifyCursorRecovery(page) {
  const pattern = '**/api/durable/wait?after=*';
  await page.route(pattern, route => route.fulfill({ status: 400 }));
  try {
    const response = page.waitForResponse(result => result.url().includes('/api/durable/wait?after=') && result.status() === 400);
    await page.getByRole('button', { name: 'Next page' }).click();
    await response;
    await page.getByRole('button', { name: 'First page' }).waitFor({ state: 'detached' });
  } finally { await page.unroute(pattern); }
  await text(page, 'Review approval');
}

async function verifyCommandFeedback(page) {
  const pattern = '**/api/durable/cancel';
  const cancel = page.getByRole('button', { name: 'Cancel run' });
  for (const [status, label] of [[409, 'Action conflicts with current state'], [403, 'Action refused']]) {
    await page.route(pattern, route => route.request().method() === 'POST' ? route.fulfill({ status }) : route.continue());
    try {
      await cancel.click();
      await text(page, label);
    } finally { await page.unroute(pattern); }
  }
  await text(page, 'Run: queued');
  assert.equal(await cancel.isEnabled(), true);
}

async function verifyReadFailure(page) {
  const pattern = '**/api/durable/cancel';
  const refresh = page.getByRole('button', { name: 'Refresh progress' });
  await page.route(pattern, route => route.fulfill({ status: 503 }));
  try {
    await refresh.click();
    await text(page, 'Connection: Disconnected');
    await text(page, 'Run: cancelled');
  } finally { await page.unroute(pattern); }
  await refresh.click();
  await text(page, 'Connection: Connected');
}

module.exports = { verifyCommandFeedback, verifyCursorRecovery, verifyReadFailure };
