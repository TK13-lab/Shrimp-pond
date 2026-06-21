// @ts-check

const app = document.querySelector('#app');

const STORAGE_KEYS = {
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

const WEB_PORTAL_ROLES = ['ADMIN', 'MANAGER', 'STAFF'];
const RECEIPT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  materials: {
    error: '',
    items: [],
    loading: false,
    search: ''
  },
  reasonDialog: null,
  receiptForm: createInitialReceiptFormState(),
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
  void handleFormSubmit(
    form,
    event.submitter instanceof HTMLElement ? event.submitter : null
  );
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

    if (view && canAccessView(view)) {
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

  if (action === 'add-receipt-row') {
    addReceiptRow();
    return;
  }

  if (action === 'add-material-row') {
    const materialId = target.dataset.id;

    if (materialId) {
      addMaterialReceiptRow(materialId);
    }

    return;
  }

  if (action === 'remove-receipt-row') {
    const rowId = target.dataset.id;

    if (rowId) {
      removeReceiptRow(rowId);
    }

    return;
  }

  if (action === 'reset-receipt-form') {
    resetReceiptForm();
    render();
    return;
  }

  if (action === 'submit-draft-receipt') {
    const receiptId = target.dataset.id;

    if (receiptId && canCreateReceipts()) {
      await submitDraftReceipt(receiptId);
    }

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

    if (receiptId && canReviewReceipts()) {
      await approveReceipt(receiptId);
    }

    return;
  }

  if (action === 'open-reject') {
    const receiptId = target.dataset.id;

    if (receiptId && canReviewReceipts()) {
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

    if (receiptId && canReviewReceipts()) {
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

async function handleFormSubmit(form, submitter = null) {
  const formName = form.dataset.form;
  const formData = new FormData(form);

  if (formName === 'login') {
    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');

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

  if (formName === 'material-search') {
    state.materials.search = String(formData.get('search') ?? '');
    await loadMaterials(true);
    return;
  }

  if (formName === 'receipt-form') {
    await saveReceiptForm(formData, submitter?.dataset.intent === 'submit');
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
    state.activeView = getDefaultActiveView();
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

  ensureAccessibleActiveView();

  if (state.activeView === 'approvals') {
    await loadApprovals(force);
    return;
  }

  if (state.activeView === 'history') {
    await loadHistory(force);
    return;
  }

  if (state.activeView === 'create-receipt') {
    await loadMaterials(force);
    return;
  }

  if (state.activeView === 'materials') {
    await loadMaterials(force);
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

async function loadMaterials(force = false) {
  if (!force && state.materials.items.length > 0) {
    return;
  }

  state.materials.loading = true;
  state.materials.error = '';
  render();

  try {
    const query = new URLSearchParams();

    if (state.materials.search.trim()) {
      query.set('search', state.materials.search.trim());
    }

    if (!isAdmin()) {
      query.set('active', 'true');
    }

    const suffix = query.toString();
    const response = await requestJson(
      suffix ? `/materials?${suffix}` : '/materials',
      {
        auth: true
      }
    );
    state.materials.items = response.items ?? [];
  } catch (error) {
    state.materials.error = getErrorMessage(error);
  } finally {
    state.materials.loading = false;
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

async function saveReceiptForm(formData, shouldSubmit) {
  if (!canCreateReceipts()) {
    return;
  }

  state.receiptForm.error = '';
  state.receiptForm.message = '';
  syncReceiptFormFromFormData(formData);

  const validationMessage = validateReceiptForm();

  if (validationMessage) {
    state.receiptForm.error = validationMessage;
    render();
    return;
  }

  state.receiptForm.loading = shouldSubmit ? 'submit' : 'save';
  render();

  try {
    const payload = buildReceiptPayload();
    const currentSignature = createReceiptFormSignature();
    const draftReceipt =
      shouldSubmit &&
      state.receiptForm.savedDraft?.status === 'DRAFT' &&
      state.receiptForm.savedSignature === currentSignature
        ? state.receiptForm.savedDraft
        : await requestJson('/purchase-receipts', {
            auth: true,
            body: payload,
            headers: {
              'X-Idempotency-Key': payload.clientRequestId
            },
            method: 'POST'
          });

    if (shouldSubmit) {
      const submittedReceipt = await requestJson(
        `/purchase-receipts/${draftReceipt.id}/submit`,
        {
          auth: true,
          method: 'PATCH'
        }
      );
      state.receiptForm.message = `Đã gửi duyệt phiếu ${submittedReceipt.receiptCode}.`;
      state.receiptForm = {
        ...createInitialReceiptFormState(),
        message: state.receiptForm.message
      };
      await reloadReceiptLists();
      return;
    }

    state.receiptForm.savedDraft = draftReceipt;
    state.receiptForm.savedSignature = currentSignature;
    state.receiptForm.message = `Đã lưu nháp ${draftReceipt.receiptCode}.`;
    state.receiptForm.clientRequestId = createUuid();
    await reloadReceiptLists();
  } catch (error) {
    state.receiptForm.error = getErrorMessage(error);
  } finally {
    state.receiptForm.loading = '';
    render();
  }
}

async function submitDraftReceipt(receiptId) {
  state.actionLoading = `submit:${receiptId}`;
  render();

  try {
    const receipt = await requestJson(`/purchase-receipts/${receiptId}/submit`, {
      auth: true,
      method: 'PATCH'
    });
    state.detail.receipt = receipt;
    await reloadReceiptLists();
  } catch (error) {
    state.detail.error = getErrorMessage(error);
  } finally {
    state.actionLoading = '';
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

  ensureAccessibleActiveView();

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
          ${canReviewReceipts() ? renderNavButton('approvals', '✓', 'Chờ duyệt', state.approvals.items.length) : ''}
          ${canCreateReceipts() ? renderNavButton('create-receipt', '+', 'Tạo phiếu', '') : ''}
          ${renderNavButton('history', '↺', 'Lịch sử', state.history.items.length)}
          ${renderNavButton('materials', '▤', 'Vật tư', state.materials.items.length)}
          ${canViewInventory() ? renderNavButton('inventory', '▣', 'Tồn kho', state.inventory.items.length) : ''}
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
            <p>Web Portal</p>
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
          Vai trò tài khoản này chưa được hỗ trợ trên web.
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
  const countMarkup = count === ''
    ? '<span class="nav-count nav-count-empty" aria-hidden="true"></span>'
    : `<span class="nav-count">${count}</span>`;

  return `
    <button class="nav-button ${isActive ? 'is-active' : ''}" type="button" data-action="switch-view" data-view="${escapeHtml(view)}">
      <span class="nav-icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <span>${escapeHtml(label)}</span>
      ${countMarkup}
    </button>
  `;
}

function renderActiveView() {
  if (state.activeView === 'create-receipt' && canCreateReceipts()) {
    return renderCreateReceiptView();
  }

  if (state.activeView === 'history') {
    return renderHistoryView();
  }

  if (state.activeView === 'materials') {
    return renderMaterialsView();
  }

  if (state.activeView === 'inventory' && canViewInventory()) {
    return renderInventoryView();
  }

  if (state.activeView === 'users' && isAdmin()) {
    return renderUsersView();
  }

  return renderApprovalsView();
}

function renderCreateReceiptView() {
  const form = state.receiptForm;
  const totalAmount = computeReceiptFormTotal();
  const isBusy = form.loading !== '';

  return `
    <section class="view-header">
      <div>
        <p class="eyebrow">Phiếu nhập</p>
        <h2>Tạo phiếu</h2>
      </div>
      <button class="icon-button" title="Tải lại vật tư" type="button" data-action="refresh">↻</button>
    </section>

    ${renderLoadingOrError(state.materials.loading, state.materials.error)}

    <section class="form-panel receipt-form-panel">
      <form data-form="receipt-form">
        <div class="form-section">
          <h3>Thông tin chung</h3>
          <div class="form-grid">
            <label>
              Ngày nhập
              <input name="receiptDate" required type="date" value="${escapeHtml(form.receiptDate)}" />
            </label>
            <label>
              Nhà cung cấp
              <input name="supplierName" placeholder="Ví dụ: Đại lý vật tư A" value="${escapeHtml(form.supplierName)}" />
            </label>
          </div>
          <label>
            Ghi chú
            <textarea name="note" placeholder="Ghi chú thêm cho phiếu nhập" rows="3">${escapeHtml(form.note)}</textarea>
          </label>
        </div>

        <div class="form-section">
          <div class="section-heading-row">
            <h3>Thêm nhanh từ vật tư</h3>
            <button class="button button-small" ${isBusy ? 'disabled' : ''} type="button" data-action="add-receipt-row">
              Thêm dòng trống
            </button>
          </div>
          ${renderQuickMaterialPicker(isBusy)}
        </div>

        <div class="form-section">
          <h3>Danh sách hàng hóa</h3>
          <section class="receipt-item-list">
            ${form.items.map((item, index) => renderReceiptFormItem(item, index, isBusy)).join('')}
          </section>
        </div>

        <div class="receipt-total-row">
          <span>Tổng tiền</span>
          <strong>${escapeHtml(formatMoney(totalAmount))}</strong>
        </div>

        ${form.message ? `<div class="notice notice-success">${escapeHtml(form.message)}</div>` : ''}
        ${form.error ? `<div class="notice notice-error">${escapeHtml(form.error)}</div>` : ''}

        <div class="drawer-actions">
          <button class="button button-ghost" ${isBusy ? 'disabled' : ''} type="button" data-action="reset-receipt-form">
            Xóa form
          </button>
          <button class="button button-secondary" ${isBusy ? 'disabled' : ''} data-intent="save" type="submit">
            ${form.loading === 'save' ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
          <button class="button button-primary" ${isBusy ? 'disabled' : ''} data-intent="submit" type="submit">
            ${form.loading === 'submit' ? 'Đang gửi...' : 'Gửi duyệt'}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderQuickMaterialPicker(isBusy) {
  const activeMaterials = state.materials.items.filter((material) => material.isActive);

  if (!activeMaterials.length) {
    return '<div class="empty-state compact">Chưa có vật tư đang dùng. Có thể nhập thủ công từng dòng.</div>';
  }

  return `
    <div class="quick-material-list">
      ${activeMaterials
        .map(
          (material) => `
            <button class="quick-material-chip" ${isBusy ? 'disabled' : ''} type="button" data-action="add-material-row" data-id="${escapeHtml(material.id)}">
              <strong>${escapeHtml(material.name)}</strong>
              <span>${escapeHtml(material.defaultUnit)}</span>
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderReceiptFormItem(item, index, isBusy) {
  const lineTotal = computeLineTotal(item.quantity, item.unitPrice);

  return `
    <article class="receipt-item-card">
      <div class="section-heading-row">
        <h4>Dòng ${index + 1}</h4>
        <button class="button button-danger button-small" ${isBusy ? 'disabled' : ''} type="button" data-action="remove-receipt-row" data-id="${escapeHtml(item.id)}">
          Xóa
        </button>
      </div>
      <input name="itemId" type="hidden" value="${escapeHtml(item.id)}" />
      <input name="materialId:${escapeHtml(item.id)}" type="hidden" value="${escapeHtml(item.materialId ?? '')}" />
      <label>
        Tên hàng hóa
        <input name="materialName:${escapeHtml(item.id)}" required value="${escapeHtml(item.materialName)}" />
      </label>
      <div class="form-grid three-columns">
        <label>
          Số lượng
          <input min="0.001" name="quantity:${escapeHtml(item.id)}" required step="0.001" type="number" value="${escapeHtml(item.quantity)}" />
        </label>
        <label>
          Đơn vị
          <input name="unit:${escapeHtml(item.id)}" required value="${escapeHtml(item.unit)}" />
        </label>
        <label>
          Giá nhập
          <input min="0" name="unitPrice:${escapeHtml(item.id)}" required step="0.01" type="number" value="${escapeHtml(item.unitPrice)}" />
        </label>
      </div>
      <div class="line-total-row">
        <span>Thành tiền</span>
        <strong>${escapeHtml(formatMoney(lineTotal))}</strong>
      </div>
    </article>
  `;
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

function renderMaterialsView() {
  return `
    <section class="view-header">
      <div>
        <p class="eyebrow">Danh mục</p>
        <h2>Vật tư</h2>
      </div>
      <button class="icon-button" title="Tải lại" type="button" data-action="refresh">↻</button>
    </section>

    <form class="filter-bar" data-form="material-search">
      <label class="grow">
        Tìm vật tư
        <input name="search" value="${escapeHtml(state.materials.search)}" />
      </label>
      <button class="button button-secondary" type="submit">Tìm</button>
    </form>

    ${renderSummaryStrip([
      ['Số vật tư', String(state.materials.items.length)],
      ['Đang dùng', String(state.materials.items.filter((item) => item.isActive).length)]
    ])}

    ${renderLoadingOrError(state.materials.loading, state.materials.error)}
    ${renderMaterialsCollection()}
  `;
}

function renderMaterialsCollection() {
  if (!state.materials.items.length) {
    return '<div class="empty-state">Không có vật tư phù hợp.</div>';
  }

  return `
    <section class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Vật tư</th>
            <th>Đơn vị mặc định</th>
            <th>Ghi chú</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${state.materials.items
            .map(
              (item) => `
                <tr>
                  <td><strong>${escapeHtml(item.name)}</strong></td>
                  <td>${escapeHtml(item.defaultUnit)}</td>
                  <td>${escapeHtml(item.note?.trim() || '-')}</td>
                  <td>${item.isActive ? '<span class="status status-approved">Đang dùng</span>' : '<span class="status status-voided">Ngừng dùng</span>'}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <section class="mobile-list">
      ${state.materials.items
        .map(
          (item) => `
            <div class="mobile-row inventory-row">
              <span>
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(item.defaultUnit)} · ${escapeHtml(item.note?.trim() || 'Chưa có ghi chú')}</small>
              </span>
              <span>
                ${item.isActive ? '<span class="status status-approved">Đang dùng</span>' : '<span class="status status-voided">Ngừng dùng</span>'}
              </span>
            </div>
          `
        )
        .join('')}
    </section>
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
  if (receipt.status === 'DRAFT' && canCreateReceipts()) {
    const isSubmitting = state.actionLoading === `submit:${receipt.id}`;

    return `
      <div class="drawer-actions">
        <button class="button button-primary" ${state.actionLoading ? 'disabled' : ''} type="button" data-action="submit-draft-receipt" data-id="${escapeHtml(receipt.id)}">
          ${isSubmitting ? 'Đang gửi...' : 'Gửi duyệt'}
        </button>
      </div>
    `;
  }

  if (!canReviewReceipts()) {
    return '';
  }

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
    state.session && WEB_PORTAL_ROLES.includes(state.session.user.role)
  );
}

function canReviewReceipts() {
  const role = state.session?.user.role;
  return role === 'ADMIN' || role === 'MANAGER';
}

function canCreateReceipts() {
  return canUseWebPortal();
}

function canViewInventory() {
  return canReviewReceipts();
}

function isAdmin() {
  return state.session?.user.role === 'ADMIN';
}

function getDefaultActiveView() {
  return canReviewReceipts() ? 'approvals' : 'create-receipt';
}

function ensureAccessibleActiveView() {
  if (!canAccessView(state.activeView)) {
    state.activeView = getDefaultActiveView();
  }
}

function canAccessView(view) {
  if (view === 'approvals') {
    return canReviewReceipts();
  }

  if (view === 'create-receipt') {
    return canCreateReceipts();
  }

  if (view === 'history') {
    return canUseWebPortal();
  }

  if (view === 'materials') {
    return canUseWebPortal();
  }

  if (view === 'inventory') {
    return canViewInventory();
  }

  if (view === 'users') {
    return isAdmin();
  }

  return false;
}

function resetLoadedData() {
  state.approvals.items = [];
  state.history.items = [];
  state.inventory.items = [];
  state.materials.items = [];
  state.users.items = [];
  state.detail.receipt = null;
}

function createInitialReceiptFormState() {
  return {
    clientRequestId: createUuid(),
    error: '',
    items: [createEmptyReceiptItem()],
    loading: '',
    message: '',
    note: '',
    receiptDate: createTodayInputValue(),
    savedDraft: null,
    savedSignature: '',
    supplierName: ''
  };
}

function createEmptyReceiptItem() {
  return {
    id: createUuid(),
    materialId: '',
    materialName: '',
    quantity: '',
    unit: '',
    unitPrice: ''
  };
}

function addReceiptRow() {
  state.receiptForm.items.push(createEmptyReceiptItem());
  state.receiptForm.error = '';
  state.receiptForm.message = '';
  render();
}

function addMaterialReceiptRow(materialId) {
  const material = state.materials.items.find((item) => item.id === materialId);

  if (!material) {
    return;
  }

  state.receiptForm.items.push({
    id: createUuid(),
    materialId: material.id,
    materialName: material.name,
    quantity: '',
    unit: material.defaultUnit,
    unitPrice: ''
  });
  state.receiptForm.error = '';
  state.receiptForm.message = '';
  render();
}

function removeReceiptRow(rowId) {
  const nextItems = state.receiptForm.items.filter((item) => item.id !== rowId);
  state.receiptForm.items = nextItems.length > 0 ? nextItems : [createEmptyReceiptItem()];
  state.receiptForm.error = '';
  state.receiptForm.message = '';
  render();
}

function resetReceiptForm() {
  state.receiptForm = createInitialReceiptFormState();
}

function syncReceiptFormFromFormData(formData) {
  const itemIds = formData.getAll('itemId').map((value) => String(value));

  state.receiptForm.receiptDate = String(formData.get('receiptDate') ?? '');
  state.receiptForm.supplierName = String(formData.get('supplierName') ?? '');
  state.receiptForm.note = String(formData.get('note') ?? '');
  state.receiptForm.items = itemIds.map((id) => ({
    id,
    materialId: String(formData.get(`materialId:${id}`) ?? ''),
    materialName: String(formData.get(`materialName:${id}`) ?? ''),
    quantity: String(formData.get(`quantity:${id}`) ?? ''),
    unit: String(formData.get(`unit:${id}`) ?? ''),
    unitPrice: String(formData.get(`unitPrice:${id}`) ?? '')
  }));

  if (!state.receiptForm.items.length) {
    state.receiptForm.items = [createEmptyReceiptItem()];
  }
}

function validateReceiptForm() {
  if (!RECEIPT_DATE_PATTERN.test(state.receiptForm.receiptDate.trim())) {
    return 'Ngày nhập phải có định dạng hợp lệ.';
  }

  for (let index = 0; index < state.receiptForm.items.length; index += 1) {
    const item = state.receiptForm.items[index];
    const rowLabel = `Dòng ${index + 1}`;
    const quantity = parseInputNumber(item.quantity);
    const unitPrice = parseInputNumber(item.unitPrice);

    if (!item.materialName.trim()) {
      return `${rowLabel}: Tên hàng hóa là bắt buộc.`;
    }

    if (!item.unit.trim()) {
      return `${rowLabel}: Đơn vị tính là bắt buộc.`;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return `${rowLabel}: Số lượng phải lớn hơn 0.`;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return `${rowLabel}: Giá nhập phải từ 0 trở lên.`;
    }
  }

  return '';
}

function buildReceiptPayload() {
  return {
    clientRequestId: state.receiptForm.clientRequestId,
    receiptDate: state.receiptForm.receiptDate.trim(),
    supplierName: state.receiptForm.supplierName.trim(),
    note: state.receiptForm.note.trim(),
    items: state.receiptForm.items.map((item) => {
      const materialId = item.materialId.trim();

      return {
        ...(materialId ? { materialId } : {}),
        materialName: item.materialName.trim(),
        quantity: parseInputNumber(item.quantity),
        unit: item.unit.trim(),
        unitPrice: parseInputNumber(item.unitPrice)
      };
    })
  };
}

function createReceiptFormSignature() {
  return JSON.stringify({
    receiptDate: state.receiptForm.receiptDate.trim(),
    supplierName: state.receiptForm.supplierName.trim(),
    note: state.receiptForm.note.trim(),
    items: state.receiptForm.items.map((item) => ({
      materialId: item.materialId.trim(),
      materialName: item.materialName.trim(),
      quantity: parseInputNumber(item.quantity),
      unit: item.unit.trim(),
      unitPrice: parseInputNumber(item.unitPrice)
    }))
  });
}

function computeReceiptFormTotal() {
  return state.receiptForm.items.reduce(
    (sum, item) => sum + computeLineTotal(item.quantity, item.unitPrice),
    0
  );
}

function computeLineTotal(quantityValue, unitPriceValue) {
  const quantity = parseInputNumber(quantityValue);
  const unitPrice = parseInputNumber(unitPriceValue);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 0;
  }

  return quantity * unitPrice;
}

function parseInputNumber(value) {
  return Number(String(value).trim().replace(',', '.'));
}

function createTodayInputValue() {
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function reloadReceiptLists() {
  await Promise.all([
    loadApprovals(true),
    loadHistory(true)
  ]);
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

function createUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
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
