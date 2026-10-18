// Arranca la app cuando todos los componentes están cargados
document.addEventListener("components:loaded", async () => {
  initHeader();
  initFooter();
  await initCurrency();
  window.addEventListener("hashchange", router);
  router();
});


const ROUTES = {
  dashboard: { view: "dashboard", scripts: ["views/dashboard.js"], init: "initDashboardView" },
  empleados: { view: "empleados", scripts: ["services/employeeService.js"], init: "initEmpleadosView" },
  gastos: { view: "gastos", scripts: ["services/expenseService.js", "views/gastos.js"], init: "initGastosView" },
  categorias: { view: "categorias", scripts: ["services/categoryService.js"], init: "initCategoriasView" },
  demo: { view: "demo", scripts: ["views/demo.js"], init: "initDemoView" },
};

const DEFAULT_ROUTE = "dashboard";


async function router() {
  const hash = location.hash.slice(1) || DEFAULT_ROUTE;
  updateNavLinks(hash);

  const route = ROUTES[hash];
  if (!route) {
    showPendingView();
    return;
  }

  try {
    await loadView(route);
  } catch (error) {
    console.error(error);
    showPendingView();
  }
}


function updateNavLinks(hash) {
  const links = document.querySelectorAll(".nav-link");
  let section = "";

  links.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${hash}`;
    link.classList.toggle("active", isActive);
    if (isActive) section = link.dataset.section;
  });

  const subtitle = document.getElementById("current-section");
  if (subtitle && section) subtitle.textContent = section;
}


function showPendingView() {
  document.getElementById("app").innerHTML = `
    <div class="pending-view">
      <span class="material-symbols-outlined">construction</span>
      <p>Sección en construcción</p>
    </div>
  `;
}