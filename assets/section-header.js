/* Header — drawer, search, sub-menu toggles, cart refresh on Section Rendering API */
(function () {
  'use strict';

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      this.drawer = this.querySelector('#HeaderDrawer');
      this.search = this.querySelector('#HeaderSearch');
      this.burger = this.querySelector('.site-header__burger');
      this.searchBtn = this.querySelector('[aria-controls="HeaderSearch"]');
      this.cartCountEl = this.querySelector('[data-cart-count]');
      this.handleKeydown = this.handleKeydown.bind(this);
      this.bindEvents();
      this.listenCartUpdates();
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this.handleKeydown);
    }

    bindEvents() {
      if (this.burger && this.drawer) {
        this.burger.addEventListener('click', () => this.toggleDrawer(true));
        this.drawer.querySelectorAll('[data-drawer-close]').forEach((el) =>
          el.addEventListener('click', () => this.toggleDrawer(false))
        );
      }

      if (this.searchBtn && this.search) {
        this.searchBtn.addEventListener('click', () => this.toggleSearch(true));
        this.search.querySelectorAll('[data-search-close]').forEach((el) =>
          el.addEventListener('click', () => this.toggleSearch(false))
        );
      }

      // Sub-menu toggles inside drawer
      this.querySelectorAll('.site-drawer__toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!expanded));
          const sublist = btn.nextElementSibling;
          if (sublist) {
            if (expanded) sublist.setAttribute('hidden', '');
            else sublist.removeAttribute('hidden');
          }
        });
      });

      document.addEventListener('keydown', this.handleKeydown);
    }

    toggleDrawer(open) {
      if (!this.drawer) return;
      if (open) {
        this.drawer.hidden = false;
        requestAnimationFrame(() => this.drawer.classList.add('site-drawer--open'));
        this.drawer.setAttribute('aria-hidden', 'false');
        if (this.burger) this.burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      } else {
        this.drawer.classList.remove('site-drawer--open');
        this.drawer.setAttribute('aria-hidden', 'true');
        if (this.burger) this.burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        setTimeout(() => { this.drawer.hidden = true; }, 300);
      }
    }

    toggleSearch(open) {
      if (!this.search) return;
      if (open) {
        this.search.hidden = false;
        requestAnimationFrame(() => this.search.classList.add('site-search--open'));
        this.search.setAttribute('aria-hidden', 'false');
        if (this.searchBtn) this.searchBtn.setAttribute('aria-expanded', 'true');
        const input = this.search.querySelector('input[type="search"]');
        if (input) setTimeout(() => input.focus(), 100);
      } else {
        this.search.classList.remove('site-search--open');
        this.search.setAttribute('aria-hidden', 'true');
        if (this.searchBtn) this.searchBtn.setAttribute('aria-expanded', 'false');
        setTimeout(() => { this.search.hidden = true; }, 300);
      }
    }

    handleKeydown(e) {
      if (e.key === 'Escape') {
        if (this.drawer && !this.drawer.hidden) this.toggleDrawer(false);
        if (this.search && !this.search.hidden) this.toggleSearch(false);
      }
    }

    listenCartUpdates() {
      // Listen for custom cart update events dispatched by other components
      document.addEventListener('cart:update', (e) => {
        const count = e.detail && typeof e.detail.count === 'number' ? e.detail.count : null;
        if (count === null || !this.cartCountEl) return;
        this.cartCountEl.textContent = String(count);
        if (count > 0) this.cartCountEl.removeAttribute('hidden');
        else this.cartCountEl.setAttribute('hidden', '');
      });
    }
  }

  if (!customElements.get('site-header')) {
    customElements.define('site-header', SiteHeader);
  }
})();
