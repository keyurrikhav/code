/**
 * ApexHR API Client Library
 * Handles dynamic network communication with the ApexHR REST API server.
 * Includes automatic offline fallback to localStorage when server is unreachable.
 */

const API_BASE_URL = 'http://localhost:5000/api';

const ApexAPI = {
  isServerOnline: false,

  // Check backend server connectivity
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        this.isServerOnline = true;
        return await response.json();
      }
    } catch (e) {
      this.isServerOnline = false;
    }
    return { status: 'offline', mode: 'localStorage Fallback' };
  },

  // Auth: Login
  async login(email, password) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('API connection failed, falling back to local auth:', err);
      }
    }

    // Local Storage Fallback
    if (email === 'admin@company.com') {
      return {
        success: true,
        message: 'Admin Auth (Local)',
        user: { name: 'Sarah Connor', email: 'admin@company.com', role: 'admin', title: 'HR Director' }
      };
    }
    return {
      success: true,
      message: 'Employee Auth (Local)',
      user: { name: 'Alex Johnson', email: email || 'employee@company.com', role: 'employee', empId: 'EMP-101', dept: 'Engineering', title: 'Software Engineer', allowance: 18 }
    };
  },

  // Get All Employees
  async getEmployees(params = {}) {
    if (this.isServerOnline) {
      try {
        const queryStr = new URLSearchParams(params).toString();
        const res = await fetch(`${API_BASE_URL}/employees?${queryStr}`);
        if (res.ok) {
          const data = await res.json();
          return data.employees;
        }
      } catch (err) {
        console.warn('API error, using local employees:', err);
      }
    }
    const local = localStorage.getItem('apex_employee_list');
    return local ? JSON.parse(local) : [];
  },

  // Add Employee
  async addEmployee(empData) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empData)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('API error adding employee:', err);
      }
    }
    // Local fallback
    const localEmps = JSON.parse(localStorage.getItem('apex_employee_list') || '[]');
    const newEmp = { id: `EMP-${100 + localEmps.length + 1}`, ...empData, allowance: 18, status: 'Active' };
    localEmps.push(newEmp);
    localStorage.setItem('apex_employee_list', JSON.stringify(localEmps));
    return { message: 'Employee added locally', employee: newEmp };
  },

  // Get Leaves
  async getLeaves(filters = {}) {
    if (this.isServerOnline) {
      try {
        const queryStr = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_BASE_URL}/leaves?${queryStr}`);
        if (res.ok) {
          const data = await res.json();
          return data.leaves;
        }
      } catch (err) {
        console.warn('API error, using local leaves:', err);
      }
    }
    const local = localStorage.getItem('apex_leave_requests');
    let leaves = local ? JSON.parse(local) : [];
    if (filters.status && filters.status !== 'All') {
      leaves = leaves.filter(l => l.status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.empId) {
      leaves = leaves.filter(l => l.empId === filters.empId);
    }
    return leaves;
  },

  // Submit Leave Request
  async submitLeave(leaveData) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/leaves`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaveData)
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || 'Failed to submit leave' };
        }
        return data;
      } catch (err) {
        console.warn('API error submitting leave:', err);
      }
    }

    // Local fallback validation
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (leaveData.startDate < todayStr) {
      return { error: 'Start date cannot be in the past' };
    }
    if (leaveData.endDate < leaveData.startDate) {
      return { error: 'End date must be on or after start date' };
    }
    if (Number(leaveData.days) > 7) {
      return { error: 'Leave duration cannot exceed 7 days per application' };
    }

    const localLeaves = JSON.parse(localStorage.getItem('apex_leave_requests') || '[]');
    const empId = leaveData.empId || 'EMP-101';
    
    // Check overlap
    const hasOverlap = localLeaves.some(l => 
      l.empId === empId && 
      ['Pending', 'Approved'].includes(l.status) && 
      !(leaveData.endDate < l.startDate || leaveData.startDate > l.endDate)
    );
    if (hasOverlap) {
      return { error: 'You already have an active leave request overlapping these dates' };
    }

    const newLeave = {
      id: `LR-${Math.floor(100 + Math.random() * 900)}`,
      empId: empId,
      empName: leaveData.empName || 'Alex Johnson',
      empEmail: leaveData.empEmail || 'employee@company.com',
      type: leaveData.type,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      days: leaveData.days || 1,
      reason: leaveData.reason,
      status: 'Pending',
      submittedAt: todayStr
    };
    localLeaves.unshift(newLeave);
    localStorage.setItem('apex_leave_requests', JSON.stringify(localLeaves));
    return { message: 'Leave submitted locally', leave: newLeave };
  },

  // Update Leave Status
  async updateLeaveStatus(leaveId, status) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/leaves/${leaveId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('API error updating leave status:', err);
      }
    }

    // Local fallback
    const localLeaves = JSON.parse(localStorage.getItem('apex_leave_requests') || '[]');
    const target = localLeaves.find(l => l.id === leaveId);
    if (target) {
      target.status = status;
      localStorage.setItem('apex_leave_requests', JSON.stringify(localLeaves));
      return { message: `Leave ${leaveId} status updated locally to ${status}`, leave: target };
    }
    return { error: 'Leave not found' };
  },

  // Delete Leave Request
  async deleteLeave(leaveId) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/leaves/${leaveId}`, {
          method: 'DELETE'
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('API error deleting leave:', err);
      }
    }

    // Local fallback
    let localLeaves = JSON.parse(localStorage.getItem('apex_leave_requests') || '[]');
    localLeaves = localLeaves.filter(l => l.id !== leaveId);
    localStorage.setItem('apex_leave_requests', JSON.stringify(localLeaves));
    return { message: `Leave ${leaveId} deleted locally` };
  },

  // Get HR Dashboard Statistics
  async getStats() {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/stats`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('API error getting stats:', err);
      }
    }
    // Local fallback
    const employees = await this.getEmployees();
    const leaves = await this.getLeaves();
    return {
      totalEmployees: employees.length,
      pendingRequests: leaves.filter(l => l.status === 'Pending').length,
  // Get All Purchases / Orders
  async getPurchases(filters = {}) {
    if (this.isServerOnline) {
      try {
        const queryStr = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_BASE_URL}/purchases?${queryStr}`);
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch (err) {
        console.warn('API error fetching purchases:', err);
      }
    }

    // Local fallback
    const defaultPurchases = [
      {
        id: "PO-101",
        invoiceNumber: "INV-2026-801",
        item: "ApexHR Enterprise Plan (50 Seats)",
        category: "Software License",
        purchaseDate: "2026-08-01",
        renewalDate: "2027-08-01",
        quantity: 50,
        billingCycle: "Annual",
        buyerName: "Sarah Connor",
        buyerEmail: "admin@company.com",
        department: "Human Resources",
        amount: 3588.00,
        paymentMethod: "Corporate Credit Card",
        status: "Completed",
        notes: "Annual enterprise workforce license renewal with dedicated support."
      },
      {
        id: "PO-102",
        invoiceNumber: "INV-2026-802",
        item: "Apple MacBook Pro 16\" M3 Max",
        category: "Hardware Equipment",
        purchaseDate: "2026-08-10",
        renewalDate: "2029-08-10",
        quantity: 1,
        billingCycle: "One-Time",
        buyerName: "Alex Johnson",
        buyerEmail: "employee@company.com",
        department: "Engineering",
        amount: 3499.00,
        paymentMethod: "Corporate PO",
        status: "Completed",
        notes: "Engineering workstation upgrade with 3-year AppleCare+ warranty."
      },
      {
        id: "PO-103",
        invoiceNumber: "INV-2026-803",
        item: "Dell UltraSharp 32\" 4K Monitors (Pack of 3)",
        category: "Hardware Equipment",
        purchaseDate: "2026-08-15",
        renewalDate: "2029-08-15",
        quantity: 3,
        billingCycle: "One-Time",
        buyerName: "Marcus Vance",
        buyerEmail: "marcus@company.com",
        department: "Product Design",
        amount: 2097.00,
        paymentMethod: "Corporate Invoice",
        status: "Processing",
        notes: "Color-accurate high resolution monitors for design sprint workspace."
      },
      {
        id: "PO-104",
        invoiceNumber: "INV-2026-804",
        item: "Figma Organization Annual License (15 Seats)",
        category: "Software License",
        purchaseDate: "2026-08-18",
        renewalDate: "2027-08-18",
        quantity: 15,
        billingCycle: "Annual",
        buyerName: "Priya Sharma",
        buyerEmail: "priya@company.com",
        department: "Marketing",
        amount: 1350.00,
        paymentMethod: "PayPal / Corporate",
        status: "Completed",
        notes: "Design and marketing team collaboration workspace subscription."
      },
      {
        id: "PO-105",
        invoiceNumber: "INV-2026-805",
        item: "Ergonomic Standing Desks & Chairs (Qty 4)",
        category: "Office Asset",
        purchaseDate: "2026-08-19",
        renewalDate: "2031-08-19",
        quantity: 4,
        billingCycle: "One-Time",
        buyerName: "Elena Rostova",
        buyerEmail: "elena@company.com",
        department: "Operations",
        amount: 1890.00,
        paymentMethod: "Bank Wire Transfer",
        status: "Pending Approval",
        notes: "Ergonomic workplace setup for new office expansion floor."
      }
    ];

    let stored = localStorage.getItem('apex_purchase_orders');
    let purchases = stored ? JSON.parse(stored) : defaultPurchases;
    if (!stored) {
      localStorage.setItem('apex_purchase_orders', JSON.stringify(purchases));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      purchases = purchases.filter(p => 
        (p.item && p.item.toLowerCase().includes(q)) || 
        (p.id && p.id.toLowerCase().includes(q)) || 
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.buyerName && p.buyerName.toLowerCase().includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q))
      );
    }
    if (filters.status && filters.status !== 'All') {
      purchases = purchases.filter(p => p.status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.category && filters.category !== 'All') {
      purchases = purchases.filter(p => p.category.toLowerCase() === filters.category.toLowerCase());
    }

    const totalSpend = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedCount = purchases.filter(p => p.status === 'Completed').length;
    const pendingCount = purchases.filter(p => p.status === 'Pending Approval' || p.status === 'Processing').length;

    return {
      count: purchases.length,
      purchases,
      stats: { totalSpend, completedCount, pendingCount, totalOrders: purchases.length }
    };
  },

  // Create Purchase / Order
  async createPurchase(purchaseData) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseData)
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || 'Failed to complete purchase' };
        }
        return data;
      } catch (err) {
        console.warn('API error creating purchase:', err);
      }
    }

    // Local fallback
    const res = await this.getPurchases();
    const purchases = res.purchases;
    const newId = `PO-${100 + purchases.length + 1}`;
    const newInvoice = `INV-2026-${800 + purchases.length + 1}`;

    const newPurchase = {
      id: newId,
      invoiceNumber: newInvoice,
      item: purchaseData.item,
      category: purchaseData.category || 'Software License',
      purchaseDate: purchaseData.purchaseDate,
      renewalDate: purchaseData.renewalDate || purchaseData.purchaseDate,
      quantity: Number(purchaseData.quantity) || 1,
      billingCycle: purchaseData.billingCycle || 'One-Time',
      buyerName: purchaseData.buyerName || 'Alex Johnson',
      buyerEmail: purchaseData.buyerEmail || 'employee@company.com',
      department: purchaseData.department || 'Engineering',
      amount: Number(purchaseData.amount),
      paymentMethod: purchaseData.paymentMethod || 'Corporate Credit Card',
      status: purchaseData.status || 'Completed',
      notes: purchaseData.notes || 'Order placed via ApexHR Store.'
    };

    purchases.unshift(newPurchase);
    localStorage.setItem('apex_purchase_orders', JSON.stringify(purchases));
    return { message: 'Purchase recorded locally', purchase: newPurchase };
  },

  // Update Purchase Status
  async updatePurchaseStatus(purchaseId, status) {
    if (this.isServerOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('API error updating purchase status:', err);
      }
    }

    // Local fallback
    const res = await this.getPurchases();
    const purchases = res.purchases;
    const target = purchases.find(p => p.id === purchaseId);
    if (target) {
      target.status = status;
      localStorage.setItem('apex_purchase_orders', JSON.stringify(purchases));
      return { message: `Purchase ${purchaseId} status updated to ${status}`, purchase: target };
    }
    return { error: 'Purchase order not found' };
  }
};

// Initialize server health check immediately on page load
ApexAPI.checkHealth();
window.ApexAPI = ApexAPI;
