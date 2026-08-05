/**
 * ApexHR - Employee Leave Management System
 * Client-Side Application Script integrated with ApexAPI REST backend.
 */

document.addEventListener('DOMContentLoaded', async () => {

  // --- LocalStorage Data Keys (Fallback) ---
  const STORAGE_KEYS = {
    SESSION: 'apex_auth_session',
    LEAVES: 'apex_leave_requests',
    EMPLOYEES: 'apex_employee_list'
  };

  // Check API Server connectivity & status indicator banner
  if (window.ApexAPI) {
    const health = await ApexAPI.checkHealth();
    if (ApexAPI.isServerOnline) {
      console.log('✅ Connected to ApexHR REST API Server:', health);
    } else {
      console.log('ℹ️ Running in Local Storage Fallback Mode');
    }
  }

  // --- Element References ---
  const views = {
    login: document.getElementById('login-view'),
    employee: document.getElementById('employee-view'),
    admin: document.getElementById('admin-view')
  };

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const fillEmployeeDemoBtn = document.getElementById('fill-employee-demo');
  const fillAdminDemoBtn = document.getElementById('fill-admin-demo');
  const toastContainer = document.getElementById('toast-container');

  // Employee View Elements
  const empNameDisplay = document.getElementById('emp-name');
  const empAvatarDisplay = document.getElementById('emp-avatar');
  const leaveApplyForm = document.getElementById('leave-apply-form');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const daysBanner = document.getElementById('days-calculation-banner');
  const daysCountDisplay = document.getElementById('calculated-days-count');
  const empHistoryTbody = document.getElementById('emp-history-tbody');
  const empVacationBalance = document.getElementById('emp-vacation-balance');
  const empPendingCount = document.getElementById('emp-pending-count');
  const empApprovedCount = document.getElementById('emp-approved-count');

  // Admin View Elements
  const sidebarNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const adminTabContents = document.querySelectorAll('.admin-tab-content');
  const adminActiveTabTitle = document.getElementById('admin-active-tab-title');
  const pendingBadgeCount = document.getElementById('pending-badge-count');
  const liveDateString = document.getElementById('live-date-string');
  const employeeSearchInput = document.getElementById('employee-search-input');
  const viewAllPendingBtn = document.getElementById('view-all-pending-btn');

  // Admin Stat Elements
  const statTotalEmployees = document.getElementById('stat-total-employees');
  const statPendingRequests = document.getElementById('stat-pending-requests');
  const statApprovedLeaves = document.getElementById('stat-approved-leaves');
  const statRejectedLeaves = document.getElementById('stat-rejected-leaves');
  const dashboardRecentTbody = document.getElementById('dashboard-recent-tbody');
  const adminEmployeesTbody = document.getElementById('admin-employees-tbody');
  const adminLeaveTbody = document.getElementById('admin-leave-tbody');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Format Live Date
  if (liveDateString) {
    const today = new Date();
    liveDateString.textContent = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // --- Toast Notification ---
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- Password Toggle ---
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.querySelector('.eye-show').classList.toggle('hidden', isPassword);
      togglePasswordBtn.querySelector('.eye-hide').classList.toggle('hidden', !isPassword);
    });
  }

  // --- Fast Demo Buttons ---
  if (fillEmployeeDemoBtn) {
    fillEmployeeDemoBtn.addEventListener('click', () => {
      emailInput.value = 'employee@company.com';
      passwordInput.value = 'password123';
      loginForm.dispatchEvent(new Event('submit'));
    });
  }

  if (fillAdminDemoBtn) {
    fillAdminDemoBtn.addEventListener('click', () => {
      emailInput.value = 'admin@company.com';
      passwordInput.value = 'admin123';
      loginForm.dispatchEvent(new Event('submit'));
    });
  }

  // --- Authentication Handler ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || password.length < 6) {
      showToast('Please enter valid credentials', 'error');
      return;
    }

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    document.getElementById('login-spinner').classList.remove('hidden');

    try {
      const authRes = await ApexAPI.login(email, password);
      
      submitBtn.disabled = false;
      document.getElementById('login-spinner').classList.add('hidden');

      if (authRes.success) {
        const user = authRes.user;
        const session = {
          email: user.email,
          role: user.role,
          name: user.name,
          id: user.empId || 'EMP-101'
        };
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

        showToast(`Welcome back, ${user.name}!`, 'success');
        switchView(user.role === 'admin' ? 'admin' : 'employee');
      } else {
        showToast(authRes.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      submitBtn.disabled = false;
      document.getElementById('login-spinner').classList.add('hidden');
      showToast('Login error. Please try again.', 'error');
    }
  });

  // --- View Switcher ---
  async function switchView(viewName) {
    Object.keys(views).forEach(k => {
      views[k].classList.remove('view-active');
      views[k].classList.add('view-hidden');
    });

    views[viewName].classList.remove('view-hidden');
    views[viewName].classList.add('view-active');

    if (viewName === 'employee') await renderEmployeePortal();
    if (viewName === 'admin') await renderAdminPortal();
  }

  // --- Logout Triggers ---
  document.querySelectorAll('.logout-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      showToast('Logged out successfully', 'info');
      switchView('login');
    });
  });

  // =========================================================================
  // EMPLOYEE PORTAL LOGIC
  // =========================================================================
  async function renderEmployeePortal() {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || {};
    empNameDisplay.textContent = session.name || 'Alex Johnson';
    empAvatarDisplay.textContent = (session.name || 'A').charAt(0).toUpperCase();

    const allLeaves = await ApexAPI.getLeaves();
    const leaves = allLeaves.filter(l => l.empEmail === session.email || l.empId === session.id);

    // Update summary counters
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    let approvedDays = leaves.filter(l => l.status === 'Approved').reduce((acc, cur) => acc + cur.days, 0);

    empPendingCount.textContent = pending;
    empApprovedCount.textContent = approved;
    empVacationBalance.textContent = `${Math.max(0, 18 - approvedDays)} Days`;

    // Render Employee Table
    empHistoryTbody.innerHTML = '';
    if (leaves.length === 0) {
      empHistoryTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--color-text-secondary);">No leave history found. Apply above!</td></tr>`;
      return;
    }

    [...leaves].reverse().forEach(l => {
      const tr = document.createElement('tr');
      const badgeClass = l.status === 'Approved' ? 'badge-approved' : l.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
      tr.innerHTML = `
        <td><strong>${l.type}</strong></td>
        <td>${l.startDate} &rarr; ${l.endDate}</td>
        <td><strong>${l.days} Day(s)</strong></td>
        <td>${l.reason}</td>
        <td><span class="badge ${badgeClass}"><span class="badge-dot"></span> ${l.status}</span></td>
      `;
      empHistoryTbody.appendChild(tr);
    });
  }

  // Date Error Spans
  const startDateError = document.getElementById('start-date-error');
  const endDateError = document.getElementById('end-date-error');

  // Enforce today as minimum selectable date for leave applications
  function applyDateConstraints() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (startDateInput && endDateInput) {
      startDateInput.min = todayStr;
      endDateInput.min = todayStr;
    }
  }
  applyDateConstraints();

  // Validate start date
  function validateStartDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const val = startDateInput.value;

    if (!val) {
      startDateInput.classList.remove('is-invalid');
      if (startDateError) startDateError.classList.remove('visible');
      return false;
    }

    const selectedDate = new Date(val);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      startDateInput.classList.add('is-invalid');
      if (startDateError) {
        startDateError.textContent = 'Start date cannot be in the past.';
        startDateError.classList.add('visible');
      }
      showToast('Start date cannot be in the past', 'error');
      return false;
    } else {
      startDateInput.classList.remove('is-invalid');
      if (startDateError) startDateError.classList.remove('visible');
      
      endDateInput.min = val;
      if (endDateInput.value && endDateInput.value < val) {
        endDateInput.value = val;
      }
      return true;
    }
  }

  // Validate end date
  function validateEndDate() {
    const startVal = startDateInput.value;
    const endVal = endDateInput.value;

    if (!endVal) {
      endDateInput.classList.remove('is-invalid');
      if (endDateError) endDateError.classList.remove('visible');
      return false;
    }

    if (startVal && endVal < startVal) {
      endDateInput.classList.add('is-invalid');
      if (endDateError) {
        endDateError.textContent = 'End date must be on or after start date.';
        endDateError.classList.add('visible');
      }
      showToast('End date must be on or after start date', 'error');
      return false;
    } else {
      endDateInput.classList.remove('is-invalid');
      if (endDateError) endDateError.classList.remove('visible');
      return true;
    }
  }

  // Date calculation on input change
  function calculateDays() {
    const isStartValid = validateStartDate();
    const isEndValid = validateEndDate();

    if (isStartValid && isEndValid && startDateInput.value && endDateInput.value) {
      const start = new Date(startDateInput.value);
      const end = new Date(endDateInput.value);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      daysCountDisplay.textContent = diffDays;
      daysBanner.classList.remove('hidden');
      return diffDays;
    } else {
      daysBanner.classList.add('hidden');
      return 0;
    }
  }

  if (startDateInput && endDateInput) {
    startDateInput.addEventListener('change', calculateDays);
    endDateInput.addEventListener('change', calculateDays);
    startDateInput.addEventListener('input', calculateDays);
    endDateInput.addEventListener('input', calculateDays);
  }

  // Submit Leave Request
  leaveApplyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    applyDateConstraints();
    const isStartValid = validateStartDate();
    const isEndValid = validateEndDate();

    if (!isStartValid || !isEndValid) {
      showToast('Please select valid future dates from the calendar', 'error');
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      showToast('End Date must be on or after Start Date', 'error');
      return;
    }

    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || {};
    const newLeavePayload = {
      empId: session.id || 'EMP-101',
      empName: session.name || 'Alex Johnson',
      empEmail: session.email || 'employee@company.com',
      type: document.getElementById('leave-type').value,
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      days: days,
      reason: document.getElementById('leave-reason').value.trim()
    };

    const res = await ApexAPI.submitLeave(newLeavePayload);

    showToast('Leave request submitted successfully!', 'success');
    leaveApplyForm.reset();
    applyDateConstraints();
    daysBanner.classList.add('hidden');
    await renderEmployeePortal();
  });

  // =========================================================================
  // ADMIN PANEL LOGIC
  // =========================================================================

  // Mobile Sidebar Drawer Control
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function openMobileSidebar() {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.add('mobile-open');
      sidebarOverlay.classList.add('active');
    }
  }

  function closeMobileSidebar() {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('active');
    }
  }

  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', openMobileSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Sidebar Tab Switching
  sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarNavItems.forEach(i => i.classList.remove('active'));
      adminTabContents.forEach(c => c.classList.remove('active'));

      item.classList.add('active');
      const tabId = item.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.add('active');

      const titles = {
        'dashboard': 'Dashboard Overview',
        'employees': 'Employee Directory',
        'leave-history': 'Master Leave Management',
        'profile': 'Administrator Profile'
      };
      adminActiveTabTitle.textContent = titles[tabId] || 'Admin Panel';

      closeMobileSidebar();
    });
  });

  if (viewAllPendingBtn) {
    viewAllPendingBtn.addEventListener('click', () => {
      document.querySelector('.sidebar-nav .nav-item[data-tab="leave-history"]').click();
      document.querySelector('.filter-btn[data-filter="Pending"]').click();
    });
  }

  async function renderAdminPortal() {
    await updateAdminStats();
    await renderDashboardRecentTable();
    await renderAdminEmployeeList();
    await renderAdminLeaveHistory('all');
  }

  async function updateAdminStats() {
    const stats = await ApexAPI.getStats();

    statTotalEmployees.textContent = stats.totalEmployees;
    statPendingRequests.textContent = stats.pendingRequests;
    statApprovedLeaves.textContent = stats.approvedLeaves;
    statRejectedLeaves.textContent = stats.rejectedLeaves;

    pendingBadgeCount.textContent = stats.pendingRequests;
  }

  // Dashboard Recent Table
  async function renderDashboardRecentTable() {
    const leaves = await ApexAPI.getLeaves({ status: 'Pending' });
    dashboardRecentTbody.innerHTML = '';

    if (leaves.length === 0) {
      dashboardRecentTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-secondary);">No pending leave applications.</td></tr>`;
      return;
    }

    leaves.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${l.empName}</strong><br><small style="color:var(--color-text-secondary)">${l.empEmail}</small></td>
        <td>${l.type}</td>
        <td>${l.startDate} to ${l.endDate}</td>
        <td><strong>${l.days} Day(s)</strong></td>
        <td>${l.reason}</td>
        <td>
          <button class="btn btn-success btn-xs action-approve" data-id="${l.id}">Approve</button>
          <button class="btn btn-danger btn-xs action-reject" data-id="${l.id}">Reject</button>
        </td>
      `;
      dashboardRecentTbody.appendChild(tr);
    });

    attachLeaveActionListeners(dashboardRecentTbody);
  }

  // Admin Employee Directory
  async function renderAdminEmployeeList(filterText = '') {
    let employees = await ApexAPI.getEmployees({ search: filterText });

    adminEmployeesTbody.innerHTML = '';
    employees.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${e.name}</strong><br><small style="color:var(--color-text-secondary)">${e.id}</small></td>
        <td>${e.email}</td>
        <td>${e.dept}</td>
        <td>${e.role}</td>
        <td>${e.allowance} Days / Year</td>
        <td><span class="badge badge-approved"><span class="badge-dot"></span> ${e.status}</span></td>
      `;
      adminEmployeesTbody.appendChild(tr);
    });
  }

  if (employeeSearchInput) {
    employeeSearchInput.addEventListener('input', async (e) => {
      await renderAdminEmployeeList(e.target.value.toLowerCase().trim());
    });
  }

  // Admin Leave History & Filter
  async function renderAdminLeaveHistory(filter = 'all') {
    let leaves = await ApexAPI.getLeaves({ status: filter === 'all' ? 'All' : filter });

    adminLeaveTbody.innerHTML = '';
    if (leaves.length === 0) {
      adminLeaveTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-secondary);">No records match filter "${filter}".</td></tr>`;
      return;
    }

    [...leaves].reverse().forEach(l => {
      const tr = document.createElement('tr');
      const badgeClass = l.status === 'Approved' ? 'badge-approved' : l.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
      const actionHtml = l.status === 'Pending' 
        ? `<button class="btn btn-success btn-xs action-approve" data-id="${l.id}">Approve</button>
           <button class="btn btn-danger btn-xs action-reject" data-id="${l.id}">Reject</button>`
        : `<span style="font-size:0.75rem; color:var(--color-text-muted);">Resolved</span>`;

      tr.innerHTML = `
        <td><code>${l.id}</code></td>
        <td><strong>${l.empName}</strong><br><small style="color:var(--color-text-secondary)">${l.empEmail}</small></td>
        <td>${l.type}</td>
        <td>${l.startDate} &rarr; ${l.endDate}</td>
        <td><strong>${l.days} Day(s)</strong></td>
        <td>${l.reason}</td>
        <td><span class="badge ${badgeClass}"><span class="badge-dot"></span> ${l.status}</span></td>
        <td>${actionHtml}</td>
      `;
      adminLeaveTbody.appendChild(tr);
    });

    attachLeaveActionListeners(adminLeaveTbody);
  }

  // Filter Buttons Handler
  filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      await renderAdminLeaveHistory(filter);
    });
  });

  // Action Listeners for Approve / Reject
  function attachLeaveActionListeners(container) {
    container.querySelectorAll('.action-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await updateLeaveStatus(id, 'Approved');
      });
    });

    container.querySelectorAll('.action-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await updateLeaveStatus(id, 'Rejected');
      });
    });
  }

  async function updateLeaveStatus(leaveId, newStatus) {
    const res = await ApexAPI.updateLeaveStatus(leaveId, newStatus);
    showToast(`Leave request ${leaveId} has been ${newStatus.toLowerCase()}`, newStatus === 'Approved' ? 'success' : 'error');
    await renderAdminPortal();
  }

  // --- Auto Restore Session on Load ---
  const activeSession = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (activeSession) {
    try {
      const session = JSON.parse(activeSession);
      await switchView(session.role === 'admin' ? 'admin' : 'employee');
    } catch (e) {
      await switchView('login');
    }
  } else {
    await switchView('login');
  }

});
