const API_BASE = "/api";

let currentUser = null;
let churches = [];
let logs = [];
let logFilters = { level: "", context: "" };
let currentUserStatusFilter = "active"; // "active" or "inactive"

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
      } else if (requestsRes.status === 403) {
        pendingCount = 0;
      } else {
        console.log("Erro ao carregar solicitações:", requestsRes.status);
      }
    } catch (error) {
      console.log("Erro de rede ao carregar solicitações:", error);
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
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

async function loadUsers(statusFilter = currentUserStatusFilter) {
  try {
    const params = new URLSearchParams();
    params.append('active', statusFilter === 'active' ? 'true' : 'false');

    const response = await fetch(`${API_BASE}/users?${params}`, {
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

  if (users.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
        Nenhum usuário encontrado nesta categoria
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

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
                    <div class="dropdown">
                        <button class="btn btn-secondary dropdown-toggle" onclick="toggleDropdown('${user.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div id="dropdown-${user.id}" class="dropdown-menu">
                            <button onclick="toggleUserStatus('${user.id}', ${user.isActive})">
                                <i class="fas fa-${user.isActive ? 'user-times' : 'user-check'}"></i>
                                ${user.isActive ? 'Desativar' : 'Ativar'} Usuário
                            </button>
                        </div>
                    </div>
                    <button class="btn btn-danger" onclick="deleteUser('${
                      user.id
                    }')">
                        <i class="fas fa-trash"></i> Excluir
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

function showUserModal() {
  const modal = document.getElementById("userModal");
  const form = document.getElementById("userForm");
  const title = document.getElementById("userModalTitle");

  title.textContent = "Adicionar Usuário";
  form.reset();
  document.getElementById("userId").value = "";

  loadChurchesForSelect();
  togglePhaseField();

  modal.style.display = "block";
}
function togglePhaseField() {
  const role = document.getElementById("userRole").value;
  const phaseGroup = document.getElementById("phaseGroup");
  const phaseInput = document.getElementById("userPhase");
  const churchGroup = document.getElementById("churchGroup");
  const churchSelect = document.getElementById("userChurch");

  if (role === "APRENDIZ") {
    phaseGroup.style.display = "block";
    phaseInput.required = true;
    churchGroup.style.display = "block";
    churchSelect.required = true;
  } else if (role === "INSTRUTOR" || role === "ENCARREGADO") {
    phaseGroup.style.display = "none";
    phaseInput.required = false;
    phaseInput.value = "";
    churchGroup.style.display = "block";
    churchSelect.required = true;
  } else if (role === "ADMINISTRADOR") {
    phaseGroup.style.display = "none";
    phaseInput.required = false;
    phaseInput.value = "";
    churchGroup.style.display = "none";
    churchSelect.required = false;
    churchSelect.value = "";
  }
}

async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;
  const role = document.getElementById("userRole").value;

  const nameValue = document.getElementById("name").value;
  const emailValue = document.getElementById("userEmail").value;
  const passwordValue = document.getElementById("userPassword").value;

  console.log("Valores capturados:", {
    name: nameValue,
    email: emailValue,
    password: passwordValue,
    role: role,
  });

  const userData = {
    name: nameValue,
    email: emailValue,
    role: role,
    churchId:
      role !== "ADMINISTRADOR"
        ? document.getElementById("userChurch").value || null
        : null,
    phase:
      role === "APRENDIZ"
        ? document.getElementById("userPhase").value || null
        : null,
  };

  if (passwordValue) {
    userData.password = passwordValue;
  }

  if (!userId && !passwordValue) {
    showToast("Senha é obrigatória para novos usuários", "error");
    return;
  }

  if (role !== "ADMINISTRADOR" && !userData.churchId) {
    showToast("Igreja é obrigatória para este tipo de usuário", "error");
    return;
  }

  if (role === "APRENDIZ" && !userData.phase) {
    showToast("Fase é obrigatória para aprendizes", "error");
    return;
  }

  console.log("Dados a serem enviados:", userData);

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
    console.log("Resposta do servidor:", data);

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

    if (!response.ok) {
      showToast("Erro ao carregar usuário", "error");
      return;
    }

    await loadChurchesForSelect();

    const modal = document.getElementById("userModal");
    const title = document.getElementById("userModalTitle");
    const passwordField = document.getElementById("userPassword");

    title.textContent = "Editar Usuário";

    document.getElementById("userId").value = data.user.id;
    document.getElementById("name").value = data.user.name;
    document.getElementById("userEmail").value = data.user.email;
    passwordField.value = "";
    passwordField.required = false; // Make password optional for edits
    document.getElementById("userRole").value = data.user.role;

    setTimeout(() => {
      document.getElementById("userChurch").value = data.user.churchId || "";
      document.getElementById("userPhase").value = data.user.phase || "";
      togglePhaseField();
    }, 100);

    modal.style.display = "block";
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

function switchUserStatusTab(status) {
  // Update current filter
  currentUserStatusFilter = status;

  // Update tab active states
  document.querySelectorAll('.status-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-status="${status}"]`).classList.add('active');

  // Load users for the selected status
  loadUsers(status);
}

function toggleDropdown(userId) {
  // Close all other dropdowns first
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    if (menu.id !== `dropdown-${userId}`) {
      menu.classList.remove('show');
    }
  });

  // Toggle the clicked dropdown
  const dropdown = document.getElementById(`dropdown-${userId}`);
  dropdown.classList.toggle('show');
}

async function toggleUserStatus(userId, currentStatus) {
  const action = currentStatus ? 'desativar' : 'ativar';
  if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${userId}/toggle-status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      showToast(data.message, "success");
      loadUsers();
    } else {
      const data = await response.json();
      showToast(data.error || "Erro ao alterar status do usuário", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showToast("Erro ao alterar status do usuário", "error");
  }

  // Close the dropdown
  document.getElementById(`dropdown-${userId}`).classList.remove('show');
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
                <p><i class="fas fa-church"></i> ${
                  request.church?.name || "Igreja não especificada"
                }</p>
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
  const isAdminPage = document.getElementById("adminPage") !== null;

  if (isAdminPage) {
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
    document
      .getElementById("churchForm")
      .addEventListener("submit", saveChurch);
    document
      .getElementById("userRole")
      .addEventListener("change", togglePhaseField);

    // User status tab event listeners
    document.querySelectorAll('.status-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const status = e.currentTarget.dataset.status;
        switchUserStatusTab(status);
      });
    });

    document
      .getElementById("logLevelFilter")
      .addEventListener("change", (e) => {
        logFilters.level = e.target.value;
        renderLogs();
      });

    document
      .getElementById("logContextFilter")
      .addEventListener("change", (e) => {
        logFilters.context = e.target.value;
        renderLogs();
      });

    document
      .getElementById("refreshLogsBtn")
      .addEventListener("click", loadLogs);
    document
      .getElementById("clearLogsBtn")
      .addEventListener("click", clearLogs);

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

      // Close dropdowns when clicking outside
      if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
          menu.classList.remove('show');
        });
      }
    });
  } else {
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
