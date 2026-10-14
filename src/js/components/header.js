

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