    (function () {
      const state = {
        projects: [],
        query: "",
        category: "all",
        type: "all",
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
        },
      ];

      function esc(v) {
        return String(v)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function escAttr(v) {
        return esc(v).replace(/`/g, "&#096;");
      }

      function thumb(project) {
        if (project.thumbnailUrl) return project.thumbnailUrl;
        if (Array.isArray(project.gallery) && project.gallery.length > 0) return project.gallery[0];
        return "";
      }

      function themeCurrent() {
        return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      }

      function themeStored() {
        try {
          return localStorage.getItem("signor_theme") === "light" ? "light" : "dark";
        } catch (_) {
          return "dark";
        }
      }

      function applyTheme(theme, persist) {
        const resolved = theme === "light" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", resolved);
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
          try { localStorage.setItem("signor_theme", resolved); } catch (_) {}
        }
      }

      function bindTheme() {
        applyTheme(themeStored(), false);
        const btn = document.getElementById("themeToggle");
        if (!btn) return;
        btn.addEventListener("click", function () {
          const next = themeCurrent() === "light" ? "dark" : "light";
          applyTheme(next, true);
        });
      }

      function normalizeCategory(value) {
        const v = String(value || "").trim();
        return v || "Other";
      }

      function searchText(project) {
        const stack = Array.isArray(project.techStack) ? project.techStack.join(" ") : "";
        return [project.title, project.description, project.category, project.projectType, stack]
          .join(" ")
          .toLowerCase();
      }

      function filtered() {
        const q = state.query.trim().toLowerCase();
        return state.projects.filter(function (p) {
          if (state.category !== "all" && normalizeCategory(p.category).toLowerCase() !== state.category) return false;
          if (state.type !== "all" && String(p.projectType || "").toLowerCase() !== state.type) return false;
          if (q && !searchText(p).includes(q)) return false;
          return true;
        });
      }

      function renderMetrics() {
        const projectEl = document.getElementById("metricProjects");
        const catEl = document.getElementById("metricCategories");
        const cats = new Set(state.projects.map(function (p) { return normalizeCategory(p.category); }));
        if (projectEl) projectEl.textContent = String(state.projects.length);
        if (catEl) catEl.textContent = String(cats.size);
      }

      function renderCategories() {
        const wrap = document.getElementById("categoryFilters");
        if (!wrap) return;

        const cats = Array.from(new Set(state.projects.map(function (p) { return normalizeCategory(p.category); })))
          .sort(function (a, b) { return a.localeCompare(b); });

        const html = [
          '<button class="chip active" type="button" data-category="all">All</button>'
        ];

        cats.forEach(function (c) {
          html.push('<button class="chip" type="button" data-category="' + escAttr(c.toLowerCase()) + '">' + esc(c) + '</button>');
        });

        wrap.innerHTML = html.join("");
      }

      function renderGrid() {
        const grid = document.getElementById("projectGrid");
        const empty = document.getElementById("emptyState");
        if (!grid || !empty) return;

        const projects = filtered();
        if (!projects.length) {
          grid.innerHTML = "";
          empty.classList.remove("hidden");
          return;
        }

        empty.classList.add("hidden");

        grid.innerHTML = projects.map(function (p) {
          const t = thumb(p);
          const theme = ["invoice", "calendar", "notes"].includes(p.iconTheme) ? p.iconTheme : "invoice";
          const url = '/projects/' + encodeURIComponent(p.slug);
          const actions = [ '<a class="link primary" href="' + url + '">Open</a>' ];
          if (p.demoUrl) {
            actions.push('<a class="link" href="' + escAttr(p.demoUrl) + '" target="_blank" rel="noreferrer">Demo</a>');
          } else if (p.downloadUrl) {
            actions.push('<a class="link" href="' + escAttr(p.downloadUrl) + '" target="_blank" rel="noreferrer">Download</a>');
          }

          const thumbHtml = t
            ? '<img class="thumb" src="' + escAttr(t) + '" alt="' + escAttr(p.title) + ' thumbnail" loading="lazy" />'
            : '<div class="thumb fallback" aria-hidden="true">' + esc(p.icon || '✦') + '</div>';

          return '' +
            '<article class="card">' +
              '<div class="card-top">' +
                '<div class="icon ' + theme + '">' + esc(p.icon || '✦') + '</div>' +
                thumbHtml +
              '</div>' +
              '<h3>' + esc(p.title || 'Untitled') + '</h3>' +
              '<p class="desc">' + esc(p.description || '') + '</p>' +
              '<div class="meta">' +
                '<span class="pill">' + esc(normalizeCategory(p.category)) + '</span>' +
                '<span class="pill">' + esc(String(p.projectType || 'app')) + '</span>' +
                '<span class="pill">' + esc(String(p.year || '')) + '</span>' +
              '</div>' +
              '<div class="actions">' + actions.join('') + '</div>' +
            '</article>';
        }).join("");

        window.requestAnimationFrame(function () {
          document.querySelectorAll('.card').forEach(function (el, idx) {
            window.setTimeout(function () {
              el.classList.add('in');
            }, idx * 22);
          });
        });
      }

      function updateChips() {
        document.querySelectorAll('[data-category]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-category') === state.category);
        });
        document.querySelectorAll('[data-type]').forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-type') === state.type);
        });
      }

      function bindFilters() {
        const search = document.getElementById('searchInput');
        const cats = document.getElementById('categoryFilters');
        const types = document.getElementById('typeFilters');

        if (search) {
          search.addEventListener('input', function () {
            state.query = search.value || '';
            renderGrid();
          });
        }

        if (cats) {
          cats.addEventListener('click', function (event) {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const button = target.closest('[data-category]');
            if (!button) return;
            state.category = button.getAttribute('data-category') || 'all';
            updateChips();
            renderGrid();
          });
        }

        if (types) {
          types.addEventListener('click', function (event) {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const button = target.closest('[data-type]');
            if (!button) return;
            state.type = button.getAttribute('data-type') || 'all';
            updateChips();
            renderGrid();
          });
        }

        window.addEventListener('keydown', function (event) {
          const active = document.activeElement;
          const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
          if (event.key === '/' && !typing) {
            event.preventDefault();
            if (search) {
              search.focus();
              search.select();
            }
          }

          if (event.key === 'Escape' && search && document.activeElement === search) {
            search.value = '';
            state.query = '';
            renderGrid();
            search.blur();
          }
        });
      }

      async function loadProjects() {
        if (window.location.protocol === 'file:') {
          state.projects = demoProjects;
          return;
        }

        try {
          const response = await fetch('/api/projects', { headers: { Accept: 'application/json' } });
          if (!response.ok) {
            throw new Error('Project request failed: ' + response.status);
          }
          const data = await response.json();
          if (!Array.isArray(data) || data.length === 0) {
            state.projects = demoProjects;
            return;
          }
          state.projects = data;
        } catch (error) {
          console.warn('Using demo data fallback', error);
          state.projects = demoProjects;
        }
      }

      async function init() {
        bindTheme();
        bindFilters();
        await loadProjects();
        renderMetrics();
        renderCategories();
        updateChips();
        renderGrid();
      }

      window.addEventListener('DOMContentLoaded', init);
    })();
