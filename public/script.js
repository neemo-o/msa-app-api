// Configuração da API
const API_BASE = '/api';

// Estado da aplicação
let currentUser = null;
let churches = [];

// Funções utilitárias
function showMessage(message, type = 'error') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = type;
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
    }, 5000);
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }

    // Verificar se é admin
    fetch(`${API_BASE}/auth/verify`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (!data.valid || data.user.role !== 'ADMINISTRADOR') {
            showMessage('Acesso negado. Apenas administradores podem acessar esta página.');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        } else {
            currentUser = data.user;
        }
    })
    .catch(error => {
        console.error('Erro na verificação:', error);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    return true;
}

// Funções de navegação por abas
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Remover classe active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Adicionar classe active ao clicado
            btn.classList.add('active');
            document.getElementById(`${tabName}Tab`).classList.add('active');

            // Carregar dados da aba
            loadTabData(tabName);
        });
    });
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'churches':
            loadChurches();
            break;
        case 'requests':
            loadRequests();
            break;
    }
}

// Funções de CRUD para Usuários
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (response.ok) {
            renderUsers(data.users);
        } else {
            showMessage('Erro ao carregar usuários');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao carregar usuários');
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    users.forEach(user => {
        const userEl = document.createElement('div');
        userEl.className = 'user-item';
        userEl.innerHTML = `
            <div class="user-info">
                <h3>${user.name}</h3>
                <p>Email: ${user.email}</p>
                <p>Função: ${user.role}</p>
                <p>Fase: ${user.phase || 'N/A'}</p>
            </div>
            <div class="user-actions">
                <button class="btn-edit" onclick="editUser('${user.id}')">Editar</button>
                <button class="btn-danger" onclick="deleteUser('${user.id}')">Excluir</button>
            </div>
        `;
        container.appendChild(userEl);
    });
}

async function loadChurchesForSelect() {
    try {
        const response = await fetch(`${API_BASE}/churchs`);
        const data = await response.json();

        if (response.ok) {
            churches = data.churches;
            const select = document.getElementById('userChurch');
            select.innerHTML = '<option value="">Selecione uma igreja</option>';
            churches.forEach(church => {
                select.innerHTML += `<option value="${church.id}">${church.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Erro ao carregar igrejas:', error);
    }
}

function showUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');

    if (user) {
        title.textContent = 'Editar Usuário';
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userPassword').value = '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('userChurch').value = user.churchId || '';
        document.getElementById('userPhase').value = user.phase || '';
    } else {
        title.textContent = 'Adicionar Usuário';
        form.reset();
        document.getElementById('userId').value = '';
    }

    loadChurchesForSelect();
    togglePhaseField();
    modal.style.display = 'block';
}

function togglePhaseField() {
    const role = document.getElementById('userRole').value;
    const phaseGroup = document.getElementById('phaseGroup');
    const phaseInput = document.getElementById('userPhase');

    if (role === 'APRENDIZ') {
        phaseGroup.style.display = 'block';
        phaseInput.required = true;
    } else {
        phaseGroup.style.display = 'none';
        phaseInput.required = false;
    }
}

async function saveUser(event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        churchId: document.getElementById('userChurch').value,
        phase: document.getElementById('userPhase').value || null
    };

    // Adicionar senha apenas se estiver preenchida
    const password = document.getElementById('userPassword').value;
    if (password) {
        userData.password = password;
    }

    // Validações
    if (userData.role !== 'ADMINISTRADOR' && !userData.churchId) {
        showMessage('Igreja é obrigatória para este tipo de usuário');
        return;
    }

    if (userData.role === 'APRENDIZ' && !userData.phase) {
        showMessage('Fase é obrigatória para aprendizes');
        return;
    }

    try {
        const url = userId ? `${API_BASE}/users/${userId}` : `${API_BASE}/users`;
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Usuário salvo com sucesso', 'success');
            document.getElementById('userModal').style.display = 'none';
            loadUsers();
        } else {
            showMessage(data.error || 'Erro ao salvar usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao salvar usuário');
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (response.ok) {
            showUserModal(data.user);
        } else {
            showMessage('Erro ao carregar usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao carregar usuário');
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showMessage('Usuário excluído com sucesso', 'success');
            loadUsers();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Erro ao excluir usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao excluir usuário');
    }
}

// Funções de CRUD para Igrejas
async function loadChurches() {
    try {
        const response = await fetch(`${API_BASE}/churchs`);
        const data = await response.json();

        if (response.ok) {
            renderChurches(data.churches);
        } else {
            showMessage('Erro ao carregar igrejas');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao carregar igrejas');
    }
}

function renderChurches(churches) {
    const container = document.getElementById('churchesList');
    container.innerHTML = '';

    churches.forEach(church => {
        const churchEl = document.createElement('div');
        churchEl.className = 'church-item';
        churchEl.innerHTML = `
            <div class="church-info">
                <h3>${church.name}</h3>
                <p>${church.description || 'Sem descrição'}</p>
                <p>Endereço: ${church.address || 'N/A'}</p>
                <p>Telefone: ${church.phone || 'N/A'}</p>
                <p>Email: ${church.email || 'N/A'}</p>
            </div>
            <div class="church-actions">
                <button class="btn-edit" onclick="editChurch('${church.id}')">Editar</button>
                <button class="btn-danger" onclick="deleteChurch('${church.id}')">Excluir</button>
            </div>
        `;
        container.appendChild(churchEl);
    });
}

function showChurchModal(church = null) {
    const modal = document.getElementById('churchModal');
    const form = document.getElementById('churchForm');
    const title = document.getElementById('churchModalTitle');

    if (church) {
        title.textContent = 'Editar Igreja';
        document.getElementById('churchId').value = church.id;
        document.getElementById('churchName').value = church.name;
        document.getElementById('churchDescription').value = church.description || '';
        document.getElementById('churchAddress').value = church.address || '';
        document.getElementById('churchPhone').value = church.phone || '';
        document.getElementById('churchEmail').value = church.email || '';
    } else {
        title.textContent = 'Adicionar Igreja';
        form.reset();
        document.getElementById('churchId').value = '';
    }

    modal.style.display = 'block';
}

async function saveChurch(event) {
    event.preventDefault();

    const churchId = document.getElementById('churchId').value;
    const churchData = {
        name: document.getElementById('churchName').value,
        description: document.getElementById('churchDescription').value,
        address: document.getElementById('churchAddress').value,
        phone: document.getElementById('churchPhone').value,
        email: document.getElementById('churchEmail').value
    };

    try {
        const url = churchId ? `${API_BASE}/churchs/${churchId}` : `${API_BASE}/churchs`;
        const method = churchId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(churchData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Igreja salva com sucesso', 'success');
            document.getElementById('churchModal').style.display = 'none';
            loadChurches();
        } else {
            showMessage(data.error || 'Erro ao salvar igreja');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao salvar igreja');
    }
}

async function editChurch(churchId) {
    try {
        const response = await fetch(`${API_BASE}/churchs/${churchId}`);
        const data = await response.json();

        if (response.ok) {
            showChurchModal(data.church);
        } else {
            showMessage('Erro ao carregar igreja');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao carregar igreja');
    }
}

async function deleteChurch(churchId) {
    if (!confirm('Tem certeza que deseja excluir esta igreja?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/churchs/${churchId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showMessage('Igreja excluída com sucesso', 'success');
            loadChurches();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Erro ao excluir igreja');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao excluir igreja');
    }
}

// Funções para Solicitações
async function loadRequests() {
    try {
        const response = await fetch(`${API_BASE}/users/entry-requests`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (response.ok) {
            renderRequests(data.requests);
        } else {
            showMessage('Erro ao carregar solicitações');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao carregar solicitações');
    }
}

function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    container.innerHTML = '';

    requests.forEach(request => {
        const requestEl = document.createElement('div');
        requestEl.className = 'request-item';
        requestEl.innerHTML = `
            <div class="request-info">
                <h3>${request.user.name}</h3>
                <p>Email: ${request.user.email}</p>
                <p>Função solicitada: ${request.user.role}</p>
                <p>Status: ${request.status}</p>
            </div>
            <div class="request-actions">
                ${request.status === 'EM_ANALISE' ? `<button class="btn-edit" onclick="approveRequest('${request.id}')">Aprovar</button>` : ''}
            </div>
        `;
        container.appendChild(requestEl);
    });
}

async function approveRequest(requestId) {
    try {
        const response = await fetch(`${API_BASE}/users/entry-requests/${requestId}/approve`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showMessage('Solicitação aprovada com sucesso', 'success');
            loadRequests();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Erro ao aprovar solicitação');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao aprovar solicitação');
    }
}

// Funções de Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'admin.html';
        } else {
            showMessage(data.error || 'Erro no login');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro no login');
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Página de login
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    }

    // Página admin
    if (document.getElementById('adminPage')) {
        if (!checkAuth()) return;

        initTabs();
        loadTabData('users'); // Carregar aba inicial

        // Event listeners
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('addUserBtn').addEventListener('click', () => showUserModal());
        document.getElementById('addChurchBtn').addEventListener('click', () => showChurchModal());

        // Modais
        document.getElementById('userForm').addEventListener('submit', saveUser);
        document.getElementById('churchForm').addEventListener('submit', saveChurch);
        document.getElementById('userRole').addEventListener('change', togglePhaseField);

        // Fechar modais
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                document.getElementById('userModal').style.display = 'none';
                document.getElementById('churchModal').style.display = 'none';
            });
        });

        // Fechar modal clicando fora
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });
    }
});
