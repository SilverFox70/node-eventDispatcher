'use strict';

/** Legacy example HTTP helpers; response bodies remain text, including HTTP errors. */
const wwwHandler = {
  async get(url) {
    const response = await fetch(url, { redirect: 'error' });
    return response.text();
  },

  async post(url, form) {
    const response = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams(form),
      redirect: 'error'
    });
    return response.text();
  }
};

module.exports = { wwwHandler };
