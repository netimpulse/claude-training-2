/* Product Showcase — video autoplay/hover/end-frame + variant switching + quantity + AJAX cart */
(function () {
  'use strict';

  /* ========== VIDEO WITH HOVER + END-FRAME ========== */
  class ProductShowcaseVideo extends HTMLElement {
    connectedCallback() {
      this.video = this.querySelector('video');
      this.poster = this.querySelector('.product-showcase__poster');
      this.hasCustomPoster = this.dataset.hasPoster === 'true';
      this.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!this.video) return;
      this.video.muted = true;
      this.video.playsInline = true;
      this.setupVideo();
    }

    setupVideo() {
      // Initial autoplay — tries to play once; if blocked (older browsers), just shows first frame
      if (!this.prefersReduced) {
        const p = this.video.play();
        if (p && typeof p.catch === 'function') p.catch(() => { /* silently ignore */ });
      } else {
        // Reduced motion: pause on first frame, show poster as still image
        this.video.pause();
        this.video.currentTime = 0;
        this.classList.add('is-ended');
      }

      // When video ends → freeze on last frame; if custom poster exists, fade it in
      this.video.addEventListener('ended', () => this.onEnded());

      // Hover to restart
      this.addEventListener('pointerenter', () => this.restart());
      this.addEventListener('focusin', () => this.restart());
    }

    onEnded() {
      // If no custom poster image, pause at last visible frame.
      // Browsers clamp currentTime to (duration - small epsilon) so the frame stays visible.
      try {
        const d = this.video.duration;
        if (isFinite(d) && d > 0) {
          this.video.currentTime = Math.max(0, d - 0.05);
        }
      } catch (e) { /* safe to ignore */ }
      this.video.pause();
      this.classList.add('is-ended');
    }

    restart() {
      if (this.prefersReduced) return;
      this.classList.remove('is-ended');
      try { this.video.currentTime = 0; } catch (e) { /* ignore */ }
      const p = this.video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }
  if (!customElements.get('product-showcase-video')) customElements.define('product-showcase-video', ProductShowcaseVideo);


  /* ========== PRODUCT FORM ========== */
  class ProductShowcase {
    constructor(section) {
      this.section = section;
      this.productId = section.dataset.productId;
      this.form = section.querySelector('form.product-showcase__form');
      if (!this.form) return;
      this.variantInput = this.form.querySelector('[data-variant-id-input]');
      this.optionInputs = Array.from(this.form.querySelectorAll('[data-option-input]'));
      this.priceEl = section.querySelector('[data-price]');
      this.comparePriceEl = section.querySelector('[data-compare-price]');
      this.addBtn = section.querySelector('[data-add-btn]');
      this.addBtnText = section.querySelector('[data-add-btn-text]');
      this.qtyInput = section.querySelector('[data-qty-input]');
      this.qtyDec = section.querySelector('[data-qty-decrease]');
      this.qtyInc = section.querySelector('[data-qty-increase]');
      this.feedback = section.querySelector('[data-feedback]');
      this.selectedLabels = Array.from(section.querySelectorAll('[data-option-selected]'));
      this.valueLabels = Array.from(section.querySelectorAll('[data-option-value-label]'));
      const dataScript = section.querySelector('[data-variants-json]');
      this.variants = dataScript ? JSON.parse(dataScript.textContent || '[]') : [];
      this.currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || '';
      this.bind();
    }

    bind() {
      this.optionInputs.forEach((input) => input.addEventListener('change', () => this.onOptionChange()));
      if (this.qtyDec) this.qtyDec.addEventListener('click', () => this.stepQty(-1));
      if (this.qtyInc) this.qtyInc.addEventListener('click', () => this.stepQty(1));
      this.form.addEventListener('submit', (e) => this.submit(e));
    }

    stepQty(delta) {
      if (!this.qtyInput) return;
      const current = parseInt(this.qtyInput.value, 10) || 1;
      this.qtyInput.value = Math.max(1, current + delta);
    }

    getSelectedValues() {
      const map = {};
      this.optionInputs.filter((i) => i.checked).forEach((i) => {
        const match = (i.name || '').match(/options\[(.+)\]/);
        if (match) map[match[1]] = i.value;
      });
      return map;
    }

    findVariant(selectedValues) {
      const options = Object.values(selectedValues);
      return this.variants.find((v) => {
        return v.options && v.options.every((opt, idx) => opt === options[idx]);
      });
    }

    onOptionChange() {
      const selected = this.getSelectedValues();
      const variant = this.findVariant(selected);

      // Update "selected" label under each option legend
      this.valueLabels.forEach((l) => l.classList.remove('is-selected'));
      this.optionInputs.filter((i) => i.checked).forEach((i) => {
        const lbl = i.closest('[data-option-value-label]');
        if (lbl) lbl.classList.add('is-selected');
      });
      this.selectedLabels.forEach((el) => {
        const fieldset = el.closest('.product-showcase__option');
        if (!fieldset) return;
        const idx = parseInt(fieldset.dataset.optionIndex, 10);
        const keys = Object.keys(selected);
        el.textContent = selected[keys[idx]] || '';
      });

      if (!variant) {
        if (this.addBtn) { this.addBtn.disabled = true; }
        if (this.addBtnText) this.addBtnText.textContent = this.tr('unavailable', 'Unavailable');
        return;
      }

      if (this.variantInput) this.variantInput.value = variant.id;
      if (this.priceEl) this.priceEl.innerHTML = this.formatMoney(variant.price);
      if (this.comparePriceEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          this.comparePriceEl.innerHTML = this.formatMoney(variant.compare_at_price);
          this.comparePriceEl.hidden = false;
        } else {
          this.comparePriceEl.hidden = true;
        }
      }
      if (this.addBtn) {
        this.addBtn.disabled = !variant.available;
        if (this.addBtnText) {
          this.addBtnText.textContent = variant.available
            ? this.tr('add', 'Add to cart')
            : this.tr('soldout', 'Sold out');
        }
      }
      // Update URL
      if (history && history.replaceState && variant.id) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({}, '', url.toString());
      }
    }

    formatMoney(cents) {
      const amount = (cents / 100).toFixed(2);
      try {
        return new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency',
          currency: this.currency || 'USD',
        }).format(amount);
      } catch (e) {
        return amount;
      }
    }

    tr(key, fallback) {
      try {
        const map = (window.theme && window.theme.strings) || {};
        return map[key] || fallback;
      } catch (e) { return fallback; }
    }

    async submit(e) {
      e.preventDefault();
      if (!this.addBtn || this.addBtn.disabled) return;
      const originalText = this.addBtnText ? this.addBtnText.textContent : '';
      this.addBtn.disabled = true;
      if (this.addBtnText) this.addBtnText.textContent = this.tr('adding', 'Adding…');

      const formData = new FormData(this.form);
      try {
        const res = await fetch((window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : '/') + 'cart/add.js', {
          method: 'POST',
          headers: { 'Accept': 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.description || err.message || this.tr('cart_error', 'Something went wrong.'));
        }
        // Refresh cart state
        const cartRes = await fetch((window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : '/') + 'cart.js');
        const cart = cartRes.ok ? await cartRes.json() : null;
        if (cart) {
          document.dispatchEvent(new CustomEvent('cart:update', { detail: { count: cart.item_count, cart } }));
        }
        this.showFeedback(this.tr('added', 'Added to cart!'), 'success');
        if (this.addBtnText) this.addBtnText.textContent = this.tr('added', 'Added to cart!');
        setTimeout(() => {
          if (this.addBtnText) this.addBtnText.textContent = originalText;
          this.addBtn.disabled = false;
        }, 1600);
      } catch (err) {
        this.showFeedback(err && err.message ? err.message : this.tr('cart_error', 'Something went wrong.'), 'error');
        if (this.addBtnText) this.addBtnText.textContent = originalText;
        this.addBtn.disabled = false;
      }
    }

    showFeedback(msg, type) {
      if (!this.feedback) return;
      this.feedback.textContent = msg;
      this.feedback.hidden = false;
      this.feedback.classList.remove('product-showcase__feedback--success', 'product-showcase__feedback--error');
      this.feedback.classList.add('product-showcase__feedback--' + (type || 'success'));
      clearTimeout(this._fbTimer);
      this._fbTimer = setTimeout(() => { this.feedback.hidden = true; }, 3500);
    }
  }

  function init(root) {
    (root || document).querySelectorAll('.product-showcase').forEach((s) => {
      if (!s.__showcaseInited) {
        new ProductShowcase(s);
        s.__showcaseInited = true;
      }
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', () => init());
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
