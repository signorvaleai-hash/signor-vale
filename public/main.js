function renderProjectCards(projects) {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  if (!Array.isArray(projects) || projects.length === 0) {
    grid.innerHTML = '<p class="empty-state">No projects published yet.</p>';
    return;
  }

  grid.innerHTML = projects
    .map((project) => {
      const widgetClass = project.featured ? "widget widget-large" : "widget";
      const iconTheme = ["invoice", "calendar", "notes"].includes(project.iconTheme)
        ? project.iconTheme
        : "invoice";
      const detailHref = `/projects/${encodeURIComponent(project.slug)}`;

      const actionLinks = [];
      actionLinks.push(`<a class="widget-action" href="${detailHref}">Open Project</a>`);

      if (project.demoUrl) {
        actionLinks.push(
          `<a class="widget-action widget-action-ghost" href="${escapeAttribute(project.demoUrl)}" target="_blank" rel="noreferrer">Live Demo</a>`
        );
      }
      if (project.downloadUrl) {
        actionLinks.push(
          `<a class="widget-action widget-action-ghost" href="${escapeAttribute(project.downloadUrl)}" target="_blank" rel="noreferrer">Download</a>`
        );
      }

      return `
        <article class="${widgetClass}" data-project-url="${detailHref}" tabindex="0" role="link" aria-label="Open ${escapeAttribute(project.title)}">
          <a class="widget-stretched-link" href="${detailHref}" aria-label="Open ${escapeAttribute(project.title)}"></a>
          <div class="widget-icon ${iconTheme}">${escapeHtml(project.icon || "✦")}</div>
          <div class="widget-title">${escapeHtml(project.title)}</div>
          <div class="widget-description">${escapeHtml(project.description)}</div>
          <div class="widget-meta">
            <span class="widget-badge">${escapeHtml(project.category)}</span>
            <span class="widget-badge">${escapeHtml(String(project.year))}</span>
            <span class="widget-badge">${escapeHtml(project.projectType || "app")}</span>
          </div>
          <div class="widget-actions">${actionLinks.join("")}</div>
        </article>
      `;
    })
    .join("");
}

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

async function loadProjects() {
  const grid = document.getElementById("projectsGrid");
  if (grid) {
    grid.innerHTML = '<p class="empty-state">Loading projects...</p>';
  }

  try {
    const response = await fetch("/api/projects", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Failed to load projects (${response.status})`);
    }

    const projects = await response.json();
    renderProjectCards(projects);
  } catch (error) {
    if (grid) {
      grid.innerHTML = `<p class="empty-state">Could not load projects right now.</p>`;
    }
    console.error(error);
  }
}

function bootAnimations() {
  if (!window.gsap || !window.ScrollTrigger) {
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    start: 50,
    onUpdate: (self) => {
      const nav = document.getElementById("navbar");
      if (!nav) return;
      if (self.scroll() > 50) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    },
  });

  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

  heroTl
    .to(".hero-eyebrow", { opacity: 1, y: 0, duration: 0.8, delay: 0.2 })
    .to(".hero-headline", { opacity: 1, y: 0, duration: 1, ease: "back.out(1.2)" }, "-=0.4")
    .to(".hero-subhead", { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
    .to(".hero-buttons", { opacity: 1, y: 0, duration: 0.8 }, "-=0.4")
    .to(".home-indicator", { opacity: 0.3, duration: 0.5 }, "-=0.2");

  gsap.to(".section-header", {
    scrollTrigger: { trigger: ".work", start: "top 80%" },
    opacity: 1,
    y: 0,
    duration: 0.8,
  });

  gsap.to(".settings-group", {
    scrollTrigger: { trigger: ".philosophy", start: "top 70%" },
    opacity: 1,
    y: 0,
    duration: 0.8,
  });

  gsap.to(".contact-title", {
    scrollTrigger: { trigger: ".contact", start: "top 70%" },
    opacity: 1,
    y: 0,
    duration: 0.8,
  });
  gsap.to(".contact-subtitle", {
    scrollTrigger: { trigger: ".contact", start: "top 70%" },
    opacity: 1,
    y: 0,
    duration: 0.8,
    delay: 0.1,
  });
  gsap.to(".contact-button", {
    scrollTrigger: { trigger: ".contact", start: "top 70%" },
    opacity: 1,
    y: 0,
    duration: 0.8,
    delay: 0.2,
  });

  runWidgetAnimations();
}

function runWidgetAnimations() {
  if (!window.gsap || !window.ScrollTrigger) {
    return;
  }

  const gsap = window.gsap;

  gsap.utils.toArray(".widget").forEach((widget, i) => {
    gsap.to(widget, {
      scrollTrigger: { trigger: widget, start: "top 85%" },
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      delay: i * 0.08,
      ease: "back.out(1.2)",
    });

    widget.addEventListener("mouseenter", () => {
      gsap.to(widget, { scale: 1.02, duration: 0.3, ease: "power2.out" });
    });

    widget.addEventListener("mouseleave", () => {
      gsap.to(widget, { scale: 1, duration: 0.3, ease: "power2.out" });
    });
  });
}

function enableWidgetCardNavigation() {
  document.querySelectorAll(".widget[data-project-url]").forEach((widget) => {
    if (widget.dataset.navBound === "1") {
      return;
    }
    widget.dataset.navBound = "1";

    widget.addEventListener("click", (event) => {
      const interactive =
        event.target instanceof Element
          ? event.target.closest("a,button,input,textarea,select,label")
          : null;
      if (interactive) {
        return;
      }
      const href = widget.dataset.projectUrl;
      if (href) {
        window.location.href = href;
      }
    });

    widget.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      const href = widget.dataset.projectUrl;
      if (href) {
        window.location.href = href;
      }
    });
  });
}

async function init() {
  await loadProjects();
  bootAnimations();
  runWidgetAnimations();
  enableWidgetCardNavigation();
}

window.addEventListener("DOMContentLoaded", init);
