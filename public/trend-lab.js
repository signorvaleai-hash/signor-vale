const state = {
  projects: [],
  query: "",
  category: "all",
  type: "all",
};

const DEMO_PROJECTS = [
  {
    slug: "paperflow",
    title: "Paperflow",
    description: "Ops dashboard for distributed publishing teams with approval lanes and production QA checks.",
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
  },
  {
    slug: "pulse-site",
    title: "Pulse Site",
    description: "A performance-first marketing site system with live component governance.",
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
  },
  {
    slug: "north-app",
    title: "North",
    description: "A focused macOS planning app designed for deep work sessions.",
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
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function projectThumbnail(project) {
  if (project.thumbnailUrl) {
    return project.thumbnailUrl;
  }

  if (Array.isArray(project.gallery) && project.gallery.length > 0) {
    return project.gallery[0];
  }

  return "";
}

function projectSearchText(project) {
  const stack = Array.isArray(project.techStack) ? project.techStack.join(" ") : "";
  return [project.title, project.description, project.category, project.projectType, stack]
    .join(" ")
    .toLowerCase();
}

function getFilteredProjects() {
  const q = state.query.trim().toLowerCase();

  return state.projects.filter((project) => {
    if (state.category !== "all" && String(project.category).toLowerCase() !== state.category) {
      return false;
    }

    if (state.type !== "all" && String(project.projectType).toLowerCase() !== state.type) {
      return false;
    }

    if (q && !projectSearchText(project).includes(q)) {
      return false;
    }

    return true;
  });
}

function renderMetrics() {
  const projectEl = document.getElementById("metricProjects");
  const categoryEl = document.getElementById("metricCategories");
  if (!projectEl || !categoryEl) {
    return;
  }

  const categories = new Set(state.projects.map((p) => String(p.category || "Other").trim()));
  projectEl.textContent = String(state.projects.length);
  categoryEl.textContent = String(categories.size);
}

function renderCategoryFilters() {
  const wrap = document.getElementById("categoryFilters");
  if (!wrap) {
    return;
  }

  const categories = [...new Set(state.projects.map((project) => String(project.category || "Other").trim()))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const buttons = [
    '<button class="chip is-active" type="button" data-filter-category="all">All</button>',
    ...categories.map((category) => `<button class="chip" type="button" data-filter-category="${escapeAttribute(category.toLowerCase())}">${escapeHtml(category)}</button>`),
  ];

  wrap.innerHTML = buttons.join("");
}

function renderProjects() {
  const grid = document.getElementById("projectGrid");
  const empty = document.getElementById("emptyState");

  if (!grid || !empty) {
    return;
  }

  const projects = getFilteredProjects();

  if (projects.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  grid.innerHTML = projects
    .map((project) => {
      const thumb = projectThumbnail(project);
      const iconTheme = ["invoice", "calendar", "notes"].includes(project.iconTheme)
        ? project.iconTheme
        : "invoice";
      const projectUrl = `/projects/${encodeURIComponent(project.slug)}`;

      const actions = [
        `<a class="project-link primary" href="${projectUrl}">Open</a>`,
      ];

      if (project.demoUrl) {
        actions.push(
          `<a class="project-link" href="${escapeAttribute(project.demoUrl)}" target="_blank" rel="noreferrer">Demo</a>`
        );
      } else if (project.downloadUrl) {
        actions.push(
          `<a class="project-link" href="${escapeAttribute(project.downloadUrl)}" target="_blank" rel="noreferrer">Download</a>`
        );
      }

      return `
        <article class="project-card">
          <div class="project-top">
            <div class="project-icon ${iconTheme}">${escapeHtml(project.icon || "✦")}</div>
            ${
              thumb
                ? `<img class="project-thumb" src="${escapeAttribute(thumb)}" alt="${escapeAttribute(project.title)} thumbnail" loading="lazy" />`
                : `<div class="project-thumb project-thumb-fallback" aria-hidden="true">${escapeHtml(project.icon || "✦")}</div>`
            }
          </div>
          <h3 class="project-title">${escapeHtml(project.title || "Untitled")}</h3>
          <p class="project-description">${escapeHtml(project.description || "")}</p>
          <div class="project-meta">
            <span class="pill">${escapeHtml(project.category || "Other")}</span>
            <span class="pill">${escapeHtml(String(project.projectType || "app"))}</span>
            <span class="pill">${escapeHtml(String(project.year || ""))}</span>
          </div>
          <div class="project-actions">${actions.join("")}</div>
        </article>
      `;
    })
    .join("");

  window.requestAnimationFrame(() => {
    document.querySelectorAll(".project-card").forEach((card, index) => {
      window.setTimeout(() => card.classList.add("in"), index * 24);
    });
  });
}

function updateChipStates() {
  document.querySelectorAll("[data-filter-category]").forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-filter-category") === state.category);
  });

  document.querySelectorAll("[data-filter-type]").forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-filter-type") === state.type);
  });
}

function bindFilterEvents() {
  const categoryWrap = document.getElementById("categoryFilters");
  const typeWrap = document.getElementById("typeFilters");
  const searchInput = document.getElementById("searchInput");

  if (categoryWrap) {
    categoryWrap.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-filter-category]");
      if (!button) {
        return;
      }

      state.category = button.getAttribute("data-filter-category") || "all";
      updateChipStates();
      renderProjects();
    });
  }

  if (typeWrap) {
    typeWrap.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-filter-type]");
      if (!button) {
        return;
      }

      state.type = button.getAttribute("data-filter-type") || "all";
      updateChipStates();
      renderProjects();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.query = searchInput.value || "";
      renderProjects();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      searchInput?.focus();
      searchInput?.select();
      return;
    }

    if (event.key === "Escape" && searchInput && document.activeElement === searchInput) {
      searchInput.value = "";
      state.query = "";
      renderProjects();
      searchInput.blur();
    }
  });
}

async function loadProjects() {
  if (window.location.protocol === "file:") {
    state.projects = DEMO_PROJECTS;
    return;
  }

  try {
    const response = await fetch("/api/projects", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Could not load projects (${response.status})`);
    }

    const projects = await response.json();
    if (!Array.isArray(projects)) {
      throw new Error("Unexpected projects payload.");
    }

    state.projects = projects;
  } catch (error) {
    console.warn("Falling back to demo projects:", error);
    state.projects = DEMO_PROJECTS;
  }
}

function initThemeToggle() {
  if (window.SignorTheme && typeof window.SignorTheme.initThemeToggle === "function") {
    window.SignorTheme.initThemeToggle();
  }
}

async function init() {
  initThemeToggle();
  bindFilterEvents();

  try {
    await loadProjects();
    renderMetrics();
    renderCategoryFilters();
    updateChipStates();
    renderProjects();
  } catch (error) {
    console.error(error);
    const grid = document.getElementById("projectGrid");
    const empty = document.getElementById("emptyState");
    if (grid) {
      grid.innerHTML = "";
    }
    if (empty) {
      empty.textContent = "Unable to load projects right now.";
      empty.classList.remove("hidden");
    }
  }
}

window.addEventListener("DOMContentLoaded", init);
