(function () {
  const STORAGE_KEY = "signor_theme";

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }

  function updateThemeMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      return;
    }
    meta.setAttribute("content", theme === "light" ? "#f5f6fa" : "#000000");
  }

  function updateToggleUI(theme, button, label) {
    if (!button) {
      return;
    }

    const next = theme === "light" ? "dark" : "light";
    button.setAttribute("aria-label", `Switch to ${next} mode`);
    button.setAttribute("aria-pressed", theme === "light" ? "true" : "false");

    if (label) {
      label.textContent = next === "light" ? "Light" : "Dark";
    }
  }

  function applyTheme(theme, options = {}) {
    const resolved = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", resolved);
    updateThemeMeta(resolved);

    if (options.persist !== false) {
      try {
        localStorage.setItem(STORAGE_KEY, resolved);
      } catch {}
    }

    return resolved;
  }

  function initThemeToggle(options = {}) {
    const buttonId = options.buttonId || "themeToggle";
    const labelId = options.labelId || "themeToggleLabel";
    const button = document.getElementById(buttonId);
    const label = document.getElementById(labelId);

    const initial = getCurrentTheme();
    updateToggleUI(initial, button, label);

    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      const current = getCurrentTheme();
      const next = current === "light" ? "dark" : "light";
      const applied = applyTheme(next);
      updateToggleUI(applied, button, label);
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }
      const next = event.newValue === "light" ? "light" : "dark";
      const applied = applyTheme(next, { persist: false });
      updateToggleUI(applied, button, label);
    });
  }

  window.SignorTheme = {
    STORAGE_KEY,
    getStoredTheme,
    getCurrentTheme,
    applyTheme,
    initThemeToggle,
  };

  if (!document.documentElement.getAttribute("data-theme")) {
    applyTheme(getStoredTheme(), { persist: false });
  } else {
    updateThemeMeta(getCurrentTheme());
  }
})();
