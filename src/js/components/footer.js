function initFooter() {
  const year = document.querySelector(".footer [data-year]");
  if (year) year.textContent = new Date().getFullYear();
}