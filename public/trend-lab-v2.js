(function () {
  const state = {
    projects: [],
    query: "",
    category: "all",
    type: "all",
    sort: "featured",
  };

  const demoProjects = [
    {
      slug: "paperflow",
      title: "Paperflow",
      description: "Publishing ops dashboard with approval lanes and production QA checks.",
      category: "Publishing",
      projectType: "tool",
      year: 2026,
      icon: "Pf",
      iconTheme: "invoice",
      thumbnailUrl: "",
      gallery: [],
      techStack: ["React", "Node.js", "Postgres"],
      demoUrl: "",
      downloadUrl: "",
      featured: true,
      displayOrder: 1,
    },
    {
      slug: "pulse-site",
      title: "Pulse Site",
      description: "Performance-first marketing system with live component governance.",
      category: "Web",
      projectType: "website",
      year: 2025,
      icon: "Ps",
      iconTheme: "calendar",
      thumbnailUrl: "",
      gallery: [],
      techStack: ["Next.js", "TypeScript"],
      demoUrl: "",
      downloadUrl: "",
      featured: true,
      displayOrder: 2,
    },
    {
      slug: "north",
      title: "North",
      description: "Focused planning app designed for deep work sessions.",
      category: "Productivity",
      projectType: "app",
      year: 2025,
      icon: "N",
      iconTheme: "notes",
      thumbnailUrl: "",
      gallery: [],
      techStack: ["SwiftUI"],
      demoUrl: "",
      downloadUrl: "",
      featured: false,
      displayOrder: 3,
    },
  ];

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#096;");
  }

  function normalizeCategory(value) {
    const v = String(value || "").trim();
    return v || "Other";
  }

  function normalizeType(value) {
    const v = String(value || "").trim().toLowerCase();
    return v || "app";
  }

  function projectThumb(project) {
    if (project.thumbnailUrl) {
      return project.thumbnailUrl;
    }
    if (Array.isArray(project.gallery) && project.gallery.length > 0) {
      return project.gallery[0];
    }
    return "";
  }

  function themeStored() {
    try {
      return localStorage.getItem("signor_theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  }

  function themeCurrent() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme, persist) {
    const resolved = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", resolved);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolved === "light" ? "#f2f6fb" : "#080a10");
    }

    const next = resolved === "light" ? "dark" : "light";
    const btn = document.getElementById("themeToggle");
    const label = document.getElementById("themeToggleLabel");
    if (btn) {
      btn.setAttribute("aria-label", "Switch to " + next + " mode");
      btn.setAttribute("aria-pressed", resolved === "light" ? "true" : "false");
    }
    if (label) {
      label.textContent = next === "light" ? "Light" : "Dark";
    }

    if (persist !== false) {
      try {
        localStorage.setItem("signor_theme", resolved);
      } catch {}
    }
  }

  function bindTheme() {
    applyTheme(themeStored(), false);
    const btn = document.getElementById("themeToggle");
    if (!btn) {
      return;
    }

    btn.addEventListener("click", function () {
      const next = themeCurrent() === "light" ? "dark" : "light";
      applyTheme(next, true);
    });
  }

  function searchText(project) {
    const stack = Array.isArray(project.techStack) ? project.techStack.join(" ") : "";
    return [
      project.title,
      project.description,
      normalizeCategory(project.category),
      normalizeType(project.projectType),
      stack,
    ]
      .join(" ")
      .toLowerCase();
  }

  function featuredComparator(a, b) {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fa !== fb) {
      return fb - fa;
    }

    const orderA = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : 9999;
    const orderB = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 9999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const yearA = Number(a.year) || 0;
    const yearB = Number(b.year) || 0;
    if (yearA !== yearB) {
      return yearB - yearA;
    }

    return String(a.title || "").localeCompare(String(b.title || ""));
  }

  function sortProjects(projects) {
    const next = projects.slice();

    if (state.sort === "az") {
      return next.sort(function (a, b) {
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
    }

    if (state.sort === "newest") {
      return next.sort(function (a, b) {
        const yearA = Number(a.year) || 0;
        const yearB = Number(b.year) || 0;
        if (yearA !== yearB) {
          return yearB - yearA;
        }
        return featuredComparator(a, b);
      });
    }

    return next.sort(featuredComparator);
  }

  function filteredProjects() {
    const q = state.query.trim().toLowerCase();
    const filtered = state.projects.filter(function (project) {
      if (state.category !== "all" && normalizeCategory(project.category).toLowerCase() !== state.category) {
        return false;
      }

      if (state.type !== "all" && normalizeType(project.projectType) !== state.type) {
        return false;
      }

      if (q && !searchText(project).includes(q)) {
        return false;
      }

      return true;
    });

    return sortProjects(filtered);
  }

  function topSpotlightProjects() {
    const sorted = sortProjects(state.projects);
    return sorted.slice(0, 2);
  }

  function renderMetrics() {
    const projectEl = document.getElementById("metricProjects");
    const categoryEl = document.getElementById("metricCategories");
    const categories = new Set(state.projects.map(function (p) { return normalizeCategory(p.category); }));

    if (projectEl) {
      projectEl.textContent = String(state.projects.length);
    }

    if (categoryEl) {
      categoryEl.textContent = String(categories.size);
    }
  }

  function renderCategories() {
    const wrap = document.getElementById("categoryFilters");
    if (!wrap) {
      return;
    }

    const counts = new Map();
    state.projects.forEach(function (project) {
      const category = normalizeCategory(project.category);
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    const ordered = Array.from(counts.entries()).sort(function (a, b) {
      return a[0].localeCompare(b[0]);
    });

    const chips = [
      '<button class="chip active" type="button" data-category="all">All (' + state.projects.length + ")</button>",
    ];

    ordered.forEach(function (entry) {
      const category = entry[0];
      const count = entry[1];
      chips.push(
        '<button class="chip" type="button" data-category="' + escAttr(category.toLowerCase()) + '">' + esc(category) + ' (' + count + ")</button>"
      );
    });

    wrap.innerHTML = chips.join("");
  }

  function renderSpotlight() {
    const wrap = document.getElementById("spotlightGrid");
    if (!wrap) {
      return;
    }

    const items = topSpotlightProjects();
    if (!items.length) {
      wrap.innerHTML = "";
      return;
    }

    wrap.innerHTML = items
      .map(function (project) {
        const t = projectThumb(project);
        const thumb = t
          ? '<img class="spotlight-thumb" src="' + escAttr(t) + '" alt="' + escAttr(project.title) + ' preview" loading="lazy" />'
          : '<div class="spotlight-thumb fallback" aria-hidden="true">' + esc(project.icon || "✦") + "</div>";
        const url = "/projects/" + encodeURIComponent(project.slug);

        return (
          '<article class="spotlight-card">' +
          thumb +
          '<div class="spotlight-content">' +
          "<h3>" + esc(project.title || "Untitled") + "</h3>" +
          '<p>' + esc(project.description || "") + "</p>" +
          '<a class="spotlight-link" href="' + url + '">Open Project</a>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderResultsSummary(count) {
    const el = document.getElementById("resultsSummary");
    if (!el) {
      return;
    }

    const suffix = count === 1 ? "result" : "results";
    el.textContent = count + " " + suffix;
  }

  function renderGrid() {
    const grid = document.getElementById("projectGrid");
    const empty = document.getElementById("emptyState");
    if (!grid || !empty) {
      return;
    }

    const projects = filteredProjects();
    renderResultsSummary(projects.length);

    if (!projects.length) {
      grid.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");

    grid.innerHTML = projects
      .map(function (project) {
        const iconTheme = ["invoice", "calendar", "notes"].includes(project.iconTheme)
          ? project.iconTheme
          : "invoice";
        const t = projectThumb(project);
        const url = "/projects/" + encodeURIComponent(project.slug);
        const cover = t
          ? '<img class="card-cover" src="' + escAttr(t) + '" alt="' + escAttr(project.title) + ' preview" loading="lazy" />'
          : '<div class="card-cover fallback" aria-hidden="true">' + esc(project.icon || "✦") + "</div>";

        const actions = ['<a class="link primary" href="' + url + '">Open</a>'];
        if (project.demoUrl) {
          actions.push('<a class="link" href="' + escAttr(project.demoUrl) + '" target="_blank" rel="noreferrer">Demo</a>');
        }
        if (!project.demoUrl && project.downloadUrl) {
          actions.push('<a class="link" href="' + escAttr(project.downloadUrl) + '" target="_blank" rel="noreferrer">Download</a>');
        }

        return (
          '<article class="card">' +
          cover +
          '<div class="card-body">' +
          '<div class="card-top">' +
          '<div class="icon ' + iconTheme + '">' + esc(project.icon || "✦") + "</div>" +
          '<span class="pill">' + esc(String(project.year || "")) + "</span>" +
          "</div>" +
          "<h3>" + esc(project.title || "Untitled") + "</h3>" +
          '<p class="desc">' + esc(project.description || "") + "</p>" +
          '<div class="meta">' +
          '<span class="pill">' + esc(normalizeCategory(project.category)) + "</span>" +
          '<span class="pill">' + esc(normalizeType(project.projectType)) + "</span>" +
          "</div>" +
          '<div class="actions">' + actions.join("") + "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    window.requestAnimationFrame(function () {
      document.querySelectorAll(".card").forEach(function (el, idx) {
        window.setTimeout(function () {
          el.classList.add("in");
        }, idx * 18);
      });
    });
  }

  function updateChipStates() {
    document.querySelectorAll("[data-category]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-category") === state.category);
    });

    document.querySelectorAll("[data-type]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-type") === state.type);
    });
  }

  function bindFilters() {
    const search = document.getElementById("searchInput");
    const categories = document.getElementById("categoryFilters");
    const types = document.getElementById("typeFilters");
    const sortSelect = document.getElementById("sortSelect");

    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value || "";
        renderGrid();
      });
    }

    if (categories) {
      categories.addEventListener("click", function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const button = target.closest("[data-category]");
        if (!button) {
          return;
        }

        state.category = button.getAttribute("data-category") || "all";
        updateChipStates();
        renderGrid();
      });
    }

    if (types) {
      types.addEventListener("click", function (event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const button = target.closest("[data-type]");
        if (!button) {
          return;
        }

        state.type = button.getAttribute("data-type") || "all";
        updateChipStates();
        renderGrid();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        state.sort = sortSelect.value || "featured";
        renderSpotlight();
        renderGrid();
      });
    }

    window.addEventListener("keydown", function (event) {
      const active = document.activeElement;
      const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        if (search) {
          search.focus();
          search.select();
        }
      }

      if (event.key === "Escape" && search && document.activeElement === search) {
        search.value = "";
        state.query = "";
        renderGrid();
        search.blur();
      }
    });
  }

  function normalizedProject(project) {
    return {
      ...project,
      category: normalizeCategory(project.category),
      projectType: normalizeType(project.projectType),
      featured: Boolean(project.featured),
      displayOrder: Number.isFinite(Number(project.displayOrder)) ? Number(project.displayOrder) : 9999,
    };
  }

  async function loadProjects() {
    if (window.location.protocol === "file:") {
      state.projects = demoProjects.map(normalizedProject);
      return;
    }

    try {
      const response = await fetch("/api/projects", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("Project request failed: " + response.status);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        state.projects = demoProjects.map(normalizedProject);
        return;
      }

      state.projects = data.map(normalizedProject);
    } catch (error) {
      console.warn("Using demo data fallback", error);
      state.projects = demoProjects.map(normalizedProject);
    }
  }

  async function init() {
    bindTheme();
    bindFilters();
    await loadProjects();
    renderMetrics();
    renderCategories();
    renderSpotlight();
    updateChipStates();
    renderGrid();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
