(() => {
  function notifyLayoutChange() {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new CustomEvent("sentinel:layout-change"));
  }

  function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebarToggle");
    const items = [...document.querySelectorAll(".nav-item")];
    if (!sidebar || !toggle) return;

    toggle.addEventListener("click", () => {
      if (window.innerWidth <= 1080) {
        sidebar.classList.toggle("mobile-open");
      } else {
        document.body.classList.toggle("sidebar-collapsed");
      }
      window.setTimeout(notifyLayoutChange, 240);
    });

    items.forEach((item) => {
      item.addEventListener("click", () => {
        items.forEach((node) => node.classList.remove("active"));
        item.classList.add("active");
        if (window.innerWidth <= 1080) sidebar.classList.remove("mobile-open");
        window.setTimeout(notifyLayoutChange, 120);
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080) {
        sidebar.classList.remove("mobile-open");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initSidebar);
})();
