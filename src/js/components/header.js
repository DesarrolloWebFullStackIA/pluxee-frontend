/**
 * Pluxee Enterprise - Accessible Mobile Hamburger Toggle Controller
 * Task: US-FE-01.5 (Issue #15)
 *
 * Implements accessible toggle behavior for the mobile navigation drawer:
 * - Toggles visibility between collapsed and expanded states
 * - Updates WAI-ARIA states: aria-expanded ('true'/'false'), aria-label
 * - Toggles icon between 'menu' and 'close'
 * - Closes drawer on 'Escape' key press and returns focus to the toggle button
 * - Closes drawer on clicking outside the header or on navigation link click
 */

(function (window) {
  'use strict';

  const MobileMenuController = {
    /**
     * Initializes the mobile menu toggle listener and accessibility hooks.
     */
    init: function () {
      const toggleBtn = document.getElementById('mobileMenuToggle');
      const mobileMenu = document.getElementById('mobileMenu');
      const icon = document.getElementById('mobileMenuIcon');

      if (!toggleBtn || !mobileMenu) return;

      function openMenu() {
        mobileMenu.classList.remove('hidden');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
        if (icon) icon.textContent = 'close';
      }

      function closeMenu() {
        mobileMenu.classList.add('hidden');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
        if (icon) icon.textContent = 'menu';
      }

      // Click event listener on toggle button
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      // Close on ESC key press for accessibility (WCAG requirement)
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') {
          closeMenu();
          toggleBtn.focus();
        }
      });

      // Close when clicking outside of the header
      document.addEventListener('click', function (e) {
        if (!mobileMenu.classList.contains('hidden') && !e.target.closest('header')) {
          closeMenu();
        }
      });

      // Close when clicking any nav link in the mobile drawer
      const links = mobileMenu.querySelectorAll('a');
      links.forEach(function (link) {
        link.addEventListener('click', function () {
          closeMenu();
        });
      });
    }
  };

  // Expose component to global window
  window.PluxeeMobileMenu = MobileMenuController;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      MobileMenuController.init();
    });
  } else {
    MobileMenuController.init();
  }

})(window);

function initHeader() {
  const header = document.querySelector(".header");
  if (!header) return;

  const CURRENCY_KEY = "plexus-currency";
  const DEFAULT_CURRENCY = "EUR";
  const buttons = header.querySelectorAll("[data-currency]");

  const getSavedCurrency = () => {
    try {
      return localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY;
    } catch {
      return DEFAULT_CURRENCY;
    }
  };

  const saveCurrency = (code) => {
    try {
      localStorage.setItem(CURRENCY_KEY, code);
    } catch {

    }
  };

  const selectCurrency = (code) => {
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.currency === code);
    });
  };

  selectCurrency(getSavedCurrency());

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.dataset.currency;
      selectCurrency(code);
      saveCurrency(code);


      document.dispatchEvent(
        new CustomEvent("plexus:currency-change", { detail: { currency: code } })
      );
    });
  });
}


function setGastosBadge(count) {
  const badge = document.querySelector('.header [data-badge="gastos"]');
  if (!badge) return;

  badge.textContent = count;
  badge.hidden = !(count > 0);
}
