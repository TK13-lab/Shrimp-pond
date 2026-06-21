// @ts-check

const app = document.querySelector('#app');

const STORAGE_KEYS = {
  apiBaseUrl: 'shrimp_pond_web_api_base_url',
  session: 'shrimp_pond_web_session'
};

const DEVICE_ID_KEY = 'shrimp_pond_web_device_id';

const STATUS_META = {
  APPROVED: { label: 'Đã duyệt', tone: 'approved' },
  DRAFT: { label: 'Nháp', tone: 'draft' },
  REJECTED: { label: 'Từ chối', tone: 'rejected' },
  SUBMITTED: { label: 'Chờ duyệt', tone: 'submitted' },
  VOIDED: { label: 'Đã hủy', tone: 'voided' }
};

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên'
};

const state = {
  actionLoading: '',
  activeView: 'approvals',
  apiBaseUrl: getInitialApiBaseUrl(),
  approvals: {
    error: '',
    items: [],
    loading: false
  },
  detail: {
    error: '',
    loading: false,
    receipt: null
  },
  history: {
    error: '',
    filters: {
      from: '',
      status: '',
      to: ''
    },
    items: [],
    loading: false
  },
  inventory: {
    error: '',
    items: [],
    loading: false,
    search: ''
  },
  login: {
    error: '',
    loading: false
  },
  reasonDialog: null,
  session: readStoredSession(),
  users: {
    error: '',
    filters: {
      active: '',
      role: '',
      search: ''
    },
    items: [],
    loading: false,
    message: ''
  }
};

if (!app) {
  throw new Error('App root not found');
}

app.addEventListener('click', (event) => {
  const target = event.target instanceof Element
    ? event.target.closest('[data-action]')
    : null;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;

  if (!action) {
    return;
  }

  void handleAction(action, target);
});

app.addEventListener('submit', (event) => {
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();
  void handleFormSubmit(form);
});

render();

if (state.session && canUseWebPortal()) {
  void loadActiveView();
}

async function handleAction(action, target) {
  if (action === 'logout') {
    await signOut();
    return;
  }

  if (action === 'switch-view') {
    const view = target.dataset.view;

    if (view) {
      state.activeView = view;
      render();
      await loadActiveView();
    }

    return;
  }

  if (action === 'refresh') {
    await loadActiveView(true);
    return;
  }

  if (action === 'disable-user') {
    const userId = target.dataset.id;

    if (userId) {
      await disableUser(userId);
    }

    return;
  }

  if (action === 'reset-user-password') {
    const userId = target.dataset.id;

    if (userId) {
      await resetUserPassword(userId);
    }

    return;
  }

  if (action === 'open-receipt') {
    const receiptId = target.dataset.id;

    if (receiptId) {
      await openReceipt(receiptId);
    }

    return;
  }

  if (action === 'close-detail') {
    state.detail.receipt = null;
    state.detail.error = '';
    render();
    return;
  }

  if (action === 'approve-receipt') {
    const receiptId = target.dataset.id;

    if (receiptId) {
      await approveReceipt(receiptId);
    }

    return;
  }

  if (action === 'open-reject') {
    const receiptId = target.dataset.id;

    if (receiptId) {
      state.reasonDialog = {
        error: '',
        loading: false,
        receiptId,
        type: 'reject'
      };
      render();
    }

    return;
  }

  if (action === 'open-void') {
    const receiptId = target.dataset.id;

    if (receiptId) {
      state.reasonDialog = {
        error: '',
        loading: false,
        receiptId,
        type: 'void'
      };
      render();
    }

    return;
  }

  if (action === 'close-reason') {
    state.reasonDialog = null;
    render();
  }
}

async function handleFormSubmit(form) {
  const formName = form.dataset.form;
  const formData = new FormData(form);

  if (formName === 'login') {
    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');
    const apiBaseUrl = String(formData.get('apiBaseUrl') ?? '').trim();

    if (apiBaseUrl) {
      state.apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
      localStorage.setItem(STORAGE_KEYS.apiBaseUrl, state.apiBaseUrl);
    }

    await login(username, password);
    return;
  }

  if (formName === 'history-filters') {
    state.history.filters = {
      from: String(formData.get('from') ?? ''),
      status: String(formData.get('status') ?? ''),
      to: String(formData.get('to') ?? '')
    };
    await loadHistory(true);
    return;
  }

  if (formName === 'inventory-search') {
    state.inventory.search = String(formData.get('search') ?? '');
    await loadInventory(true);
    return;
  }

  if (formName === 'user-filters') {
    state.users.filters = {
      active: String(formData.get('active') ?? ''),
      role: String(formData.get('role') ?? ''),
      search: String(formData.get('search') ?? '')
    };
    await loadUsers(true);
    return;
  }

  if (formName === 'create-user') {
    await createUser(formData);
    return;
  }

  if (formName === 'reason') {
    const reason = String(formData.get('reason') ?? '').trim();

    if (!state.reasonDialog) {
      return;
    }

    if (reason.length < 3) {
      state.reasonDialog.error = 'Vui lòng nhập lý do rõ ràng hơn.';
      render();
      return;
    }

    if (state.reasonDialog.type === 'reject') {
      await rejectReceipt(state.reasonDialog.receiptId, reason);
    } else {
      await voidReceipt(state.reasonDialog.receiptId, reason);
    }
  }
}

async function login(username, password) {
  state.login.loading = true;
  state.login.error = '';
  render();

  try {
    const session = await requestJson('/auth/login', {
      body: {
        password,
        username: username.trim()
      },
      headers: {
        'X-Device-Id': getDeviceId()
      },
      method: 'POST'
    });

    state.session = session;
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    state.activeView = 'approvals';
    resetLoadedData();
    render();

    if (canUseWebPortal()) {
      await loadActiveView(true);
    }
  } catch (error) {
    state.login.error = getErrorMessage(error);
    render();
  } finally {
    state.login.loading = false;
    render();
  }
}

async function signOut(callApi = true) {
  const refreshToken = state.session?.refreshToken;

  if (callApi && refreshToken) {
    try {
      await requestJson('/auth/logout', {
        body: {
          refreshToken
        },
        method: 'POST'
      });
    } catch {
      // Local logout should still happen if the server is unavailable.
    }
  }

  state.session = null;
  state.detail.receipt = null;
  state.reasonDialog = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  render();
}

async function loadActiveView(force = false) {
  if (!canUseWebPortal()) {
    return;
  }

  if (state.activeView === 'approvals') {
    await loadApprovals(force);
    return;
  }

  if (state.activeView === 'history') {
    await loadHistory(force);
    return;
  }

  if (state.activeView === 'inventory') {
    await loadInventory(force);
    return;
  }

  if (state.activeView === 'users') {
    await loadUsers(force);
  }
}

async function loadApprovals(force = false) {
  if (!force && state.approvals.items.length > 0) {
    return;
  }

  state.approvals.loading = true;
  state.approvals.error = '';
  render();

  try {
    const response = await requestJson('/purchase-receipts?status=SUBMITTED', {
      auth: true
    });
    state.approvals.items = response.items ?? [];
  } catch (error) {
    state.approvals.error = getErrorMessage(error);
  } finally {
    state.approvals.loading = false;
    render();
  }
}

async function loadHistory(force = false) {
  if (!force && state.history.items.length > 0) {
    return;
  }

  state.history.loading = true;
  state.history.error = '';
  render();

  try {
    const query = new URLSearchParams();
    const { filters } = state.history;

    if (filters.status) {
      query.set('status', filters.status);
    }

    if (filters.from) {
      query.set('from', filters.from);
    }

    if (filters.to) {
      query.set('to', filters.to);
    }

    const suffix = query.toString();
    const response = await requestJson(
      suffix ? `/purchase-receipts?${suffix}` : '/purchase-receipts',
      {
        auth: true
      }
    );
    state.history.items = response.items ?? [];
  } catch (error) {
    state.history.error = getErrorMessage(error);
  } finally {
    state.history.loading = false;
    render();
  }
}

async function loadInventory(force = false) {
  if (!force && state.inventory.items.length > 0) {
    return;
  }

  state.inventory.loading = true;
  state.inventory.error = '';
  render();

  try {
    const query = new URLSearchParams();

    if (state.inventory.search.trim()) {
      query.set('search', state.inventory.search.trim());
    }

    const suffix = query.toString();
    const response = await requestJson(
      suffix ? `/inventory?${suffix}` : '/inventory',
      {
        auth: true
      }
    );
    state.inventory.items = response.items ?? [];
  } catch (error) {
    state.inventory.error = getErrorMessage(error);
  } finally {
    state.inventory.loading = false;
    render();
  }
}

async function loadUsers(force = false) {
  if (!isAdmin()) {
    return;
  }

  if (!force && state.users.items.length > 0) {
    return;
  }

  state.users.loading = true;
  state.users.error = '';
  render();

  try {
    const query = new URLSearchParams();
    const { filters } = state.users;

    if (filters.search.trim()) {
      query.set('search', filters.search.trim());
    }

    if (filters.role) {
      query.set('role', filters.role);
    }

    if (filters.active) {
      query.set('active', filters.active);
    }

    const suffix = query.toString();
    const response = await requestJson(suffix ? `/users?${suffix}` : '/users', {
      auth: true
    });
    state.users.items = response.items ?? [];
  } catch (error) {
    state.users.error = getErrorMessage(error);
  } finally {
    state.users.loading = false;
    render();
  }
}

async function openReceipt(receiptId) {
  state.detail.loading = true;
  state.detail.error = '';
  state.detail.receipt = null;
  render();

  try {
    state.detail.receipt = await requestJson(`/purchase-receipts/${receiptId}`, {
      auth: true
    });
  } catch (error) {
    state.detail.error = getErrorMessage(error);
  } finally {
    state.detail.loading = false;
    render();
  }
}

async function approveReceipt(receiptId) {
  if (!window.confirm('Duyệt phiếu nhập này?')) {
    return;
  }

  state.actionLoading = `approve:${receiptId}`;
  render();

  try {
    await requestJson(`/purchase-receipts/${receiptId}/approve`, {
      auth: true,
      method: 'PATCH'
    });
    await reloadAfterReceiptMutation(receiptId);
  } catch (error) {
    state.detail.error = getErrorMessage(error);
  } finally {
    state.actionLoading = '';
    render();
  }
}

async function rejectReceipt(receiptId, reason) {
  if (!state.reasonDialog) {
    return;
  }

  state.reasonDialog.loading = true;
  state.reasonDialog.error = '';
  render();

  try {
    await requestJson(`/purchase-receipts/${receiptId}/reject`, {
      auth: true,
      body: {
        reason
      },
      method: 'PATCH'
    });
    state.reasonDialog = null;
    await reloadAfterReceiptMutation(receiptId);
  } catch (error) {
    if (state.reasonDialog) {
      state.reasonDialog.error = getErrorMessage(error);
    }
  } finally {
    if (state.reasonDialog) {
      state.reasonDialog.loading = false;
    }
    render();
  }
}

async function voidReceipt(receiptId, reason) {
  if (!state.reasonDialog) {
    return;
  }

  state.reasonDialog.loading = true;
  state.reasonDialog.error = '';
  render();

  try {
    await requestJson(`/purchase-receipts/${receiptId}/void`, {
      auth: true,
      body: {
        reason
      },
      method: 'PATCH'
    });
    state.reasonDialog = null;
    await reloadAfterReceiptMutation(receiptId);
  } catch (error) {
    if (state.reasonDialog) {
      state.reasonDialog.error = getErrorMessage(error);
    }
  } finally {
    if (state.reasonDialog) {
      state.reasonDialog.loading = false;
    }
    render();
  }
}

async function createUser(formData) {
  if (!isAdmin()) {
    return;
  }

  const password = String(formData.get('password') ?? '');

  if (password.length < 8) {
    state.users.error = 'Mật khẩu phải có ít nhất 8 ký tự.';
    render();
    return;
  }

  state.users.loading = true;
  state.users.error = '';
  state.users.message = '';
  render();

  try {
    await requestJson('/users', {
      auth: true,
      body: {
        fullName: String(formData.get('fullName') ?? ''),
        username: String(formData.get('username') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        role: String(formData.get('role') ?? 'STAFF'),
        password
      },
      method: 'POST'
    });
    state.users.message = 'Đã tạo tài khoản. Có thể dùng tài khoản này để đăng nhập ngay.';
    await loadUsers(true);
  } catch (error) {
    state.users.error = getErrorMessage(error);
  } finally {
    state.users.loading = false;
    render();
  }
}

async function disableUser(userId) {
  if (!isAdmin()) {
    return;
  }

  if (!window.confirm('Khóa tài khoản này? Người dùng sẽ không đăng nhập được nữa.')) {
    return;
  }

  state.users.loading = true;
  state.users.error = '';
  state.users.message = '';
  render();

  try {
    await requestJson(`/users/${userId}/disable`, {
      auth: true,
      method: 'PATCH'
    });
    state.users.message = 'Đã khóa tài khoản.';
    await loadUsers(true);
  } catch (error) {
    state.users.error = getErrorMessage(error);
  } finally {
    state.users.loading = false;
    render();
  }
}

async function resetUserPassword(userId) {
  if (!isAdmin()) {
    return;
  }

  const password = window.prompt('Nhập mật khẩu mới, tối thiểu 8 ký tự');

  if (password === null) {
    return;
  }

  if (password.length < 8) {
    state.users.error = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    render();
    return;
  }

  state.users.loading = true;
  state.users.error = '';
  state.users.message = '';
  render();

  try {
    await requestJson(`/users/${userId}/password`, {
      auth: true,
      body: {
        password
      },
      method: 'PATCH'
    });
    state.users.message = 'Đã đặt lại mật khẩu. Người dùng cần đăng nhập lại.';
    await loadUsers(true);
  } catch (error) {
    state.users.error = getErrorMessage(error);
  } finally {
    state.users.loading = false;
    render();
  }
}

async function reloadAfterReceiptMutation(receiptId) {
  await Promise.all([
    loadApprovals(true),
    loadHistory(true),
    loadInventory(true),
    openReceipt(receiptId)
  ]);
}

async function requestJson(path, options = {}, allowRefresh = true) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers ?? {})
  };

  if (options.auth && state.session?.accessToken) {
    headers.Authorization = `Bearer ${state.session.accessToken}`;
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  let response;

  try {
    response = await fetch(`${state.apiBaseUrl}${normalizePath(path)}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers,
      method: options.method ?? 'GET'
    });
  } catch {
    throw new Error('Không thể kết nối tới máy chủ API.');
  }

  if (response.status === 401 && options.auth && allowRefresh) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return requestJson(path, options, false);
    }

    await signOut(false);
  }

  const rawText = await response.text();
  const payload = rawText ? safeParseJson(rawText) : null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) ?? `Yêu cầu thất bại (${response.status}).`);
  }

  return payload;
}

async function refreshSession() {
  if (!state.session?.refreshToken) {
    return false;
  }

  try {
    const session = await requestJson(
      '/auth/refresh',
      {
        body: {
          refreshToken: state.session.refreshToken
        },
        method: 'POST'
      },
      false
    );
    state.session = session;
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

function render() {
  if (!state.session) {
    app.innerHTML = renderLogin();
    return;
  }

  if (!canUseWebPortal()) {
    app.innerHTML = renderUnsupportedRole();
    return;
  }

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark" aria-hidden="true">SP</div>
          <div>
            <div class="brand-name">Shrimp Pond</div>
            <div class="brand-subtitle">Quản lý nhập kho</div>
          </div>
        </div>

        <nav class="nav-list" aria-label="Điều hướng">
          ${renderNavButton('approvals', '✓', 'Chờ duyệt', state.approvals.items.length)}
          ${renderNavButton('history', '↺', 'Lịch sử', state.history.items.length)}
          ${renderNavButton('inventory', '▣', 'Tồn kho', state.inventory.items.length)}
          ${isAdmin() ? renderNavButton('users', '+', 'Người dùng', state.users.items.length) : ''}
        </nav>

        <div class="account-box">
          <div class="account-name">${escapeHtml(state.session.user.fullName)}</div>
          <div class="account-meta">${escapeHtml(ROLE_LABELS[state.session.user.role])} · @${escapeHtml(state.session.user.username)}</div>
          <button class="button button-ghost full-width" type="button" data-action="logout">
            Đăng xuất
          </button>
        </div>
      </aside>

      <main class="content">
        ${renderActiveView()}
      </main>
    </div>
    ${renderReceiptDetail()}
    ${renderReasonDialog()}
  `;
}

function renderLogin() {
  return `
    <main class="login-screen">
      <section class="login-panel">
        <div class="brand-row login-brand">
          <div class="brand-mark" aria-hidden="true">SP</div>
          <div>
            <h1>Shrimp Pond</h1>
            <p>Manager / Admin Web</p>
          </div>
        </div>

        <form class="login-form" data-form="login">
          <label>
            Tên đăng nhập
            <input autocomplete="username" name="username" required />
          </label>

          <label>
            Mật khẩu
            <input autocomplete="current-password" name="password" required type="password" />
          </label>

          <label>
            API URL
            <input name="apiBaseUrl" required value="${escapeHtml(state.apiBaseUrl)}" />
          </label>

          ${state.login.error ? `<div class="notice notice-error">${escapeHtml(state.login.error)}</div>` : ''}

          <button class="button button-primary full-width" ${state.login.loading ? 'disabled' : ''} type="submit">
            ${state.login.loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  `;
}

function renderUnsupportedRole() {
  return `
    <main class="login-screen">
      <section class="login-panel">
        <div class="brand-row login-brand">
          <div class="brand-mark" aria-hidden="true">SP</div>
          <div>
            <h1>Shrimp Pond</h1>
            <p>${escapeHtml(ROLE_LABELS[state.session.user.role])}</p>
          </div>
        </div>

        <div class="notice notice-warning">
          Tài khoản STAFF dùng app Android để nhập phiếu. Web này chỉ dành cho MANAGER và ADMIN.
        </div>

        <button class="button button-primary full-width" type="button" data-action="logout">
          Đăng xuất
        </button>
      </section>
    </main>
  `;
}

function renderNavButton(view, icon, label, count) {
  const isActive = state.activeView === view;

  return `
    <button class="nav-button ${isActive ? 'is-active' : ''}" type="button" data-action="switch-view" data-view="${escapeHtml(view)}">
      <span class="nav-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <span>${escapeHtml(label)}</span>
      <span class="nav-count">${count}</span>
    </button>
  `;
}

function renderActiveView() {
  if (state.activeView === 'history') {
    return renderHistoryView();
  }

  if (state.activeView === 'inventory') {
    return renderInventoryView();
  }

  if (state.activeView === 'users' && isAdmin()) {
    return renderUsersView();
  }

  return renderApprovalsView();
}

function renderApprovalsView() {
  return `
    <section class="view-header">
      <div>
        <p class="eyebrow">Phiếu nhập</p>
        <h2>Chờ duyệt</h2>
      </div>
      <button class="icon-button" title="Tải lại" type="button" data-action="refresh">↻</button>
    </section>

    ${renderSummaryStrip([
      ['Đang chờ', String(state.approvals.items.length)],
      ['Tổng giá trị', formatMoney(sumReceiptAmount(state.approvals.items))]
    ])}

    ${renderLoadingOrError(state.approvals.loading, state.approvals.error)}
    ${renderReceiptCollection(state.approvals.items, 'Không có phiếu đang chờ duyệt.')}
  `;
}

function renderHistoryView() {
  const { filters } = state.history;

  return `
    <section class="view-header">
      <div>
        <p class="eyebrow">Phiếu nhập</p>
        <h2>Lịch sử</h2>
      </div>
      <button class="icon-button" title="Tải lại" type="button" data-action="refresh">↻</button>
    </section>

    <form class="filter-bar" data-form="history-filters">
      <label>
        Trạng thái
        <select name="status">
          <option value="" ${filters.status === '' ? 'selected' : ''}>Tất cả</option>
          ${Object.entries(STATUS_META)
            .map(([status, meta]) => `<option value="${status}" ${filters.status === status ? 'selected' : ''}>${escapeHtml(meta.label)}</option>`)
            .join('')}
        </select>
      </label>
      <label>
        Từ ngày
        <input name="from" type="date" value="${escapeHtml(filters.from)}" />
      </label>
      <label>
        Đến ngày
        <input name="to" type="date" value="${escapeHtml(filters.to)}" />
      </label>
      <button class="button button-secondary" type="submit">Lọc</button>
    </form>

    ${renderSummaryStrip([
      ['Số phiếu', String(state.history.items.length)],
      ['Tổng giá trị', formatMoney(sumReceiptAmount(state.history.items))]
    ])}

    ${renderLoadingOrError(state.history.loading, state.history.error)}
    ${renderReceiptCollection(state.history.items, 'Chưa có phiếu phù hợp bộ lọc.')}
  `;
}

function renderInventoryView() {
  const totalValue = state.inventory.items.reduce(
    (sum, item) => sum + Number(item.totalValue ?? 0),
    0
  );

  return `
    <section class="view-header">
      <div>
        <p class="eyebrow">Kho vật tư</p>
        <h2>Tồn kho</h2>
      </div>
      <button class="icon-button" title="Tải lại" type="button" data-action="refresh">↻</button>
    </section>

    <form class="filter-bar" data-form="inventory-search">
      <label class="grow">
        Tìm vật tư
        <input name="search" value="${escapeHtml(state.inventory.search)}" />
      </label>
      <button class="button button-secondary" type="submit">Tìm</button>
    </form>

    ${renderSummaryStrip([
      ['Số vật tư còn tồn', String(state.inventory.items.length)],
      ['Giá trị kho', formatMoney(totalValue)]
    ])}

    ${renderLoadingOrError(state.inventory.loading, state.inventory.error)}
    ${renderInventoryCollection()}
  `;
}

function renderUsersView() {
  const { filters } = state.users;

  return `
    <section class="view-header">
      <div>
        <p class="eyebrow">Quản trị</p>
        <h2>Người dùng</h2>
      </div>
      <button class="icon-button" title="Tải lại" type="button" data-action="refresh">↻</button>
    </section>

    <section class="user-admin-grid">
      <form class="form-panel" data-form="create-user">
        <h3>Tạo tài khoản</h3>
        <label>
          Họ tên
          <input name="fullName" required />
        </label>
        <label>
          Tên đăng nhập
          <input autocomplete="off" name="username" required />
        </label>
        <label>
          Số điện thoại
          <input name="phone" />
        </label>
        <label>
          Vai trò
          <select name="role" required>
            <option value="STAFF">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>
        </label>
        <label>
          Mật khẩu ban đầu
          <input autocomplete="new-password" minlength="8" name="password" required type="password" />
        </label>
        <button class="button button-primary" ${state.users.loading ? 'disabled' : ''} type="submit">
          Tạo tài khoản
        </button>
      </form>

      <section>
        <form class="filter-bar" data-form="user-filters">
          <label class="grow">
            Tìm
            <input name="search" value="${escapeHtml(filters.search)}" />
          </label>
          <label>
            Vai trò
            <select name="role">
              <option value="" ${filters.role === '' ? 'selected' : ''}>Tất cả</option>
              <option value="ADMIN" ${filters.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
              <option value="MANAGER" ${filters.role === 'MANAGER' ? 'selected' : ''}>Manager</option>
              <option value="STAFF" ${filters.role === 'STAFF' ? 'selected' : ''}>Staff</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select name="active">
              <option value="" ${filters.active === '' ? 'selected' : ''}>Tất cả</option>
              <option value="true" ${filters.active === 'true' ? 'selected' : ''}>Đang dùng</option>
              <option value="false" ${filters.active === 'false' ? 'selected' : ''}>Đã khóa</option>
            </select>
          </label>
          <button class="button button-secondary" type="submit">Lọc</button>
        </form>

        ${state.users.message ? `<div class="notice notice-success">${escapeHtml(state.users.message)}</div>` : ''}
        ${renderLoadingOrError(state.users.loading, state.users.error)}
        ${renderUsersCollection()}
      </section>
    </section>
  `;
}

function renderSummaryStrip(items) {
  return `
    <section class="summary-strip">
      ${items
        .map(
          ([label, value]) => `
            <div class="summary-item">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join('')}
    </section>
  `;
}

function renderLoadingOrError(isLoading, error) {
  if (isLoading) {
    return '<div class="notice">Đang tải dữ liệu...</div>';
  }

  if (error) {
    return `<div class="notice notice-error">${escapeHtml(error)}</div>`;
  }

  return '';
}

function renderReceiptCollection(items, emptyText) {
  if (!items.length) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return `
    <section class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Mã phiếu</th>
            <th>Ngày</th>
            <th>Người tạo</th>
            <th>Nhà cung cấp</th>
            <th>Trạng thái</th>
            <th class="align-right">Giá trị</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${items.map(renderReceiptRow).join('')}
        </tbody>
      </table>
    </section>

    <section class="mobile-list">
      ${items.map(renderReceiptListItem).join('')}
    </section>
  `;
}

function renderReceiptRow(receipt) {
  return `
    <tr>
      <td><strong>${escapeHtml(receipt.receiptCode)}</strong></td>
      <td>${escapeHtml(formatDate(receipt.receiptDate))}</td>
      <td>${escapeHtml(receipt.createdBy?.fullName ?? '-')}</td>
      <td>${escapeHtml(receipt.supplierName ?? '-')}</td>
      <td>${renderStatusBadge(receipt.status)}</td>
      <td class="align-right">${escapeHtml(formatMoney(Number(receipt.totalAmount)))}</td>
      <td class="align-right">
        <button class="button button-small" type="button" data-action="open-receipt" data-id="${escapeHtml(receipt.id)}">
          Mở
        </button>
      </td>
    </tr>
  `;
}

function renderReceiptListItem(receipt) {
  return `
    <button class="mobile-row" type="button" data-action="open-receipt" data-id="${escapeHtml(receipt.id)}">
      <span>
        <strong>${escapeHtml(receipt.receiptCode)}</strong>
        <small>${escapeHtml(formatDate(receipt.receiptDate))} · ${escapeHtml(receipt.createdBy?.fullName ?? '-')}</small>
      </span>
      <span>
        ${renderStatusBadge(receipt.status)}
        <strong>${escapeHtml(formatMoney(Number(receipt.totalAmount)))}</strong>
      </span>
    </button>
  `;
}

function renderInventoryCollection() {
  if (!state.inventory.items.length) {
    return '<div class="empty-state">Không có tồn kho phù hợp.</div>';
  }

  return `
    <section class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Vật tư</th>
            <th>Đơn vị</th>
            <th class="align-right">Số lượng</th>
            <th class="align-right">Giá bình quân</th>
            <th class="align-right">Giá trị</th>
          </tr>
        </thead>
        <tbody>
          ${state.inventory.items
            .map(
              (item) => `
                <tr>
                  <td><strong>${escapeHtml(item.materialName)}</strong></td>
                  <td>${escapeHtml(item.unit)}</td>
                  <td class="align-right">${escapeHtml(formatDecimal(Number(item.currentQuantity)))}</td>
                  <td class="align-right">${escapeHtml(formatMoney(Number(item.averagePrice)))}</td>
                  <td class="align-right">${escapeHtml(formatMoney(Number(item.totalValue)))}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <section class="mobile-list">
      ${state.inventory.items
        .map(
          (item) => `
            <div class="mobile-row inventory-row">
              <span>
                <strong>${escapeHtml(item.materialName)}</strong>
                <small>${escapeHtml(item.unit)}</small>
              </span>
              <span>
                <strong>${escapeHtml(formatDecimal(Number(item.currentQuantity)))}</strong>
                <small>${escapeHtml(formatMoney(Number(item.totalValue)))}</small>
              </span>
            </div>
          `
        )
        .join('')}
    </section>
  `;
}

function renderUsersCollection() {
  if (!state.users.items.length) {
    return '<div class="empty-state">Chưa có tài khoản phù hợp.</div>';
  }

  return `
    <section class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Tài khoản</th>
            <th>Họ tên</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${state.users.items.map(renderUserRow).join('')}
        </tbody>
      </table>
    </section>

    <section class="mobile-list">
      ${state.users.items.map(renderUserListItem).join('')}
    </section>
  `;
}

function renderUserRow(user) {
  return `
    <tr>
      <td><strong>@${escapeHtml(user.username)}</strong></td>
      <td>${escapeHtml(user.fullName)}${user.phone ? `<br /><small>${escapeHtml(user.phone)}</small>` : ''}</td>
      <td>${escapeHtml(ROLE_LABELS[user.role] ?? user.role)}</td>
      <td>${user.isActive ? '<span class="status status-approved">Đang dùng</span>' : '<span class="status status-voided">Đã khóa</span>'}</td>
      <td class="align-right user-actions">
        <button class="button button-small" type="button" data-action="reset-user-password" data-id="${escapeHtml(user.id)}">
          Đặt mật khẩu
        </button>
        <button class="button button-danger button-small" ${user.isActive ? '' : 'disabled'} type="button" data-action="disable-user" data-id="${escapeHtml(user.id)}">
          Khóa
        </button>
      </td>
    </tr>
  `;
}

function renderUserListItem(user) {
  return `
    <div class="mobile-row inventory-row">
      <span>
        <strong>@${escapeHtml(user.username)}</strong>
        <small>${escapeHtml(user.fullName)} · ${escapeHtml(ROLE_LABELS[user.role] ?? user.role)}</small>
      </span>
      <span>
        ${user.isActive ? '<span class="status status-approved">Đang dùng</span>' : '<span class="status status-voided">Đã khóa</span>'}
        <button class="button button-small" type="button" data-action="reset-user-password" data-id="${escapeHtml(user.id)}">
          Mật khẩu
        </button>
      </span>
    </div>
  `;
}

function renderReceiptDetail() {
  if (state.detail.loading) {
    return `
      <div class="drawer-backdrop">
        <aside class="detail-drawer">
          <button class="icon-button drawer-close" title="Đóng" type="button" data-action="close-detail">×</button>
          <div class="notice">Đang tải chi tiết phiếu...</div>
        </aside>
      </div>
    `;
  }

  if (state.detail.error && !state.detail.receipt) {
    return `
      <div class="drawer-backdrop">
        <aside class="detail-drawer">
          <button class="icon-button drawer-close" title="Đóng" type="button" data-action="close-detail">×</button>
          <div class="notice notice-error">${escapeHtml(state.detail.error)}</div>
        </aside>
      </div>
    `;
  }

  const receipt = state.detail.receipt;

  if (!receipt) {
    return '';
  }

  return `
    <div class="drawer-backdrop">
      <aside class="detail-drawer">
        <button class="icon-button drawer-close" title="Đóng" type="button" data-action="close-detail">×</button>

        <div class="detail-header">
          <p class="eyebrow">Chi tiết phiếu</p>
          <h2>${escapeHtml(receipt.receiptCode)}</h2>
          ${renderStatusBadge(receipt.status)}
        </div>

        ${state.detail.error ? `<div class="notice notice-error">${escapeHtml(state.detail.error)}</div>` : ''}

        <dl class="detail-grid">
          <div>
            <dt>Ngày phiếu</dt>
            <dd>${escapeHtml(formatDate(receipt.receiptDate))}</dd>
          </div>
          <div>
            <dt>Người tạo</dt>
            <dd>${escapeHtml(receipt.createdBy?.fullName ?? '-')}</dd>
          </div>
          <div>
            <dt>Nhà cung cấp</dt>
            <dd>${escapeHtml(receipt.supplierName ?? '-')}</dd>
          </div>
          <div>
            <dt>Tổng tiền</dt>
            <dd>${escapeHtml(formatMoney(Number(receipt.totalAmount)))}</dd>
          </div>
        </dl>

        ${receipt.note ? `<p class="detail-note">${escapeHtml(receipt.note)}</p>` : ''}
        ${renderReceiptReasons(receipt)}

        <section class="line-items">
          <h3>Vật tư</h3>
          ${receipt.items
            .map(
              (item) => `
                <div class="line-item">
                  <div>
                    <strong>${escapeHtml(item.materialName)}</strong>
                    <span>${escapeHtml(formatDecimal(Number(item.quantity)))} ${escapeHtml(item.unit)} × ${escapeHtml(formatMoney(Number(item.unitPrice)))}</span>
                  </div>
                  <strong>${escapeHtml(formatMoney(Number(item.lineTotal)))}</strong>
                </div>
              `
            )
            .join('')}
        </section>

        ${renderReceiptActions(receipt)}
      </aside>
    </div>
  `;
}

function renderReceiptReasons(receipt) {
  const parts = [];

  if (receipt.rejectReason) {
    parts.push(`<div class="notice notice-warning">Lý do từ chối: ${escapeHtml(receipt.rejectReason)}</div>`);
  }

  if (receipt.voidReason) {
    parts.push(`<div class="notice notice-warning">Lý do hủy: ${escapeHtml(receipt.voidReason)}</div>`);
  }

  return parts.join('');
}

function renderReceiptActions(receipt) {
  const isBusy = state.actionLoading !== '';

  if (receipt.status === 'SUBMITTED') {
    return `
      <div class="drawer-actions">
        <button class="button button-primary" ${isBusy ? 'disabled' : ''} type="button" data-action="approve-receipt" data-id="${escapeHtml(receipt.id)}">
          ${state.actionLoading === `approve:${receipt.id}` ? 'Đang duyệt...' : 'Duyệt phiếu'}
        </button>
        <button class="button button-danger" ${isBusy ? 'disabled' : ''} type="button" data-action="open-reject" data-id="${escapeHtml(receipt.id)}">
          Từ chối
        </button>
      </div>
    `;
  }

  if (receipt.status === 'APPROVED') {
    return `
      <div class="drawer-actions">
        <button class="button button-danger" ${isBusy ? 'disabled' : ''} type="button" data-action="open-void" data-id="${escapeHtml(receipt.id)}">
          Hủy phiếu đã duyệt
        </button>
      </div>
    `;
  }

  return '';
}

function renderReasonDialog() {
  if (!state.reasonDialog) {
    return '';
  }

  const isReject = state.reasonDialog.type === 'reject';

  return `
    <div class="modal-backdrop">
      <section class="reason-modal">
        <div class="view-header compact">
          <div>
            <p class="eyebrow">${isReject ? 'Từ chối phiếu' : 'Hủy phiếu'}</p>
            <h2>${isReject ? 'Nhập lý do từ chối' : 'Nhập lý do hủy'}</h2>
          </div>
          <button class="icon-button" title="Đóng" type="button" data-action="close-reason">×</button>
        </div>

        <form data-form="reason">
          <label>
            Lý do
            <textarea autofocus name="reason" required rows="4"></textarea>
          </label>

          ${state.reasonDialog.error ? `<div class="notice notice-error">${escapeHtml(state.reasonDialog.error)}</div>` : ''}

          <div class="drawer-actions">
            <button class="button button-danger" ${state.reasonDialog.loading ? 'disabled' : ''} type="submit">
              ${state.reasonDialog.loading ? 'Đang lưu...' : isReject ? 'Từ chối' : 'Hủy phiếu'}
            </button>
            <button class="button button-ghost" ${state.reasonDialog.loading ? 'disabled' : ''} type="button" data-action="close-reason">
              Đóng
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderStatusBadge(status) {
  const meta = STATUS_META[status] ?? {
    label: status,
    tone: 'draft'
  };

  return `<span class="status status-${escapeHtml(meta.tone)}">${escapeHtml(meta.label)}</span>`;
}

function canUseWebPortal() {
  return Boolean(
    state.session &&
      (state.session.user.role === 'ADMIN' || state.session.user.role === 'MANAGER')
  );
}

function isAdmin() {
  return state.session?.user.role === 'ADMIN';
}

function resetLoadedData() {
  state.approvals.items = [];
  state.history.items = [];
  state.inventory.items = [];
  state.users.items = [];
  state.detail.receipt = null;
}

function readStoredSession() {
  const rawValue = localStorage.getItem(STORAGE_KEYS.session);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    localStorage.removeItem(STORAGE_KEYS.session);
    return null;
  }
}

function getInitialApiBaseUrl() {
  const configuredValue = typeof window.SHRIMP_POND_API_BASE_URL === 'string'
    ? window.SHRIMP_POND_API_BASE_URL.trim()
    : '';

  if (configuredValue) {
    return normalizeApiBaseUrl(configuredValue);
  }

  const storedValue = localStorage.getItem(STORAGE_KEYS.apiBaseUrl);

  if (storedValue) {
    return normalizeApiBaseUrl(storedValue);
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    const isLocalHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocalHost) {
      return `${window.location.origin}/api`;
    }
  }

  return 'http://127.0.0.1:3000/api';
}

function normalizeApiBaseUrl(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

function getDeviceId() {
  const storedValue = localStorage.getItem(DEVICE_ID_KEY);

  if (storedValue) {
    return storedValue;
  }

  const nextValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `web-${crypto.randomUUID()}`
      : `web-${Date.now()}`;

  localStorage.setItem(DEVICE_ID_KEY, nextValue);
  return nextValue;
}

function safeParseJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function extractErrorMessage(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  if (
    payload.error &&
    typeof payload.error === 'object' &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }

  if (
    payload.error &&
    typeof payload.error === 'object' &&
    Array.isArray(payload.error.message)
  ) {
    return payload.error.message.join(', ');
  }

  return null;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
}

function sumReceiptAmount(items) {
  return items.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);
}

function formatMoney(value) {
  return Number.isFinite(value)
    ? value.toLocaleString('vi-VN', {
        maximumFractionDigits: 0
      })
    : '0';
}

function formatDecimal(value) {
  return Number.isFinite(value)
    ? value.toLocaleString('vi-VN', {
        maximumFractionDigits: 2
      })
    : '0';
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
