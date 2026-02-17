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
  document.getElementById("description").value = "";
  document.getElementById("category").value = "";
  document.getElementById("year").value = new Date().getFullYear();
  document.getElementById("icon").value = "✦";
  document.getElementById("iconTheme").value = "invoice";
  document.getElementById("displayOrder").value = 0;
  document.getElementById("featured").checked = false;
}

function fillProjectForm(project) {
  document.getElementById("projectId").value = project.id;
  document.getElementById("title").value = project.title;
  document.getElementById("description").value = project.description;
  document.getElementById("category").value = project.category;
  document.getElementById("year").value = project.year;
  document.getElementById("icon").value = project.icon;
  document.getElementById("iconTheme").value = project.iconTheme;
  document.getElementById("displayOrder").value = project.displayOrder;
  document.getElementById("featured").checked = Boolean(project.featured);
}

function serializeProjectForm() {
  return {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value.trim(),
    year: Number(document.getElementById("year").value),
    icon: document.getElementById("icon").value.trim(),
    iconTheme: document.getElementById("iconTheme").value,
    displayOrder: Number(document.getElementById("displayOrder").value),
    featured: document.getElementById("featured").checked,
  };
}

function renderRows(projects) {
  projectsTableBody.innerHTML = "";

  for (const project of projects) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(project.title)}</td>
      <td>${escapeHtml(project.category)}</td>
      <td>${escapeHtml(String(project.year))}</td>
      <td>${escapeHtml(String(project.displayOrder))}</td>
      <td>${project.featured ? "Yes" : "No"}</td>
      <td class="actionsCell">
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

let currentProjects = [];

async function loadProjects() {
  adminError.textContent = "";
  currentProjects = await request("/api/admin/projects");
  renderRows(currentProjects);
}

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
