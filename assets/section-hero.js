/* Hero slideshow — crossfade, autoplay, arrows, dots, keyboard, swipe */
(function () {
  'use strict';

  class HeroSlideshow extends HTMLElement {
    connectedCallback() {
      this.hero = this.closest('.hero');
      this.slides = Array.from(this.querySelectorAll('.hero__slide'));
      this.dots = Array.from(this.querySelectorAll('.hero__dot'));
      this.prevBtn = this.querySelector('.hero__arrow--prev');
      this.nextBtn = this.querySelector('.hero__arrow--next');
      this.index = 0;
      this.autoplay = this.hero && this.hero.dataset.autoplay === 'true';
      this.speed = parseFloat((this.hero && this.hero.dataset.autoplaySpeed) || 6) * 1000;
      this.timer = null;
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.bind();
      if (this.autoplay && !this.prefersReducedMotion && this.slides.length > 1) this.start();
    }

    disconnectedCallback() { this.stop(); }

    bind() {
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => { this.restart(); this.go(this.index - 1); });
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => { this.restart(); this.go(this.index + 1); });
      this.dots.forEach((dot, i) => dot.addEventListener('click', () => { this.restart(); this.go(i); }));

      this.addEventListener('pointerenter', () => this.stop());
      this.addEventListener('pointerleave', () => { if (this.autoplay && !this.prefersReducedMotion) this.start(); });

      // Swipe
      let startX = 0;
      let moved = false;
      this.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; moved = false; }, { passive: true });
      this.addEventListener('touchmove', () => { moved = true; }, { passive: true });
      this.addEventListener('touchend', (e) => {
        if (!moved) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) < 40) return;
        this.restart();
        this.go(dx < 0 ? this.index + 1 : this.index - 1);
      });

      // Pause when tab hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else if (this.autoplay && !this.prefersReducedMotion) this.start();
      });
    }

    go(next) {
      if (!this.slides.length) return;
      const n = this.slides.length;
      const idx = ((next % n) + n) % n;
      this.slides.forEach((s, i) => {
        const active = i === idx;
        s.classList.toggle('hero__slide--active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      this.dots.forEach((d, i) => {
        const active = i === idx;
        d.classList.toggle('hero__dot--active', active);
        d.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      this.index = idx;
    }

    start() { this.stop(); this.timer = setInterval(() => this.go(this.index + 1), this.speed); }
    stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
    restart() { if (this.autoplay && !this.prefersReducedMotion) this.start(); }
  }

  if (!customElements.get('hero-slideshow')) customElements.define('hero-slideshow', HeroSlideshow);
})();
