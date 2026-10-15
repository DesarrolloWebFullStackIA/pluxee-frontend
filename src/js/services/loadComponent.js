

const BASE = "src";

const EXTERNAL_SCRIPTS = ["https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"];

const CORE_STYLES = ["variable.css", "style.css"]; 


const LAST_STYLES = [];


const CORE_SCRIPTS = [
  "services/api.js",
  "state/store.js",
  "services/services.js",
  "main.js",
  "components/modal.js",
  "services/currency.js"
];

const loadedFiles = new Set();

function loadStyle(file) {
  const href = `${BASE}/css/${file}`;
  if (loadedFiles.has(href)) return;
  loadedFiles.add(href);
 
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}


function loadScript(file) {
  const src = file.startsWith("http") ? file : `${BASE}/js/${file}`;
  if (loadedFiles.has(src)) return Promise.resolve();
  loadedFiles.add(src);
 
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.body.appendChild(script);
  });
}


async function fetchHTML(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
  return response.text();
}


async function loadComponent(el) {
  const name = el.dataset.component;
  try {
    loadStyle(`${name}.css`);
    el.outerHTML = await fetchHTML(`${BASE}/html/components/${name}.html`);
    await loadScript(`components/${name}.js`);
  } catch (error) {
    console.error(error);
  }
}

async function loadView(route) {
  const app = document.getElementById("app");
 
  loadStyle(`${route.view}.css`);
  
  app.innerHTML = await fetchHTML(`${BASE}/html/views/${route.view}.html`);
 
  for (const file of route.scripts || []) {
    await loadScript(file);
  }
 

  if (route.init && typeof window[route.init] === "function") {
    window[route.init]();
  }

  if (typeof renderMoney === "function") renderMoney();
}

async function initApp() {
  
  for (const url of EXTERNAL_SCRIPTS) {
    await loadScript(url).catch((error) => console.error(error));
  }
 

  CORE_STYLES.forEach(loadStyle);
 
 
  const components = document.querySelectorAll("[data-component]");
  await Promise.all([...components].map(loadComponent));
 

  LAST_STYLES.forEach(loadStyle);
 

  for (const file of CORE_SCRIPTS) {
    await loadScript(file);
  }
 
  
  document.dispatchEvent(new Event("components:loaded"));
}

initApp();