/** Native-fetch cookbook adapter. Non-success status rejects; caller owns cancellation. */
async function text(response) {
  if (!response.ok) {
    await response.body?.cancel();
    const error = new Error('HTTP request failed');
    error.code = 'HTTP_ERROR'; error.status = response.status;
    throw error;
  }
  return response.text();
}
const wwwHandler = {
  async get(url, { signal } = {}) {
    return text(await globalThis.fetch(url, { signal, redirect: 'error' }));
  },
  async post(url, form, { signal } = {}) {
    return text(await globalThis.fetch(url, { method: 'POST', body: new globalThis.URLSearchParams(form), signal, redirect: 'error' }));
  },
};
module.exports = { wwwHandler };
