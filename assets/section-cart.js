/* Main cart — quantity steppers + AJAX line-item updates */
(function () {
  'use strict';

  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function updateLine(line, quantity) {
    const body = { line: line, quantity: Math.max(0, parseInt(quantity, 10) || 0) };
    const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    return fetch(root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    })
    .then((res) => res.ok ? res.json() : null)
    .then((cart) => {
      if (cart) {
        document.dispatchEvent(new CustomEvent('cart:update', { detail: { count: cart.item_count, cart } }));
        // Refresh the cart section
        const url = window.location.pathname + '?section_id=' + (document.querySelector('.section-main-cart [id]') ? document.querySelector('.section-main-cart').id : '');
      }
      // Simple reload for robustness — section rendering API would be more elegant
      window.location.reload();
    })
    .catch(() => { /* silent */ });
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait);
    };
  }

  function init() {
    $all('[data-line-item]').forEach((row) => {
      const input = row.querySelector('[data-qty-input]');
      const dec = row.querySelector('[data-qty-decrease]');
      const inc = row.querySelector('[data-qty-increase]');
      if (!input) return;

      const line = parseInt(input.dataset.line, 10);

      const commit = debounce((qty) => {
        updateLine(line, qty);
      }, 350);

      if (dec) dec.addEventListener('click', () => {
        const next = Math.max(0, (parseInt(input.value, 10) || 1) - 1);
        input.value = next;
        commit(next);
      });
      if (inc) inc.addEventListener('click', () => {
        const next = (parseInt(input.value, 10) || 0) + 1;
        input.value = next;
        commit(next);
      });
      input.addEventListener('change', () => commit(input.value));
    });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shopify:section:load', (e) => {
    if (e.target.querySelector('.cart-section')) init();
  });
})();
