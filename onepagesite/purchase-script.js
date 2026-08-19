/**
 * ApexHR - Purchase & Asset Order Management Script
 * Integrated with REST API & LocalStorage Fallback
 */

document.addEventListener('DOMContentLoaded', async () => {

  // --- Element Selectors ---
  const tabBtnCheckout = document.getElementById('tab-btn-checkout');
  const tabBtnHistory = document.getElementById('tab-btn-history');
  const viewCheckout = document.getElementById('view-checkout');
  const viewHistory = document.getElementById('view-history');

  const purchaseForm = document.getElementById('purchase-order-form');
  const catalogCards = document.querySelectorAll('.catalog-item-card');

  const itemNameInput = document.getElementById('purchase-item-name');
  const categorySelect = document.getElementById('purchase-category');
  const billingCycleSelect = document.getElementById('purchase-billing-cycle');
  const purchaseDateInput = document.getElementById('purchase-date');
  const renewalDateInput = document.getElementById('renewal-date');
  const quantityInput = document.getElementById('purchase-quantity');
  const unitPriceInput = document.getElementById('purchase-unit-price');
  const buyerNameInput = document.getElementById('purchase-buyer-name');
  const departmentSelect = document.getElementById('purchase-department');
  const paymentMethodSelect = document.getElementById('purchase-payment-method');
  const statusSelect = document.getElementById('purchase-status-select');
  const notesInput = document.getElementById('purchase-notes');

  // Summary Card Elements
  const sumItemName = document.getElementById('sum-item-name');
  const sumCategory = document.getElementById('sum-category');
  const sumPurchaseDate = document.getElementById('sum-purchase-date');
  const sumRenewalDate = document.getElementById('sum-renewal-date');
  const sumQty = document.getElementById('sum-qty');
  const sumSubtotal = document.getElementById('sum-subtotal');
  const sumTax = document.getElementById('sum-tax');
  const sumTotal = document.getElementById('sum-total');

  // Date calculation pill
  const datePill = document.getElementById('date-calculation-pill');
  const pillStartDate = document.getElementById('pill-start-date');
  const pillEndDate = document.getElementById('pill-end-date');

  // Stats Elements
  const statTotalSpend = document.getElementById('stat-total-spend');
  const statCompletedOrders = document.getElementById('stat-completed-orders');
  const statPendingOrders = document.getElementById('stat-pending-orders');
  const liveTodayDate = document.getElementById('live-today-date');
  const ordersBadgeCount = document.getElementById('orders-badge-count');

  // Ledger Table & Filters
  const purchasesTbody = document.getElementById('purchases-tbody');
  const ledgerSearchInput = document.getElementById('ledger-search-input');
  const ledgerStatusFilter = document.getElementById('ledger-status-filter');

  // Invoice Modal Elements
  const invoiceModal = document.getElementById('invoice-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const toastContainer = document.getElementById('toast-container');

  // --- Date Helper Functions ---
  function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function calculateRenewalDate(startDateStr, cycle, category) {
    if (!startDateStr) return '';
    const [y, m, d] = startDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (cycle === 'Monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (cycle === 'Annual') {
      date.setFullYear(date.getFullYear() + 1);
    } else { // One-Time / Hardware
      const years = (category === 'Hardware Equipment' || category === 'Office Asset') ? 3 : 1;
      date.setFullYear(date.getFullYear() + years);
    }

    return getLocalDateString(date);
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  // --- Toast Notification Helper ---
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- Initialize Today's Date ---
  const todayStr = getLocalDateString();
  if (purchaseDateInput) {
    purchaseDateInput.value = todayStr;
  }
  if (liveTodayDate) {
    liveTodayDate.textContent = formatDisplayDate(todayStr);
  }

  // Auto-fill logged in user info if available
  const activeSession = JSON.parse(localStorage.getItem('apex_auth_session') || '{}');
  if (activeSession.name && buyerNameInput) {
    buyerNameInput.value = activeSession.name;
  }

  // --- Update Dynamic Dates & Summary Calculation ---
  function updateOrderCalculations() {
    const pDate = purchaseDateInput.value || todayStr;
    const cycle = billingCycleSelect.value;
    const category = categorySelect.value;

    const rDate = calculateRenewalDate(pDate, cycle, category);
    if (renewalDateInput) {
      renewalDateInput.value = rDate;
    }

    const qty = Math.max(1, parseInt(quantityInput.value) || 1);
    const unitPrice = Math.max(0, parseFloat(unitPriceInput.value) || 0);
    const subtotal = qty * unitPrice;
    const tax = subtotal * 0.10;
    const total = subtotal + tax;

    // Update Summary Card
    if (sumItemName) sumItemName.textContent = itemNameInput.value || 'Custom Asset';
    if (sumCategory) sumCategory.textContent = category;
    if (sumPurchaseDate) sumPurchaseDate.textContent = pDate;
    if (sumRenewalDate) sumRenewalDate.textContent = rDate;
    if (sumQty) sumQty.textContent = qty;
    if (sumSubtotal) sumSubtotal.textContent = formatCurrency(subtotal);
    if (sumTax) sumTax.textContent = formatCurrency(tax);
    if (sumTotal) sumTotal.textContent = formatCurrency(total);

    // Update Date Pill
    if (pillStartDate && pillEndDate) {
      pillStartDate.textContent = formatDisplayDate(pDate);
      pillEndDate.textContent = formatDisplayDate(rDate);
    }
  }

  // Catalog Item Selection
  catalogCards.forEach(card => {
    card.addEventListener('click', () => {
      catalogCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const itemName = card.getAttribute('data-item');
      const price = card.getAttribute('data-price');
      const category = card.getAttribute('data-category');
      const cycle = card.getAttribute('data-cycle');

      if (itemNameInput) itemNameInput.value = itemName;
      if (unitPriceInput) unitPriceInput.value = price;
      if (categorySelect) categorySelect.value = category;
      if (billingCycleSelect) billingCycleSelect.value = cycle;

      updateOrderCalculations();
    });
  });

  // Inputs Change Listeners
  [itemNameInput, categorySelect, billingCycleSelect, purchaseDateInput, quantityInput, unitPriceInput].forEach(el => {
    if (el) {
      el.addEventListener('input', updateOrderCalculations);
      el.addEventListener('change', updateOrderCalculations);
    }
  });

  // --- Tab View Switcher ---
  function switchPurchaseView(view) {
    if (view === 'checkout') {
      tabBtnCheckout.classList.add('active', 'btn-primary');
      tabBtnCheckout.classList.remove('btn-secondary');
      tabBtnHistory.classList.remove('active', 'btn-primary');
      tabBtnHistory.classList.add('btn-secondary');
      viewCheckout.classList.remove('hidden');
      viewHistory.classList.add('hidden');
    } else {
      tabBtnHistory.classList.add('active', 'btn-primary');
      tabBtnHistory.classList.remove('btn-secondary');
      tabBtnCheckout.classList.remove('active', 'btn-primary');
      tabBtnCheckout.classList.add('btn-secondary');
      viewHistory.classList.remove('hidden');
      viewCheckout.classList.add('hidden');
      loadPurchasesLedger();
    }
  }

  if (tabBtnCheckout) tabBtnCheckout.addEventListener('click', () => switchPurchaseView('checkout'));
  if (tabBtnHistory) tabBtnHistory.addEventListener('click', () => switchPurchaseView('history'));

  // --- Load Purchases Ledger ---
  async function loadPurchasesLedger() {
    const search = ledgerSearchInput ? ledgerSearchInput.value.trim() : '';
    const status = ledgerStatusFilter ? ledgerStatusFilter.value : 'All';

    const res = await ApexAPI.getPurchases({ search, status });
    const purchases = res.purchases || [];
    const stats = res.stats || {};

    // Update Statistics
    if (statTotalSpend) statTotalSpend.textContent = formatCurrency(stats.totalSpend || 0);
    if (statCompletedOrders) statCompletedOrders.textContent = stats.completedCount || 0;
    if (statPendingOrders) statPendingOrders.textContent = stats.pendingCount || 0;
    if (ordersBadgeCount) ordersBadgeCount.textContent = stats.totalOrders || purchases.length;

    // Render Table Rows
    purchasesTbody.innerHTML = '';
    if (purchases.length === 0) {
      purchasesTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No purchase orders matching filters.</td></tr>`;
      return;
    }

    purchases.forEach(p => {
      const tr = document.createElement('tr');
      const badgeClass = p.status === 'Completed' ? 'badge-approved' : p.status === 'Processing' ? 'badge-pending' : 'badge-rejected';
      const categoryIcon = p.category.includes('Hardware') ? '💻' : p.category.includes('Office') ? '🪑' : '💼';

      tr.innerHTML = `
        <td>
          <strong style="color:#38bdf8;">${p.id}</strong><br>
          <small style="color:var(--text-muted);">${p.invoiceNumber || 'INV-NA'}</small>
        </td>
        <td>
          <strong>${categoryIcon} ${p.item}</strong><br>
          <span class="badge badge-pending" style="font-size:0.7rem; padding:2px 6px;">${p.category}</span>
        </td>
        <td><strong>${p.purchaseDate}</strong></td>
        <td><span style="color:#38bdf8;">${p.renewalDate || 'N/A'}</span></td>
        <td>
          <strong>${p.buyerName}</strong><br>
          <small style="color:var(--text-secondary);">${p.department}</small>
        </td>
        <td><strong>${formatCurrency(p.amount)}</strong></td>
        <td><span class="badge ${badgeClass}"><span class="badge-dot"></span> ${p.status}</span></td>
        <td>
          <button type="button" class="btn btn-secondary btn-xs view-invoice-btn" data-id="${p.id}" title="View Receipt">
            🧾 Receipt
          </button>
        </td>
      `;
      purchasesTbody.appendChild(tr);
    });

    // Attach Invoice View Listeners
    purchasesTbody.querySelectorAll('.view-invoice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const purchase = purchases.find(p => p.id === id);
        if (purchase) {
          openInvoiceModal(purchase);
        }
      });
    });
  }

  if (ledgerSearchInput) ledgerSearchInput.addEventListener('input', loadPurchasesLedger);
  if (ledgerStatusFilter) ledgerStatusFilter.addEventListener('change', loadPurchasesLedger);

  // --- Invoice Modal Display ---
  function openInvoiceModal(p) {
    document.getElementById('modal-invoice-status').textContent = (p.status || 'COMPLETED').toUpperCase();
    document.getElementById('modal-invoice-id').textContent = p.invoiceNumber || p.id;
    document.getElementById('modal-buyer-name').textContent = p.buyerName;
    document.getElementById('modal-buyer-email').textContent = p.buyerEmail || 'employee@company.com';
    document.getElementById('modal-buyer-dept').textContent = `${p.department} Dept`;
    document.getElementById('modal-purchase-date').textContent = p.purchaseDate;
    document.getElementById('modal-renewal-date').textContent = p.renewalDate || p.purchaseDate;
    document.getElementById('modal-payment-method').textContent = p.paymentMethod;

    document.getElementById('modal-item-name').textContent = p.item;
    document.getElementById('modal-item-category').textContent = p.category;
    document.getElementById('modal-item-qty').textContent = p.quantity || 1;

    const unitPrice = Number(p.amount) / (p.quantity || 1);
    document.getElementById('modal-unit-price').textContent = formatCurrency(unitPrice);
    document.getElementById('modal-item-subtotal').textContent = formatCurrency(p.amount);

    const tax = p.amount * 0.10;
    const total = p.amount + tax;
    document.getElementById('modal-calc-subtotal').textContent = formatCurrency(p.amount);
    document.getElementById('modal-calc-tax').textContent = formatCurrency(tax);
    document.getElementById('modal-calc-total').textContent = formatCurrency(total);

    invoiceModal.classList.remove('hidden');
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => invoiceModal.classList.add('hidden'));
  }
  if (invoiceModal) {
    invoiceModal.addEventListener('click', (e) => {
      if (e.target === invoiceModal) invoiceModal.classList.add('hidden');
    });
  }

  // --- Submit Purchase Form Handler ---
  purchaseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-purchase-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Processing Order...';
    }

    const qty = parseInt(quantityInput.value) || 1;
    const unitPrice = parseFloat(unitPriceInput.value) || 0;
    const subtotal = qty * unitPrice;

    const payload = {
      item: itemNameInput.value.trim(),
      category: categorySelect.value,
      billingCycle: billingCycleSelect.value,
      purchaseDate: purchaseDateInput.value,
      renewalDate: renewalDateInput.value,
      quantity: qty,
      amount: subtotal,
      buyerName: buyerNameInput.value.trim(),
      buyerEmail: activeSession.email || 'employee@company.com',
      department: departmentSelect.value,
      paymentMethod: paymentMethodSelect.value,
      status: statusSelect.value,
      notes: notesInput.value.trim()
    };

    try {
      const res = await ApexAPI.createPurchase(payload);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = '💳 Authorize & Complete Purchase Order';
      }

      if (res && res.error) {
        showToast(res.error, 'error');
        return;
      }

      showToast(`Purchase order ${res.purchase.id} created successfully!`, 'success');
      switchPurchaseView('history');
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = '💳 Authorize & Complete Purchase Order';
      }
      showToast('Error recording purchase order', 'error');
    }
  });

  // Initial Calculation & Data Load
  updateOrderCalculations();
  await loadPurchasesLedger();

});
