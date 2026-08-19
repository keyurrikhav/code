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
  const leaveTypeSelect = document.getElementById('leave-type');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const startDateError = document.getElementById('start-date-error');
  const endDateError = document.getElementById('end-date-error');
  const durationTypeContainer = document.getElementById('duration-type-container');
  const dayPortionRadios = document.querySelectorAll('input[name="day-portion"]');
  const overlapErrorBanner = document.getElementById('overlap-error-banner');
  const overlapErrorText = document.getElementById('overlap-error-text');
  const balanceErrorBanner = document.getElementById('balance-error-banner');
  const balanceErrorText = document.getElementById('balance-error-text');
  const limitErrorBanner = document.getElementById('limit-error-banner');
  const daysBanner = document.getElementById('days-calculation-banner');
  const daysCountDisplay = document.getElementById('calculated-days-count');
  const daysLimitStatus = document.getElementById('days-limit-status');
  const daysMeterFill = document.getElementById('days-meter-fill');
  const leaveReasonInput = document.getElementById('leave-reason');
  const reasonError = document.getElementById('reason-error');
  const reasonCharCount = document.getElementById('reason-char-count');
  const submitLeaveBtn = document.getElementById('submit-leave-btn');
  const empHistoryTbody = document.getElementById('emp-history-tbody');
  const empVacationBalance = document.getElementById('emp-vacation-balance');
  const empPendingCount = document.getElementById('emp-pending-count');
  const empApprovedCount = document.getElementById('emp-approved-count');
  const empFilterBtns = document.querySelectorAll('#emp-filter-group .btn-filter');

  // Employee State
  let currentEmpLeaves = [];
  let currentEmpAllowance = 18;
  let currentEmpApprovedDays = 0;
  let activeEmpFilter = 'all';

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

  // --- Helper Date Functions ---
  // Returns local date formatted as YYYY-MM-DD (timezone-safe)
  function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Add days to a YYYY-MM-DD string
  function addDaysToDateString(dateStr, numDays) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + numDays);
    return getLocalDateString(date);
  }

  // Calculate difference in whole calendar days inclusive (e.g. Aug 10 to Aug 10 = 1 day)
  function getDayDiffInclusive(startStr, endStr) {
    if (!startStr || !endStr) return 0;
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);
    const dStart = new Date(y1, m1 - 1, d1);
    const dEnd = new Date(y2, m2 - 1, d2);
    const diffTime = dEnd.getTime() - dStart.getTime();
    if (diffTime < 0) return -1;
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
          id: user.empId || 'EMP-101',
          allowance: user.allowance || 18
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
  // EMPLOYEE PORTAL LOGIC & LEAVE VALIDATION ENGINE
  // =========================================================================

  // Enforce today as minimum selectable date and max 7 days constraint
  function applyDateConstraints() {
    const todayStr = getLocalDateString();
    
    if (startDateInput) {
      startDateInput.min = todayStr;
    }
    if (endDateInput) {
      if (startDateInput && startDateInput.value && startDateInput.value >= todayStr) {
        endDateInput.min = startDateInput.value;
        endDateInput.max = addDaysToDateString(startDateInput.value, 6); // Strict 7-day maximum!
      } else {
        endDateInput.min = todayStr;
        endDateInput.removeAttribute('max');
      }
    }
  }

  // Validate Start Date
  function validateStartDate() {
    const todayStr = getLocalDateString();
    const val = startDateInput.value;

    if (!val) {
      startDateInput.classList.remove('is-invalid');
      if (startDateError) startDateError.classList.remove('visible');
      return false;
    }

    if (val < todayStr) {
      startDateInput.classList.add('is-invalid');
      if (startDateError) {
        startDateError.textContent = `Start date cannot be in the past (minimum is ${todayStr}).`;
        startDateError.classList.add('visible');
      }
      return false;
    } else {
      startDateInput.classList.remove('is-invalid');
      if (startDateError) startDateError.classList.remove('visible');
      
      // Update End Date bounds
      endDateInput.min = val;
      endDateInput.max = addDaysToDateString(val, 6); // Max 7 calendar days inclusive
      
      if (!endDateInput.value || endDateInput.value < val) {
        endDateInput.value = val;
      } else if (endDateInput.value > endDateInput.max) {
        endDateInput.value = endDateInput.max;
      }
      return true;
    }
  }

  // Validate End Date
  function validateEndDate() {
    const todayStr = getLocalDateString();
    const startVal = startDateInput.value;
    const endVal = endDateInput.value;

    if (!endVal) {
      endDateInput.classList.remove('is-invalid');
      if (endDateError) endDateError.classList.remove('visible');
      return false;
    }

    if (endVal < todayStr) {
      endDateInput.classList.add('is-invalid');
      if (endDateError) {
        endDateError.textContent = 'End date cannot be in the past.';
        endDateError.classList.add('visible');
      }
      return false;
    }

    if (startVal && endVal < startVal) {
      endDateInput.classList.add('is-invalid');
      if (endDateError) {
        endDateError.textContent = 'End date must be on or after start date.';
        endDateError.classList.add('visible');
      }
      return false;
    }

    if (startVal) {
      const diffDays = getDayDiffInclusive(startVal, endVal);
      if (diffDays > 7) {
        endDateInput.classList.add('is-invalid');
        if (endDateError) {
          endDateError.textContent = `Leave duration cannot exceed 7 consecutive days (selected: ${diffDays} days).`;
          endDateError.classList.add('visible');
        }
        if (limitErrorBanner) limitErrorBanner.classList.remove('hidden');
        return false;
      }
    }

    endDateInput.classList.remove('is-invalid');
    if (endDateError) endDateError.classList.remove('visible');
    if (limitErrorBanner) limitErrorBanner.classList.add('hidden');
    return true;
  }

  // Check for Overlapping Leaves (Pending or Approved)
  function checkLeaveOverlap(startStr, endStr) {
    if (!currentEmpLeaves || currentEmpLeaves.length === 0) {
      if (overlapErrorBanner) overlapErrorBanner.classList.add('hidden');
      return null;
    }

    const activeLeaves = currentEmpLeaves.filter(l => ['Pending', 'Approved'].includes(l.status));
    for (const l of activeLeaves) {
      // Overlap occurs if !(end < l.startDate || start > l.endDate)
      if (!(endStr < l.startDate || startStr > l.endDate)) {
        if (overlapErrorBanner && overlapErrorText) {
          overlapErrorText.textContent = `Conflicts with your ${l.status} leave: "${l.type}" (${l.startDate} to ${l.endDate}).`;
          overlapErrorBanner.classList.remove('hidden');
        }
        return l;
      }
    }

    if (overlapErrorBanner) overlapErrorBanner.classList.add('hidden');
    return null;
  }

  // Comprehensive Date, Duration, and Balance Calculation
  function calculateDaysAndValidate() {
    const isStartValid = validateStartDate();
    const isEndValid = validateEndDate();

    if (!isStartValid || !isEndValid || !startDateInput.value || !endDateInput.value) {
      if (daysBanner) daysBanner.classList.add('hidden');
      if (overlapErrorBanner) overlapErrorBanner.classList.add('hidden');
      if (balanceErrorBanner) balanceErrorBanner.classList.add('hidden');
      return 0;
    }

    const startVal = startDateInput.value;
    const endVal = endDateInput.value;
    const dayDiff = getDayDiffInclusive(startVal, endVal);

    if (dayDiff <= 0) {
      if (daysBanner) daysBanner.classList.add('hidden');
      return 0;
    }

    // Toggle duration type container (Half-day option only available for 1-day range)
    let calculatedDuration = dayDiff;
    if (dayDiff === 1) {
      if (durationTypeContainer) durationTypeContainer.classList.remove('hidden');
      const selectedPortion = document.querySelector('input[name="day-portion"]:checked')?.value || '1.0';
      if (selectedPortion.startsWith('0.5')) {
        calculatedDuration = 0.5;
      }
    } else {
      if (durationTypeContainer) durationTypeContainer.classList.add('hidden');
    }

    // Update Days Banner & Progress Meter
    if (daysBanner && daysCountDisplay) {
      daysCountDisplay.textContent = calculatedDuration;
      daysBanner.classList.remove('hidden');

      if (daysMeterFill) {
        const percent = Math.min(100, (dayDiff / 7) * 100);
        daysMeterFill.style.width = `${percent}%`;
        
        if (dayDiff > 7) {
          daysMeterFill.classList.add('exceeded');
          if (daysLimitStatus) {
            daysLimitStatus.textContent = 'Exceeds 7-Day Limit!';
            daysLimitStatus.classList.add('exceeded');
          }
        } else {
          daysMeterFill.classList.remove('exceeded');
          if (daysLimitStatus) {
            daysLimitStatus.textContent = `${calculatedDuration} / 7 Days Allowed`;
            daysLimitStatus.classList.remove('exceeded');
          }
        }
      }
    }

    // Check Overlap Conflict
    checkLeaveOverlap(startVal, endVal);

    // Check Leave Balance Quota
    const availableBalance = Math.max(0, currentEmpAllowance - currentEmpApprovedDays);
    if (calculatedDuration > availableBalance) {
      if (balanceErrorBanner && balanceErrorText) {
        balanceErrorText.textContent = `Requested ${calculatedDuration} day(s), but only ${availableBalance} day(s) remain in your quota.`;
        balanceErrorBanner.classList.remove('hidden');
      }
    } else {
      if (balanceErrorBanner) balanceErrorBanner.classList.add('hidden');
    }

    return calculatedDuration;
  }

  // Attach Event Listeners to Inputs
  if (startDateInput) {
    startDateInput.addEventListener('change', () => {
      validateStartDate();
      calculateDaysAndValidate();
    });
    startDateInput.addEventListener('input', () => {
      validateStartDate();
      calculateDaysAndValidate();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener('change', () => {
      validateEndDate();
      calculateDaysAndValidate();
    });
    endDateInput.addEventListener('input', () => {
      validateEndDate();
      calculateDaysAndValidate();
    });
  }

  if (dayPortionRadios) {
    dayPortionRadios.forEach(r => {
      r.addEventListener('change', calculateDaysAndValidate);
    });
  }

  if (leaveReasonInput && reasonCharCount) {
    leaveReasonInput.addEventListener('input', () => {
      const len = leaveReasonInput.value.trim().length;
      reasonCharCount.textContent = `${len} / 5 min chars`;
      if (len >= 5) {
        reasonCharCount.classList.add('valid');
        if (reasonError) reasonError.classList.remove('visible');
      } else {
        reasonCharCount.classList.remove('valid');
      }
    });
  }

  // Render Employee Portal Data
  async function renderEmployeePortal() {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || {};
    empNameDisplay.textContent = session.name || 'Alex Johnson';
    empAvatarDisplay.textContent = (session.name || 'A').charAt(0).toUpperCase();

    const allLeaves = await ApexAPI.getLeaves();
    currentEmpLeaves = allLeaves.filter(l => l.empEmail === session.email || l.empId === session.id);
    currentEmpAllowance = session.allowance || 18;

    // Calculate metrics
    const pending = currentEmpLeaves.filter(l => l.status === 'Pending').length;
    const approved = currentEmpLeaves.filter(l => l.status === 'Approved').length;
    currentEmpApprovedDays = currentEmpLeaves.filter(l => l.status === 'Approved').reduce((acc, cur) => acc + Number(cur.days || 0), 0);
    const remainingBalance = Math.max(0, currentEmpAllowance - currentEmpApprovedDays);

    if (empPendingCount) empPendingCount.textContent = pending;
    if (empApprovedCount) empApprovedCount.textContent = approved;
    if (empVacationBalance) empVacationBalance.textContent = `${remainingBalance} / ${currentEmpAllowance} Days`;

    renderEmployeeHistoryTable();
    applyDateConstraints();
  }

  // Render Employee History Table with Filters
  function renderEmployeeHistoryTable() {
    if (!empHistoryTbody) return;

    let filtered = [...currentEmpLeaves];
    if (activeEmpFilter !== 'all') {
      filtered = filtered.filter(l => l.status.toLowerCase() === activeEmpFilter.toLowerCase());
    }

    empHistoryTbody.innerHTML = '';
    if (filtered.length === 0) {
      empHistoryTbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--color-text-secondary); padding: 1.5rem;">No leave history matching filter "${activeEmpFilter}".</td></tr>`;
      return;
    }

    [...filtered].reverse().forEach(l => {
      const tr = document.createElement('tr');
      const badgeClass = l.status === 'Approved' ? 'badge-approved' : l.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
      const actionHtml = l.status === 'Pending'
        ? `<button type="button" class="btn btn-outline-danger btn-xs cancel-leave-btn" data-id="${l.id}" title="Withdraw request">Cancel</button>`
        : `<span style="font-size:0.75rem; color:var(--color-text-muted);">Resolved</span>`;

      tr.innerHTML = `
        <td><strong>${l.type}</strong></td>
        <td>${l.startDate} &rarr; ${l.endDate}</td>
        <td><strong>${l.days} Day(s)</strong></td>
        <td style="max-width: 200px; word-break: break-word;">${l.reason}</td>
        <td><span class="badge ${badgeClass}"><span class="badge-dot"></span> ${l.status}</span></td>
        <td>${actionHtml}</td>
      `;
      empHistoryTbody.appendChild(tr);
    });

    // Attach cancel action listeners
    empHistoryTbody.querySelectorAll('.cancel-leave-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Are you sure you want to cancel leave request ${id}?`)) {
          await ApexAPI.deleteLeave(id);
          showToast(`Leave request ${id} cancelled`, 'info');
          await renderEmployeePortal();
        }
      });
    });
  }

  // History Filter Buttons
  if (empFilterBtns) {
    empFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        empFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeEmpFilter = btn.getAttribute('data-emp-filter');
        renderEmployeeHistoryTable();
      });
    });
  }

  // Submit Leave Request Handler
  leaveApplyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    applyDateConstraints();
    const isStartValid = validateStartDate();
    const isEndValid = validateEndDate();

    if (!isStartValid || !isEndValid) {
      showToast('Please select valid dates from the calendar (today or future, max 7 days)', 'error');
      return;
    }

    const days = calculateDaysAndValidate();
    if (days <= 0) {
      showToast('End Date must be on or after Start Date', 'error');
      return;
    }

    if (days > 7) {
      showToast('Policy Error: Leave duration cannot exceed 7 consecutive days', 'error');
      if (limitErrorBanner) limitErrorBanner.classList.remove('hidden');
      return;
    }

    // Check Overlap Conflict
    const overlapConflict = checkLeaveOverlap(startDateInput.value, endDateInput.value);
    if (overlapConflict) {
      showToast(`Conflict: You already have a ${overlapConflict.status} leave for this period!`, 'error');
      return;
    }

    // Check Balance
    const availableBalance = Math.max(0, currentEmpAllowance - currentEmpApprovedDays);
    if (days > availableBalance) {
      showToast(`Insufficient balance: You only have ${availableBalance} day(s) remaining`, 'error');
      return;
    }

    // Validate Reason
    const reasonText = leaveReasonInput.value.trim();
    if (reasonText.length < 5) {
      if (reasonError) reasonError.classList.add('visible');
      showToast('Please provide a reason with at least 5 characters', 'error');
      leaveReasonInput.focus();
      return;
    }

    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || {};
    const selectedPortion = document.querySelector('input[name="day-portion"]:checked')?.value || '1.0';
    const portionLabel = selectedPortion === '0.5-first' ? ' (First Half)' : selectedPortion === '0.5-second' ? ' (Second Half)' : '';

    const newLeavePayload = {
      empId: session.id || 'EMP-101',
      empName: session.name || 'Alex Johnson',
      empEmail: session.email || 'employee@company.com',
      type: leaveTypeSelect.value,
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      days: days,
      portion: selectedPortion,
      reason: reasonText + portionLabel
    };

    if (submitLeaveBtn) {
      submitLeaveBtn.disabled = true;
      submitLeaveBtn.querySelector('span').textContent = 'Submitting...';
    }

    try {
      const res = await ApexAPI.submitLeave(newLeavePayload);
      if (submitLeaveBtn) {
        submitLeaveBtn.disabled = false;
        submitLeaveBtn.querySelector('span').textContent = 'Submit Leave Request';
      }

      if (res && res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast('Leave request submitted successfully!', 'success');
      leaveApplyForm.reset();
      applyDateConstraints();
      if (daysBanner) daysBanner.classList.add('hidden');
      if (overlapErrorBanner) overlapErrorBanner.classList.add('hidden');
      if (balanceErrorBanner) balanceErrorBanner.classList.add('hidden');
      if (limitErrorBanner) limitErrorBanner.classList.add('hidden');
      if (reasonCharCount) {
        reasonCharCount.textContent = '0 / 5 min chars';
        reasonCharCount.classList.remove('valid');
      }
      await renderEmployeePortal();
    } catch (err) {
      if (submitLeaveBtn) {
        submitLeaveBtn.disabled = false;
        submitLeaveBtn.querySelector('span').textContent = 'Submit Leave Request';
      }
      showToast('Error submitting leave request', 'error');
    }
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
    const allLeaves = await ApexAPI.getLeaves();

    adminEmployeesTbody.innerHTML = '';
    employees.forEach(e => {
      const approvedDays = allLeaves
        .filter(l => (l.empId === e.id || l.empEmail === e.email) && l.status === 'Approved')
        .reduce((sum, l) => sum + Number(l.days || 0), 0);
      const remainingQuota = Math.max(0, (e.allowance || 18) - approvedDays);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${e.name}</strong><br><small style="color:var(--color-text-secondary)">${e.id}</small></td>
        <td>${e.email}</td>
        <td>${e.dept}</td>
        <td>${e.role}</td>
        <td><strong>${remainingQuota}</strong> / ${e.allowance} Days Left</td>
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
