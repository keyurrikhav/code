/**
 * ApexHR REST API Server
 * Built with native Node.js HTTP module for zero-dependency portability & performance.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

// --- Initial Seed Data ---
const DEFAULT_EMPLOYEES = [
  { id: 'EMP-101', name: 'Alex Johnson', email: 'employee@company.com', dept: 'Engineering', role: 'Software Engineer', allowance: 18, status: 'Active' },
  { id: 'EMP-102', name: 'Priya Sharma', email: 'priya@company.com', dept: 'Marketing', role: 'Growth Strategist', allowance: 20, status: 'Active' },
  { id: 'EMP-103', name: 'Marcus Vance', email: 'marcus@company.com', dept: 'Product Design', role: 'UI/UX Designer', allowance: 15, status: 'Active' },
  { id: 'EMP-104', name: 'David Kim', email: 'david@company.com', dept: 'QA Engineering', role: 'Quality Analyst', allowance: 18, status: 'Active' },
  { id: 'EMP-105', name: 'Elena Rostova', email: 'elena@company.com', dept: 'Operations', role: 'Project Specialist', allowance: 22, status: 'Active' },
];

const DEFAULT_LEAVES = [
  {
    id: 'LR-901',
    empId: 'EMP-101',
    empName: 'Alex Johnson',
    empEmail: 'employee@company.com',
    type: 'Annual Vacation',
    startDate: '2026-08-05',
    endDate: '2026-08-09',
    days: 5,
    reason: 'Summer family vacation trip.',
    status: 'Pending',
    submittedAt: '2026-07-26'
  },
  {
    id: 'LR-902',
    empId: 'EMP-103',
    empName: 'Marcus Vance',
    empEmail: 'marcus@company.com',
    type: 'Casual Leave',
    startDate: '2026-07-29',
    endDate: '2026-07-30',
    days: 2,
    reason: 'Attending family event.',
    status: 'Pending',
    submittedAt: '2026-07-27'
  },
  {
    id: 'LR-903',
    empId: 'EMP-102',
    empName: 'Priya Sharma',
    empEmail: 'priya@company.com',
    type: 'Sick Leave',
    startDate: '2026-07-20',
    endDate: '2026-07-22',
    days: 3,
    reason: 'Fever and viral infection.',
    status: 'Approved',
    submittedAt: '2026-07-19'
  },
  {
    id: 'LR-904',
    empId: 'EMP-104',
    empName: 'David Kim',
    empEmail: 'david@company.com',
    type: 'Emergency Leave',
    startDate: '2026-07-15',
    endDate: '2026-07-15',
    days: 1,
    reason: 'Home maintenance urgent repair.',
    status: 'Rejected',
    submittedAt: '2026-07-14'
  }
];

// --- Data Persistence Helpers ---
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading data file, using defaults:', err.message);
  }
  const initial = { employees: DEFAULT_EMPLOYEES, leaves: DEFAULT_LEAVES };
  saveData(initial);
  return initial;
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving data file:', err.message);
  }
}

// In-Memory state synced with data.json
let store = loadData();

// --- CORS & JSON Helpers ---
function sendJSON(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(body));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// --- Request Router ---
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // 1. Health Check Endpoint
    if (pathname === '/api/health' && method === 'GET') {
      return sendJSON(res, 200, {
        status: 'online',
        service: 'ApexHR REST API Server',
        version: 'v2.4',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        endpointsCount: 10
      });
    }

    // 2. Authentication Endpoint
    if (pathname === '/api/auth/login' && method === 'POST') {
      const payload = await parseRequestBody(req);
      const { email, password } = payload;

      if (!email) {
        return sendJSON(res, 400, { error: 'Email is required' });
      }

      if (email === 'admin@company.com') {
        return sendJSON(res, 200, {
          success: true,
          message: 'Admin Authentication Successful',
          token: `apex_jwt_admin_${Date.now()}`,
          user: {
            name: 'Sarah Connor',
            email: 'admin@company.com',
            role: 'admin',
            title: 'HR Director'
          }
        });
      }

      const employee = store.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
      if (employee) {
        return sendJSON(res, 200, {
          success: true,
          message: 'Employee Authentication Successful',
          token: `apex_jwt_emp_${Date.now()}`,
          user: {
            name: employee.name,
            email: employee.email,
            role: 'employee',
            empId: employee.id,
            dept: employee.dept,
            title: employee.role,
            allowance: employee.allowance
          }
        });
      }

      // Default demo fallback for any email
      return sendJSON(res, 200, {
        success: true,
        message: 'Employee Authentication Successful (Demo)',
        token: `apex_jwt_emp_${Date.now()}`,
        user: {
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          email: email,
          role: 'employee',
          empId: 'EMP-999',
          dept: 'Engineering',
          title: 'Team Member',
          allowance: 18
        }
      });
    }

    // 3. Employee Directory Endpoints
    if (pathname === '/api/employees' && method === 'GET') {
      let result = [...store.employees];
      const search = parsedUrl.query.search;
      const dept = parsedUrl.query.dept;

      if (search) {
        const q = search.toLowerCase();
        result = result.filter(e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
      }
      if (dept) {
        result = result.filter(e => e.dept.toLowerCase() === dept.toLowerCase());
      }

      return sendJSON(res, 200, {
        count: result.length,
        employees: result
      });
    }

    if (pathname.startsWith('/api/employees/') && method === 'GET') {
      const empId = pathname.replace('/api/employees/', '');
      const employee = store.employees.find(e => e.id === empId);

      if (!employee) {
        return sendJSON(res, 404, { error: `Employee ${empId} not found` });
      }

      const empLeaves = store.leaves.filter(l => l.empId === empId);
      return sendJSON(res, 200, {
        employee,
        leaveHistory: empLeaves
      });
    }

    if (pathname === '/api/employees' && method === 'POST') {
      const payload = await parseRequestBody(req);
      if (!payload.name || !payload.email || !payload.dept) {
        return sendJSON(res, 400, { error: 'Missing required fields (name, email, dept)' });
      }

      const newId = `EMP-${100 + store.employees.length + 1}`;
      const newEmployee = {
        id: payload.id || newId,
        name: payload.name,
        email: payload.email,
        dept: payload.dept,
        role: payload.role || 'Staff Member',
        allowance: payload.allowance || 18,
        status: payload.status || 'Active'
      };

      store.employees.push(newEmployee);
      saveData(store);

      return sendJSON(res, 201, {
        message: 'Employee added successfully',
        employee: newEmployee
      });
    }

    // 4. Leave Management Endpoints
    if (pathname === '/api/leaves' && method === 'GET') {
      let result = [...store.leaves];
      const status = parsedUrl.query.status;
      const empId = parsedUrl.query.empId;

      if (status && status !== 'All') {
        result = result.filter(l => l.status.toLowerCase() === status.toLowerCase());
      }
      if (empId) {
        result = result.filter(l => l.empId === empId);
      }

      return sendJSON(res, 200, {
        count: result.length,
        leaves: result
      });
    }

    if (pathname === '/api/leaves' && method === 'POST') {
      const payload = await parseRequestBody(req);

      if (!payload.type || !payload.startDate || !payload.endDate || !payload.reason) {
        return sendJSON(res, 400, { error: 'Missing required leave fields (type, startDate, endDate, reason)' });
      }

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Rule 1: No Past Dates Allowed
      if (payload.startDate < todayStr) {
        return sendJSON(res, 400, { error: `Start date (${payload.startDate}) cannot be in the past (minimum is ${todayStr})` });
      }

      // Rule 2: End date must be >= start date
      if (payload.endDate < payload.startDate) {
        return sendJSON(res, 400, { error: 'End date must be on or after start date' });
      }

      // Calculate Days
      const [y1, m1, d1] = payload.startDate.split('-').map(Number);
      const [y2, m2, d2] = payload.endDate.split('-').map(Number);
      const startD = new Date(y1, m1 - 1, d1);
      const endD = new Date(y2, m2 - 1, d2);
      const calendarDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let daysCalculated = calendarDays;
      if (calendarDays === 1 && payload.days && Number(payload.days) === 0.5) {
        daysCalculated = 0.5;
      }

      // Rule 3: Maximum 7 Days Limit
      if (daysCalculated > 7) {
        return sendJSON(res, 400, { error: `Leave duration (${daysCalculated} days) cannot exceed policy limit of 7 consecutive days` });
      }

      const empId = payload.empId || 'EMP-101';

      // Rule 4: Overlapping Date Check
      const overlappingLeave = store.leaves.find(l => 
        l.empId === empId && 
        ['Pending', 'Approved'].includes(l.status) && 
        !(payload.endDate < l.startDate || payload.startDate > l.endDate)
      );

      if (overlappingLeave) {
        return sendJSON(res, 409, { 
          error: `Overlapping ${overlappingLeave.status} leave request (${overlappingLeave.type}: ${overlappingLeave.startDate} to ${overlappingLeave.endDate}) already exists for this employee` 
        });
      }

      // Rule 5: Leave Balance Quota Check
      const employee = store.employees.find(e => e.id === empId);
      const totalAllowance = employee ? (employee.allowance || 18) : 18;
      const approvedDays = store.leaves
        .filter(l => l.empId === empId && l.status === 'Approved')
        .reduce((sum, l) => sum + Number(l.days || 0), 0);
      const availableQuota = Math.max(0, totalAllowance - approvedDays);

      if (daysCalculated > availableQuota) {
        return sendJSON(res, 400, { 
          error: `Insufficient leave quota. Requested: ${daysCalculated} day(s), Available: ${availableQuota} day(s)` 
        });
      }

      const newLeave = {
        id: `LR-${Math.floor(100 + Math.random() * 900)}`,
        empId: empId,
        empName: payload.empName || (employee ? employee.name : 'Alex Johnson'),
        empEmail: payload.empEmail || (employee ? employee.email : 'employee@company.com'),
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
        days: daysCalculated,
        portion: payload.portion || '1.0',
        reason: payload.reason,
        status: 'Pending',
        submittedAt: todayStr
      };

      store.leaves.unshift(newLeave);
      saveData(store);

      return sendJSON(res, 201, {
        message: 'Leave request submitted successfully',
        leave: newLeave
      });
    }

    if (pathname.match(/^\/api\/leaves\/([A-Za-z0-9-]+)\/status$/) && method === 'PATCH') {
      const matches = pathname.match(/^\/api\/leaves\/([A-Za-z0-9-]+)\/status$/);
      const leaveId = matches[1];
      const payload = await parseRequestBody(req);

      if (!payload.status || !['Approved', 'Rejected', 'Pending'].includes(payload.status)) {
        return sendJSON(res, 400, { error: 'Invalid or missing status (must be Approved, Rejected, or Pending)' });
      }

      const leaveIndex = store.leaves.findIndex(l => l.id === leaveId);
      if (leaveIndex === -1) {
        return sendJSON(res, 404, { error: `Leave request ${leaveId} not found` });
      }

      store.leaves[leaveIndex].status = payload.status;
      store.leaves[leaveIndex].updatedAt = new Date().toISOString();
      saveData(store);

      return sendJSON(res, 200, {
        message: `Leave request ${leaveId} marked as ${payload.status}`,
        leave: store.leaves[leaveIndex]
      });
    }

    if (pathname.startsWith('/api/leaves/') && method === 'DELETE') {
      const leaveId = pathname.replace('/api/leaves/', '');
      const leaveIndex = store.leaves.findIndex(l => l.id === leaveId);

      if (leaveIndex === -1) {
        return sendJSON(res, 404, { error: `Leave request ${leaveId} not found` });
      }

      const deleted = store.leaves.splice(leaveIndex, 1)[0];
      saveData(store);

      return sendJSON(res, 200, {
        message: `Leave request ${leaveId} deleted successfully`,
        leave: deleted
      });
    }

    // 5. Dashboard Statistics Endpoint
    if (pathname === '/api/stats' && method === 'GET') {
      const totalEmployees = store.employees.length;
      const pendingRequests = store.leaves.filter(l => l.status === 'Pending').length;
      const approvedLeaves = store.leaves.filter(l => l.status === 'Approved').length;
      const rejectedLeaves = store.leaves.filter(l => l.status === 'Rejected').length;

      return sendJSON(res, 200, {
        totalEmployees,
        pendingRequests,
        approvedLeaves,
        rejectedLeaves,
        totalLeaves: store.leaves.length
      });
    }

    // 404 Endpoint Not Found
    return sendJSON(res, 404, {
      error: 'Endpoint not found',
      requestedPath: pathname,
      method
    });

  } catch (err) {
    console.error('API Server Error:', err);
    return sendJSON(res, 500, {
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 ApexHR REST API Server Running on port ${PORT}`);
  console.log(` 🔗 URL: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
