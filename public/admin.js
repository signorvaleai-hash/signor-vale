const TOKEN_KEY = "signor_admin_token";

const loginCard = document.getElementById("loginCard");
const adminCard = document.getElementById("adminCard");
const loginForm = document.getElementById("loginForm");
const projectForm = document.getElementById("projectForm");
const projectsTableBody = document.getElementById("projectsTableBody");

const loginError = document.getElementById("loginError");
const adminError = document.getElementById("adminError");

const resetButton = document.getElementById("resetButton");
const logoutButton = document.getElementById("logoutButton");
const titleInput = document.getElementById("title");
const slugInput = document.getElementById("slug");

let slugTouched = false;
let currentProjects = [];

function initThemeToggle() {
  if (window.SignorTheme && typeof window.SignorTheme.initThemeToggle === "function") {
    window.SignorTheme.initThemeToggle();
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

function setAuthState(isAuthed) {
  loginCard.classList.toggle("hidden", isAuthed);
  adminCard.classList.toggle("hidden", !isAuthed);
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitList(value) {
  return String(value || "")
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDateTimeLocal(isoString) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeLocal(localValue) {
  if (!localValue) {
    return "";
  }

  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    setToken("");
    setAuthState(false);
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function clearProjectForm() {
  document.getElementById("projectId").value = "";
  document.getElementById("title").value = "";
  document.getElementById("slug").value = "";
  document.getElementById("description").value = "";
  document.getElementById("details").value = "";
  document.getElementById("category").value = "";
  document.getElementById("projectType").value = "app";
  document.getElementById("status").value = "published";
  document.getElementById("year").value = new Date().getFullYear();
  document.getElementById("icon").value = "✦";
  document.getElementById("iconTheme").value = "invoice";
  document.getElementById("displayOrder").value = 0;
  document.getElementById("thumbnailUrl").value = "";
  document.getElementById("demoUrl").value = "";
  document.getElementById("repoUrl").value = "";
  document.getElementById("downloadUrl").value = "";
  document.getElementById("techStack").value = "";
  document.getElementById("gallery").value = "";
  document.getElementById("publishedAt").value = "";
  document.getElementById("featured").checked = false;
  slugTouched = false;
}

function fillProjectForm(project) {
  document.getElementById("projectId").value = project.id;
  document.getElementById("title").value = project.title;
  document.getElementById("slug").value = project.slug;
  document.getElementById("description").value = project.description;
  document.getElementById("details").value = project.details || project.description;
  document.getElementById("category").value = project.category;
  document.getElementById("projectType").value = project.projectType || "app";
  document.getElementById("status").value = project.status || "published";
  document.getElementById("year").value = project.year;
  document.getElementById("icon").value = project.icon;
  document.getElementById("iconTheme").value = project.iconTheme;
  document.getElementById("displayOrder").value = project.displayOrder;
  document.getElementById("thumbnailUrl").value = project.thumbnailUrl || "";
  document.getElementById("demoUrl").value = project.demoUrl || "";
  document.getElementById("repoUrl").value = project.repoUrl || "";
  document.getElementById("downloadUrl").value = project.downloadUrl || "";
  document.getElementById("techStack").value = (project.techStack || []).join(", ");
  document.getElementById("gallery").value = (project.gallery || []).join("\n");
  document.getElementById("publishedAt").value = toDateTimeLocal(project.publishedAt);
  document.getElementById("featured").checked = Boolean(project.featured);
  slugTouched = true;
}

function serializeProjectForm() {
  return {
    title: document.getElementById("title").value.trim(),
    slug: document.getElementById("slug").value.trim(),
    description: document.getElementById("description").value.trim(),
    details: document.getElementById("details").value.trim(),
    category: document.getElementById("category").value.trim(),
    projectType: document.getElementById("projectType").value,
    status: document.getElementById("status").value,
    year: Number(document.getElementById("year").value),
    icon: document.getElementById("icon").value.trim(),
    iconTheme: document.getElementById("iconTheme").value,
    displayOrder: Number(document.getElementById("displayOrder").value),
    thumbnailUrl: document.getElementById("thumbnailUrl").value.trim(),
    demoUrl: document.getElementById("demoUrl").value.trim(),
    repoUrl: document.getElementById("repoUrl").value.trim(),
    downloadUrl: document.getElementById("downloadUrl").value.trim(),
    techStack: splitList(document.getElementById("techStack").value),
    gallery: splitList(document.getElementById("gallery").value),
    publishedAt: fromDateTimeLocal(document.getElementById("publishedAt").value),
    featured: document.getElementById("featured").checked,
  };
}

function renderRows(projects) {
  projectsTableBody.innerHTML = "";

  for (const project of projects) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(project.title)}</td>
      <td>${escapeHtml(project.slug || "")}</td>
      <td>${escapeHtml(project.projectType || "")}</td>
      <td>${escapeHtml(project.status || "")}</td>
      <td>${escapeHtml(String(project.year))}</td>
      <td>${escapeHtml(String(project.displayOrder))}</td>
      <td>${project.featured ? "Yes" : "No"}</td>
      <td class="actionsCell">
        <a class="linkButton" href="/projects/${encodeURIComponent(project.slug)}" target="_blank" rel="noreferrer">View</a>
        <button class="secondary" data-action="edit" data-id="${project.id}">Edit</button>
        <button class="danger" data-action="delete" data-id="${project.id}">Delete</button>
      </td>
    `;

    projectsTableBody.appendChild(tr);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProjects() {
  adminError.textContent = "";
  currentProjects = await request("/api/admin/projects");
  renderRows(currentProjects);
}

titleInput.addEventListener("input", () => {
  if (!slugTouched || !slugInput.value.trim()) {
    slugInput.value = slugify(titleInput.value);
  }
});

slugInput.addEventListener("input", () => {
  slugTouched = true;
  slugInput.value = slugify(slugInput.value);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  try {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const data = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setToken(data.token);
    setAuthState(true);
    clearProjectForm();
    await loadProjects();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminError.textContent = "";

  try {
    const projectId = document.getElementById("projectId").value;
    const payload = serializeProjectForm();

    if (projectId) {
      await request(`/api/admin/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await request("/api/admin/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    clearProjectForm();
    await loadProjects();
  } catch (error) {
    adminError.textContent = error.message;
  }
});

projectsTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const id = Number(target.dataset.id);

  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  if (action === "edit") {
    const project = currentProjects.find((item) => item.id === id);
    if (project) {
      fillProjectForm(project);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm("Delete this project?");
    if (!confirmed) {
      return;
    }

    try {
      await request(`/api/admin/projects/${id}`, { method: "DELETE" });
      clearProjectForm();
      await loadProjects();
    } catch (error) {
      adminError.textContent = error.message;
    }
  }
});

resetButton.addEventListener("click", () => {
  clearProjectForm();
  adminError.textContent = "";
});

logoutButton.addEventListener("click", () => {
  setToken("");
  setAuthState(false);
  loginForm.reset();
  loginError.textContent = "";
});

async function init() {
  initThemeToggle();
  clearProjectForm();
  const token = getToken();
  if (!token) {
    setAuthState(false);
    return;
  }

  try {
    setAuthState(true);
    await loadProjects();
  } catch {
    setToken("");
    setAuthState(false);
  }
}

window.addEventListener("DOMContentLoaded", init);
