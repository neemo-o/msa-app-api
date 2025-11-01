const API_BASE = "/api";

let currentUser = null;
let churches = [];
let logs = [];
let logFilters = { level: "", context: "" };

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 5000);
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let isAuthChecking = false;
let authChecked = false;

async function checkAuth() {
  if (authChecked) return true;
  if (isAuthChecking) return false;
  isAuthChecking = true;

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/index.html";
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Verificação falhou");
    }

    const data = await response.json();

    if (!data.valid || data.user.role !== "ADMINISTRADOR") {
      showToast("Acesso negado", "error");
      localStorage.removeItem("token");
      window.location.href = "/index.html";
      return false;
    }

    currentUser = data.user;
    document.getElementById("userName").textContent = data.user.name;
    document.querySelector(".avatar").textContent = data.user.name
      .charAt(0)
      .toUpperCase();
    isAuthChecking = false;
    authChecked = true;
    return true;
  } catch (error) {
    console.error("Erro na verificação:", error);
    localStorage.removeItem("token");
    window.location.href = "/index.html";
    return false;
  }
}

function initTabs() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tabName = item.dataset.tab;

      navItems.forEach((i) => i.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(`${tabName}Tab`).classList.add("active");

      const titles = {
        dashboard: "Dashboard",
        users: "Usuários",
        churches: "Igrejas",
        requests: "Solicitações",
        logs: "Logs",
      };
      document.getElementById("pageTitle").textContent = titles[tabName];

      loadTabData(tabName);
    });
  });
}

function loadTabData(tabName) {
  switch (tabName) {
    case "dashboard":
      loadDashboard();
      break;
    case "users":
      loadUsers();
      break;
    case "churches":
      loadChurches();
      break;
    case "requests":
      loadRequests();
      break;
    case "logs":
      loadLogs();
      break;
  }
}

async function loadDashboard() {
  try {
    const [usersRes, churchesRes, healthRes] = await Promise.all([
      fetch(`${API_BASE}/users`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/churchs`),
      fetch("/health"),
    ]);

    const usersData = await usersRes.json();
    const churchesData = await churchesRes.json();
    const healthData = await healthRes.json();

    document.getElementById("totalUsers").textContent =
      usersData.users?.length || 0;
    document.getElementById("totalChurches").textContent =
      churchesData.churches?.length || 0;

    let pendingCount = 0;
    try {
      const requestsRes = await fetch(`${API_BASE}/entry-requests`, {
        headers: getAuthHeaders(),
      });
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        pendingCount = requestsData.requests?.length || 0;
      }
    } catch (error) {
      console.log("Erro ao carregar solicitações (pode não ter encarregado)");
    }

    document.getElementById("pendingRequests").textContent = pendingCount;

    const recentActivity = document.getElementById("recentActivity");
    recentActivity.innerHTML = `
            <div class="activity-item">
                <i class="fas fa-users"></i>
                <span>${
                  usersData.users?.length || 0
                } usuários cadastrados</span>
            </div>
            <div class="activity-item">
                <i class="fas fa-church"></i>
                <span>${
                  churchesData.churches?.length || 0
                } igrejas ativas</span>
            </div>
            <div class="activity-item">
                <i class="fas fa-clock"></i>
                <span>${pendingCount} solicitações pendentes</span>
            </div>
        `;

    const systemStatus = document.getElementById("systemStatus");
    systemStatus.innerHTML = `
            <div class="status-item">
                <span>Status do Sistema</span>
                <span class="status-badge online">${
                  healthData.status || "healthy"
                }</span>
            </div>
            <div class="status-item">
                <span>Banco de Dados</span>
                <span class="status-badge online">${
                  healthData.database?.status || "connected"
                }</span>
            </div>
            <div class="status-item">
                <span>Uptime</span>
                <span>${formatUptime(healthData.uptime)}</span>
            </div>
            <div class="status-item">
                <span>Memória Usada</span>
                <span>${healthData.memory?.used || 0} MB</span>
            </div>
        `;

    await loadLogStats();
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    showToast("Erro ao carregar algumas informações do dashboard", "error");
  }
}

function formatUptime(seconds) {
  if (!seconds) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (response.ok) {
      renderUsersTable(data.users);
    } else {
      showToast("Erro ao carregar usuários", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao carregar usuários", "error");
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = "";

  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role.toLowerCase()}">${
      user.role
    }</span></td>
            <td>${user.phase || "N/A"}</td>
            <td>${user.church?.name || "Sem igreja"}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editUser('${
                      user.id
                    }')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser('${
                      user.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

async function loadChurchesForSelect() {
  try {
    const response = await fetch(`${API_BASE}/churchs`);
    const data = await response.json();

    if (response.ok) {
      churches = data.churches;
      const select = document.getElementById("userChurch");
      select.innerHTML = '<option value="">Selecione uma igreja</option>';
      churches.forEach((church) => {
        select.innerHTML += `<option value="${church.id}">${church.name}</option>`;
      });
    }
  } catch (error) {
    console.error("Erro ao carregar igrejas:", error);
  }
}

function showUserModal(user = null) {
  const modal = document.getElementById("userModal");
  const form = document.getElementById("userForm");
  const title = document.getElementById("userModalTitle");

  if (user) {
    title.textContent = "Editar Usuário";
    document.getElementById("userId").value = user.id;
    document.getElementById("userName").value = user.name;
    document.getElementById("userEmail").value = user.email;
    document.getElementById("userPassword").value = "";
    document.getElementById("userRole").value = user.role;
    document.getElementById("userChurch").value = user.churchId || "";
    document.getElementById("userPhase").value = user.phase || "";
  } else {
    title.textContent = "Adicionar Usuário";
    form.reset();
    document.getElementById("userId").value = "";
  }

  loadChurchesForSelect();
  togglePhaseField();
  modal.style.display = "block";
}

function togglePhaseField() {
  const role = document.getElementById("userRole").value;
  const phaseGroup = document.getElementById("phaseGroup");
  const phaseInput = document.getElementById("userPhase");

  if (role === "APRENDIZ") {
    phaseGroup.style.display = "block";
    phaseInput.required = true;
  } else {
    phaseGroup.style.display = "none";
    phaseInput.required = false;
  }
}

async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;
  const userData = {
    name: document.getElementById("userName").value,
    email: document.getElementById("userEmail").value,
    role: document.getElementById("userRole").value,
    churchId: document.getElementById("userChurch").value || null,
    phase: document.getElementById("userPhase").value || null,
  };

  const password = document.getElementById("userPassword").value;
  if (password) {
    userData.password = password;
  }

  if (userData.role !== "ADMINISTRADOR" && !userData.churchId) {
    showToast("Igreja é obrigatória para este tipo de usuário", "error");
    return;
  }

  if (userData.role === "APRENDIZ" && !userData.phase) {
    showToast("Fase é obrigatória para aprendizes", "error");
    return;
  }

  try {
    const url = userId ? `${API_BASE}/users/${userId}` : `${API_BASE}/users`;
    const method = userId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("Usuário salvo com sucesso", "success");
      closeModal("userModal");
      loadUsers();
    } else {
      showToast(data.error || "Erro ao salvar usuário", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao salvar usuário", "error");
  }
}

async function editUser(userId) {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (response.ok) {
      showUserModal(data.user);
    } else {
      showToast("Erro ao carregar usuário", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao carregar usuário", "error");
  }
}

async function deleteUser(userId) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      showToast("Usuário excluído com sucesso", "success");
      loadUsers();
    } else {
      const data = await response.json();
      showToast(data.error || "Erro ao excluir usuário", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao excluir usuário", "error");
  }
}

async function loadChurches() {
  try {
    const response = await fetch(`${API_BASE}/churchs`);
    const data = await response.json();

    if (response.ok) {
      renderChurchesGrid(data.churches);
    } else {
      showToast("Erro ao carregar igrejas", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao carregar igrejas", "error");
  }
}

function renderChurchesGrid(churches) {
  const grid = document.getElementById("churchesGrid");
  grid.innerHTML = "";

  churches.forEach((church) => {
    const card = document.createElement("div");
    card.className = "church-card";
    card.innerHTML = `
            <h4>${church.name}</h4>
            <p>${church.description || "Sem descrição"}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${
              church.address || "N/A"
            }</p>
            <p><i class="fas fa-phone"></i> ${church.phone || "N/A"}</p>
            <p><i class="fas fa-envelope"></i> ${church.email || "N/A"}</p>
            <div class="action-buttons" style="margin-top: 12px;">
                <button class="btn btn-edit" onclick="editChurch('${
                  church.id
                }')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger" onclick="deleteChurch('${
                  church.id
                }')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    grid.appendChild(card);
  });
}

function showChurchModal(church = null) {
  const modal = document.getElementById("churchModal");
  const form = document.getElementById("churchForm");
  const title = document.getElementById("churchModalTitle");

  if (church) {
    title.textContent = "Editar Igreja";
    document.getElementById("churchId").value = church.id;
    document.getElementById("churchName").value = church.name;
    document.getElementById("churchDescription").value =
      church.description || "";
    document.getElementById("churchAddress").value = church.address || "";
    document.getElementById("churchPhone").value = church.phone || "";
    document.getElementById("churchEmail").value = church.email || "";
  } else {
    title.textContent = "Adicionar Igreja";
    form.reset();
    document.getElementById("churchId").value = "";
  }

  modal.style.display = "block";
}

async function saveChurch(event) {
  event.preventDefault();

  const churchId = document.getElementById("churchId").value;
  const churchData = {
    name: document.getElementById("churchName").value,
    description: document.getElementById("churchDescription").value,
    address: document.getElementById("churchAddress").value,
    phone: document.getElementById("churchPhone").value,
    email: document.getElementById("churchEmail").value,
  };

  try {
    const url = churchId
      ? `${API_BASE}/churchs/${churchId}`
      : `${API_BASE}/churchs`;
    const method = churchId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(churchData),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("Igreja salva com sucesso", "success");
      closeModal("churchModal");
      loadChurches();
    } else {
      showToast(data.error || "Erro ao salvar igreja", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao salvar igreja", "error");
  }
}

async function editChurch(churchId) {
  try {
    const response = await fetch(`${API_BASE}/churchs/${churchId}`);
    const data = await response.json();

    if (response.ok) {
      showChurchModal(data.church);
    } else {
      showToast("Erro ao carregar igreja", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao carregar igreja", "error");
  }
}

async function deleteChurch(churchId) {
  if (!confirm("Tem certeza que deseja excluir esta igreja?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/churchs/${churchId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      showToast("Igreja excluída com sucesso", "success");
      loadChurches();
    } else {
      const data = await response.json();
      showToast(data.error || "Erro ao excluir igreja", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao excluir igreja", "error");
  }
}

async function loadRequests() {
  try {
    const response = await fetch(`${API_BASE}/entry-requests`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 403) {
      const container = document.getElementById("requestsList");
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary);">Esta funcionalidade está disponível apenas para Encarregados</p>';
      return;
    }

    const data = await response.json();

    if (response.ok) {
      renderRequests(data.requests);
    } else {
      showToast("Erro ao carregar solicitações", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar solicitações:", error);
    showToast("Erro ao carregar solicitações", "error");
  }
}

function renderRequests(requests) {
  const container = document.getElementById("requestsList");
  container.innerHTML = "";

  if (requests.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">Nenhuma solicitação pendente</p>';
    return;
  }

  requests.forEach((request) => {
    const card = document.createElement("div");
    card.className = "request-card";
    card.innerHTML = `
            <div class="request-info">
                <h4>${request.user.name}</h4>
                <p><i class="fas fa-envelope"></i> ${request.user.email}</p>
                <p><i class="fas fa-user-tag"></i> ${request.user.role}</p>
                <p><i class="fas fa-church"></i> ${request.church?.name || "Igreja não especificada"}</p>
                <p><i class="fas fa-clock"></i> ${request.status}</p>
            </div>
            ${
              request.status === "EM_ANALISE"
                ? `
                <button class="btn btn-primary" onclick="approveRequest('${request.id}')">
                    <i class="fas fa-check"></i> Aprovar
                </button>
            `
                : ""
            }
        `;
    container.appendChild(card);
  });
}

async function approveRequest(requestId) {
  try {
    const response = await fetch(
      `${API_BASE}/entry-requests/${requestId}/approve`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      }
    );

    if (response.ok) {
      showToast("Solicitação aprovada com sucesso", "success");
      loadRequests();
    } else {
      const data = await response.json();
      showToast(data.error || "Erro ao aprovar solicitação", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao aprovar solicitação", "error");
  }
}

async function loadLogs() {
  try {
    const response = await fetch(`${API_BASE}/logs`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar logs");
    }

    const data = await response.json();
    logs = data.logs || [];
    renderLogs();
    updateLogStats();
  } catch (error) {
    console.error("Erro ao carregar logs:", error);
    const container = document.getElementById("logsContainer");
    container.innerHTML =
      '<p style="color: #858585; text-align: center;">Não foi possível carregar os logs. Verifique se a rota /api/logs está configurada.</p>';
    showToast("Erro ao carregar logs", "error");
  }
}

function renderLogs() {
  const container = document.getElementById("logsContainer");
  container.innerHTML = "";

  let filteredLogs = logs;

  if (logFilters.level) {
    filteredLogs = filteredLogs.filter((log) => log.level === logFilters.level);
  }

  if (logFilters.context) {
    filteredLogs = filteredLogs.filter(
      (log) => log.context === logFilters.context
    );
  }

  if (filteredLogs.length === 0) {
    container.innerHTML =
      '<p style="color: #858585; text-align: center;">Nenhum log encontrado</p>';
    return;
  }

  filteredLogs.slice(0, 500).forEach((log) => {
    const entry = document.createElement("div");
    entry.className = `log-entry ${log.level}`;
    entry.innerHTML = `
            <span class="log-timestamp">[${new Date(
              log.timestamp
            ).toLocaleString()}]</span>
            <span class="log-level ${log.level}">${log.level}</span>
            ${
              log.context
                ? `<span class="log-context">[${log.context}]</span>`
                : ""
            }
            <span class="log-message">${log.message}</span>
            ${
              log.error
                ? `<pre style="margin-top: 8px; color: #f48771;">${JSON.stringify(
                    log.error,
                    null,
                    2
                  )}</pre>`
                : ""
            }
        `;
    container.appendChild(entry);
  });
}

function updateLogStats() {
  const errorCount = logs.filter((log) => log.level === "ERROR").length;
  const warnCount = logs.filter((log) => log.level === "WARN").length;

  document.getElementById("logTotal").textContent = logs.length;
  document.getElementById("logErrors").textContent = errorCount;
  document.getElementById("logWarnings").textContent = warnCount;
  document.getElementById("recentErrors").textContent = errorCount;
}

async function loadLogStats() {
  try {
    const response = await fetch(`${API_BASE}/logs/stats`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const fileSize = data.fileSize ? (data.fileSize / 1024).toFixed(2) : 0;
      document.getElementById("logFileSize").textContent = `${fileSize} KB`;

      if (data.totalEntries !== undefined) {
        const errorApprox = Math.floor(data.totalEntries * 0.05);
        document.getElementById("recentErrors").textContent = errorApprox;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar stats:", error);
  }
}

async function clearLogs() {
  if (
    !confirm(
      "Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/logs/clear`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      showToast("Logs limpos com sucesso", "success");
      loadLogs();
    } else {
      showToast("Erro ao limpar logs", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao limpar logs", "error");
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  // Verificar se estamos na página admin
  const isAdminPage = document.getElementById("adminPage") !== null;

  if (isAdminPage) {
    // Lógica específica para página admin
    console.log("Página admin detectada");
    if (!(await checkAuth())) return;

    initTabs();
    loadDashboard();

    document.getElementById("logoutBtn").addEventListener("click", logout);
    document
      .getElementById("addUserBtn")
      .addEventListener("click", () => showUserModal());
    document
      .getElementById("addChurchBtn")
      .addEventListener("click", () => showChurchModal());

    document.getElementById("userForm").addEventListener("submit", saveUser);
    document.getElementById("churchForm").addEventListener("submit", saveChurch);
    document
      .getElementById("userRole")
      .addEventListener("change", togglePhaseField);

    document.getElementById("logLevelFilter").addEventListener("change", (e) => {
      logFilters.level = e.target.value;
      renderLogs();
    });

    document
      .getElementById("logContextFilter")
      .addEventListener("change", (e) => {
        logFilters.context = e.target.value;
        renderLogs();
      });

    document.getElementById("refreshLogsBtn").addEventListener("click", loadLogs);
    document.getElementById("clearLogsBtn").addEventListener("click", clearLogs);

    document.querySelectorAll(".close").forEach((closeBtn) => {
      closeBtn.addEventListener("click", () => {
        closeModal("userModal");
        closeModal("churchModal");
      });
    });

    window.addEventListener("click", (event) => {
      if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
      }
    });
  } else {
    // Lógica para página de login
    console.log("Página de login detectada");
    initLoginPage();
  }
});

function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        window.location.href = "/admin.html";
      } else {
        showMessage(data.error || "Erro no login", "error");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      showMessage("Erro ao fazer login", "error");
    }
  });
}

function showMessage(message, type = "success") {
  const messageDiv = document.getElementById("message");
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = type;
  }
}
