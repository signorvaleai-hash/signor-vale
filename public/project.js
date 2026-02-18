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

function makeActionLink(label, href, primary = false) {
  const link = document.createElement("a");
  link.className = primary ? "project-action project-action-primary" : "project-action";
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
  const metaLineEl = document.getElementById("projectMetaLine");
  const techLineEl = document.getElementById("projectTechLine");
  const actionsEl = document.getElementById("projectActions");
  const galleryEl = document.getElementById("projectGallery");
  const thumbnailEl = document.getElementById("projectThumbnail");

  if (!typeEl || !titleEl || !descEl || !detailsEl || !metaLineEl || !techLineEl || !actionsEl || !galleryEl || !thumbnailEl) {
    return;
  }

  typeEl.textContent = project.projectType || "project";
  titleEl.textContent = project.title || "Untitled Project";
  descEl.textContent = project.description || "";

  const metaParts = [];
  if (project.category) metaParts.push(project.category);
  if (project.year) metaParts.push(String(project.year));
  metaLineEl.textContent = metaParts.join(" · ");
  setVisible("projectMetaLine", metaParts.length > 0);

  if (project.thumbnailUrl) {
    thumbnailEl.src = project.thumbnailUrl;
    thumbnailEl.classList.remove("hidden");
  } else {
    thumbnailEl.classList.add("hidden");
    thumbnailEl.removeAttribute("src");
  }

  actionsEl.innerHTML = "";
  if (project.demoUrl) {
    actionsEl.appendChild(makeActionLink("Live Demo", project.demoUrl, true));
  }
  if (project.downloadUrl) {
    actionsEl.appendChild(makeActionLink("Download", project.downloadUrl, !project.demoUrl));
  }
  if (project.repoUrl) {
    actionsEl.appendChild(makeActionLink("Source", project.repoUrl, false));
  }
  setVisible("projectActions", actionsEl.children.length > 0);

  const detailsText = (project.details || "").trim();
  const descText = (project.description || "").trim();
  const showDetails = detailsText && detailsText !== descText;
  detailsEl.textContent = showDetails ? detailsText : "";
  setVisible("detailsSection", Boolean(showDetails));

  const stack = Array.isArray(project.techStack) ? project.techStack.filter(Boolean) : [];
  techLineEl.textContent = stack.join(" · ");
  setVisible("techSection", stack.length > 0);

  galleryEl.innerHTML = "";
  const gallery = Array.isArray(project.gallery) ? project.gallery.filter(Boolean) : [];
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
