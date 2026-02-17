function getProjectSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "projects") {
    return "";
  }
  return decodeURIComponent(parts[1] || "");
}

function setVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("hidden", !visible);
}

function makeMetaBadge(text) {
  const badge = document.createElement("span");
  badge.className = "project-badge";
  badge.textContent = text;
  return badge;
}

function makeActionLink(label, href, ghost = false) {
  const link = document.createElement("a");
  link.className = ghost ? "project-action project-action-ghost" : "project-action";
  link.textContent = label;
  link.href = href;

  if (/^https?:\/\//i.test(href)) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }

  return link;
}

function renderProject(project) {
  document.title = `${project.title} | Signor Vale`;

  const typeEl = document.getElementById("projectType");
  const titleEl = document.getElementById("projectTitle");
  const descEl = document.getElementById("projectDescription");
  const detailsEl = document.getElementById("projectDetails");
  const metaEl = document.getElementById("projectMeta");
  const techEl = document.getElementById("projectTech");
  const actionsEl = document.getElementById("projectActions");
  const galleryEl = document.getElementById("projectGallery");
  const thumbnailEl = document.getElementById("projectThumbnail");

  if (!typeEl || !titleEl || !descEl || !detailsEl || !metaEl || !techEl || !actionsEl || !galleryEl || !thumbnailEl) {
    return;
  }

  typeEl.textContent = project.projectType || "project";
  titleEl.textContent = project.title || "Untitled Project";
  descEl.textContent = project.description || "";
  detailsEl.textContent = project.details || project.description || "";

  metaEl.innerHTML = "";
  metaEl.appendChild(makeMetaBadge(project.category || "General"));
  metaEl.appendChild(makeMetaBadge(String(project.year || "")));
  if (project.status) {
    metaEl.appendChild(makeMetaBadge(project.status));
  }

  if (project.thumbnailUrl) {
    thumbnailEl.src = project.thumbnailUrl;
    thumbnailEl.classList.remove("hidden");
  } else {
    thumbnailEl.classList.add("hidden");
    thumbnailEl.removeAttribute("src");
  }

  actionsEl.innerHTML = "";
  actionsEl.appendChild(makeActionLink("Back to Home", "/", true));
  if (project.demoUrl) {
    actionsEl.appendChild(makeActionLink("Live Demo", project.demoUrl));
  }
  if (project.downloadUrl) {
    actionsEl.appendChild(makeActionLink("Download", project.downloadUrl));
  }
  if (project.repoUrl) {
    actionsEl.appendChild(makeActionLink("Source Code", project.repoUrl, true));
  }

  techEl.innerHTML = "";
  const stack = Array.isArray(project.techStack) ? project.techStack : [];
  if (stack.length === 0) {
    techEl.appendChild(makeMetaBadge("No tech stack added yet"));
  } else {
    for (const item of stack) {
      techEl.appendChild(makeMetaBadge(item));
    }
  }

  galleryEl.innerHTML = "";
  const gallery = Array.isArray(project.gallery) ? project.gallery : [];
  if (gallery.length > 0) {
    for (const imageUrl of gallery) {
      const img = document.createElement("img");
      img.className = "gallery-image";
      img.src = imageUrl;
      img.alt = `${project.title} screenshot`;
      img.loading = "lazy";
      galleryEl.appendChild(img);
    }
    setVisible("gallerySection", true);
  } else {
    setVisible("gallerySection", false);
  }
}

async function init() {
  const slug = getProjectSlugFromPath();

  if (!slug) {
    setVisible("projectLoading", false);
    setVisible("projectNotFound", true);
    return;
  }

  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const project = await response.json();
    renderProject(project);
    setVisible("projectLoading", false);
    setVisible("projectDetail", true);
  } catch (error) {
    console.error(error);
    setVisible("projectLoading", false);
    setVisible("projectNotFound", true);
  }
}

window.addEventListener("DOMContentLoaded", init);
