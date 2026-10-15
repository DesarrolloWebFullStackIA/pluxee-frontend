const RATE_URL = "https://api.frankfurter.dev/v2/rate/eur/mxn";
const RATE_CACHE_KEY = "eurMxnRate";
const CURRENCY_KEY = "currency";

const LOCALES = { EUR: "es-ES", MXN: "es-MX" };

let currentCurrency = "EUR";
let eurToMxn = 20;

function readRateCache() {
  try {
    return JSON.parse(localStorage.getItem(RATE_CACHE_KEY));
  } catch {
    return null;
  }
}


async function loadRate() {
  const today = new Date().toISOString().slice(0, 10);
  const cached = readRateCache();

  if (cached?.date === today) {
    eurToMxn = cached.rate;
    return;
  }

  try {
    const response = await fetch(RATE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const { rate } = await response.json();
    eurToMxn = rate;

    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ date: today, rate }));
  } catch (error) {
    console.warn("No se pudo obtener la tasa; uso la última conocida.", error);
    if (cached) eurToMxn = cached.rate;
  }
}


function formatMoney(amountEur) {
  const value = currentCurrency === "MXN" ? amountEur * eurToMxn : amountEur;

  return new Intl.NumberFormat(LOCALES[currentCurrency], {
    style: "currency",
    currency: currentCurrency,
    maximumFractionDigits: 0
  }).format(value);
}


function renderMoney(root = document) {
  root.querySelectorAll("[data-eur]").forEach((element) => {
    element.textContent = formatMoney(Number(element.dataset.eur));
  });
}

function setCurrency(code) {
  if (!LOCALES[code]) return;

  currentCurrency = code;

  try {
    localStorage.setItem(CURRENCY_KEY, code);
  } catch {}

  document.querySelectorAll("[data-currency]").forEach((button) => {
    const active = button.dataset.currency === code;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderMoney();

 
  document.dispatchEvent(
    new CustomEvent("currencychange", { detail: { currency: code } })
  );
}

async function initCurrency() {
  await loadRate();

  document.querySelectorAll("[data-currency]").forEach((button) => {
    button.addEventListener("click", () => setCurrency(button.dataset.currency));
  });

  let saved = "EUR";
  try {
    saved = localStorage.getItem(CURRENCY_KEY) || "EUR";
  } catch {}

  setCurrency(saved);
}


function bindConversionPreview(input, output) {
  const update = () => {
    const eur = Number(input.value);

    output.textContent =
      eur > 0
        ? `≈ ${new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
          }).format(eur * eurToMxn)}`
        : "";
  };

  input.addEventListener("input", update);
  update();
}


window.bindConversionPreview = bindConversionPreview;
window.formatMoney = formatMoney;
window.renderMoney = renderMoney;


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCurrency);
} else {
  initCurrency();
}