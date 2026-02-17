const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_PUBLIC_BASE_URL = API_BASE_URL.replace(/\/?api$/, '');

export const getPublicAssetUrl = (assetPath = '') => {
  if (!assetPath) {
    return '';
  }
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${API_PUBLIC_BASE_URL}${normalizedPath}`;
};

// Get token from localStorage
export const getToken = () => localStorage.getItem('token');

// Set token to localStorage
export const setToken = (token) => localStorage.setItem('token', token);

// Remove token from localStorage
export const removeToken = () => localStorage.removeItem('token');

// Get user from localStorage
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Set user to localStorage
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// Remove user from localStorage
export const removeUser = () => localStorage.removeItem('user');

const emitAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('rg-auth-changed'));
  }
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  const isFormData = options.body instanceof FormData;

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('📡 API Request:', url);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    const data = await response.json();
    
    console.log('📡 Response data:', data);
    console.log('📡 Data structure:', {
      hasSuccess: 'success' in data,
      hasData: 'data' in data,
      hasCount: 'count' in data,
      dataType: typeof data.data,
      dataLength: Array.isArray(data.data) ? data.data.length : 'not array'
    });

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      emitAuthChange();
    }
    return data;
  },

  register: async (userData) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      emitAuthChange();
    }
    return data;
  },

  logout: () => {
    removeToken();
    removeUser();
    emitAuthChange();
  },

  getMe: () => apiRequest('/auth/me'),

  updateProfile: async (profileData) => {
    const data = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (data.data) {
      setUser(data.data);
      emitAuthChange();
    }
    return data;
  },

  changePassword: async (passwordData) => {
    const data = await apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
    return data;
  },

  uploadProfileImage: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('profileImage', file);

    const response = await fetch(`${API_BASE_URL}/auth/profile-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload profile image');
    }
    if (data.data) {
      setUser(data.data);
      emitAuthChange();
    }
    return data;
  },
};

// Events API
export const eventsAPI = {
  getAll: () => apiRequest('/events'),
  getById: (id) => apiRequest(`/events/${id}`),
  create: (eventData) => apiRequest('/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),
  update: (id, eventData) => apiRequest(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  }),
  delete: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
  join: (id, participantData) => apiRequest(`/events/${id}/join`, {
    method: 'POST',
    body: JSON.stringify(participantData),
  }),
};

// Employees API
export const employeesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/employees${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => apiRequest(`/employees/${id}`),
  create: (employeeData) => apiRequest('/employees', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  }),
  update: (id, employeeData) => apiRequest(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(employeeData),
  }),
  delete: (id) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
  resetPassword: (id, passwordData) => apiRequest(`/employees/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),
  getStats: () => apiRequest('/employees/stats'),
  updateStatus: (id, statusData) => apiRequest(`/employees/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(statusData),
  }),
  updateExitDate: (id, exitDateData) => apiRequest(`/employees/${id}/exit-date`, {
    method: 'PATCH',
    body: JSON.stringify(exitDateData),
  }),
  exportJoinings: async (params = {}) => {
    const token = getToken();
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/employees/export/joinings${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      let message = 'Failed to export joining data';
      try {
        const error = await response.json();
        if (error?.message) {
          message = error.message;
        }
      } catch {
        // Ignore JSON parse errors and fall back to default message
      }
      throw new Error(message);
    }

    return response.blob();
  },
  exportList: async (params = {}) => {
    const token = getToken();
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/employees/export/list${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      let message = 'Failed to export employee list';
      try {
        const error = await response.json();
        message = error.message || message;
      } catch {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    return response.blob();
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => apiRequest('/dashboard/stats'),
};

// Feed API
export const feedAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/feed${queryString ? `?${queryString}` : ''}`);
  },
  create: (feedData) => apiRequest('/feed', {
    method: 'POST',
    body: feedData instanceof FormData ? feedData : JSON.stringify(feedData),
  }),
  like: (id) => apiRequest(`/feed/${id}/like`, { method: 'POST' }),
  comment: (id, comment) => apiRequest(`/feed/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify(comment),
  }),
};

// Recognition API
export const recognitionAPI = {
  getAll: () => apiRequest('/recognition'),
  create: (recognitionData) => apiRequest('/recognition', {
    method: 'POST',
    body: JSON.stringify(recognitionData),
  }),
  like: (id) => apiRequest(`/recognition/${id}/like`, { method: 'POST' }),
};

// Polls API
export const pollsAPI = {
  getAll: () => apiRequest('/polls'),
  getById: (id) => apiRequest(`/polls/${id}`),
  create: (pollData) => apiRequest('/polls', {
    method: 'POST',
    body: JSON.stringify(pollData),
  }),
  update: (id, pollData) => apiRequest(`/polls/${id}`, {
    method: 'PUT',
    body: JSON.stringify(pollData),
  }),
  delete: (id) => apiRequest(`/polls/${id}`, { method: 'DELETE' }),
  vote: (id, payload) => apiRequest(`/polls/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

// Chat API
export const chatAPI = {
  getAll: () => apiRequest('/chat'),
  sendMessage: (messageData) => apiRequest('/chat/send', {
    method: 'POST',
    body: JSON.stringify(messageData),
  }),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance${queryString ? `?${queryString}` : ''}`);
  },
  checkIn: (locationData) => apiRequest('/attendance/check-in', { 
    method: 'POST',
    body: JSON.stringify({ locationData })
  }),
  checkOut: (locationData) => apiRequest('/attendance/check-out', { 
    method: 'POST',
    body: JSON.stringify({ locationData })
  }),
  getStats: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/stats?${queryString}`);
  },
  getLocationConfig: () => apiRequest('/attendance/location-config'),
  syncDeviceLogs: (params = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val === undefined || val === null || val === '') return acc;
        acc[key] = val;
        return acc;
      }, {})
    ).toString();
    return apiRequest(`/attendance/sync-device${queryString ? `?${queryString}` : ''}`, {
      method: 'POST'
    });
  },
};

// Leave API
export const leaveAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/leaves${queryString ? `?${queryString}` : ''}`);
  },
  create: (leaveData) => apiRequest('/leaves', {
    method: 'POST',
    body: JSON.stringify(leaveData),
  }),
  updateStatus: (id, statusData) => apiRequest(`/leaves/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusData),
  }),
  syncToAttendance: () => apiRequest('/leaves/sync-attendance', {
    method: 'POST',
  }),
};

// Departments API
export const departmentsAPI = {
  getAll: () => apiRequest('/departments'),
  create: (deptData) => apiRequest('/departments', {
    method: 'POST',
    body: JSON.stringify(deptData),
  }),
  update: (id, deptData) => apiRequest(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(deptData),
  }),
};

// Payroll API
export const payrollAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payroll${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => apiRequest(`/payroll/${id}`),
  create: (payrollData) => apiRequest('/payroll', {
    method: 'POST',
    body: JSON.stringify(payrollData),
  }),
  update: (id, payrollData) => apiRequest(`/payroll/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payrollData),
  }),
  process: (id) => apiRequest(`/payroll/${id}/process`, { method: 'POST' }),
};

// Payslips API
export const payslipsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payslips${queryString ? `?${queryString}` : ''}`);
  },
  upload: ({ employeeId, month, year, file, remarks }) => {
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('month', month);
    formData.append('year', year);
    if (remarks) {
      formData.append('remarks', remarks);
    }
    formData.append('payslip', file);

    return apiRequest('/payslips', {
      method: 'POST',
      body: formData,
    });
  },
  download: async (id, options = {}) => {
    const token = getToken();
    const query = options.preview ? '?mode=preview' : '';
    const response = await fetch(`${API_BASE_URL}/payslips/${id}/download${query}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let errorMessage = 'Failed to download payslip';
      try {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch (parseError) {
        console.error('Payslip download parse error:', parseError);
      }
      throw new Error(errorMessage);
    }

    return response.blob();
  },
  delete: (id) => apiRequest(`/payslips/${id}`, { method: 'DELETE' }),
};

// Employment Documents API
export const employeeDocumentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/employee-documents${query ? `?${query}` : ''}`);
  },
  upload: ({ employeeId, docType, file }) => {
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('docType', docType);
    formData.append('document', file);

    return apiRequest('/employee-documents', {
      method: 'POST',
      body: formData,
    });
  },
  download: async (id, options = {}) => {
    const token = getToken();
    const query = options.preview ? '?mode=preview' : '';
    const response = await fetch(`${API_BASE_URL}/employee-documents/${id}/download${query}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let errorMessage = 'Failed to download document';
      try {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch (parseError) {
        console.error('Document download parse error:', parseError);
      }
      throw new Error(errorMessage);
    }

    return response.blob();
  },
};

// Team API (Reporting Manager Features)
export const teamAPI = {
  // Get all team members reporting to the current manager
  getTeamMembers: () => apiRequest('/team/members'),
  
  // Get team statistics (present, absent, on-leave, pending leaves, attendance rate)
  getTeamStats: () => apiRequest('/team/stats'),
  
  // Get team attendance records
  getTeamAttendance: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/team/attendance${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get team leave requests
  getTeamLeaves: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/team/leaves${queryString ? `?${queryString}` : ''}`);
  },
  
  // Bulk approve/reject multiple leave requests
  bulkApproveLeaves: (bulkData) => apiRequest('/team/leaves/bulk-approve', {
    method: 'POST',
    body: JSON.stringify(bulkData),
  }),
  
  // Get team performance report (attendance rate, working hours, leaves per employee)
  getTeamPerformance: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/team/performance${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get all managers for dropdown selection (L1+)
  getManagers: () => apiRequest('/team/managers'),
  
  // Get team calendar view (month calendar with daily status)
  getTeamCalendar: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/team/calendar${queryString ? `?${queryString}` : ''}`);
  },
};

// Assets API
export const assetsAPI = {
  // Get all assets (filtered by user level on backend)
  getAll: () => apiRequest('/assets'),
  
  // Add asset to an employee
  addAsset: (employeeId, assetData) => apiRequest(`/assets/${employeeId}`, {
    method: 'POST',
    body: JSON.stringify(assetData),
  }),
  
  // Revoke asset from an employee
  revokeAsset: (employeeId, assetId) => apiRequest(`/assets/${employeeId}/${assetId}/revoke`, {
    method: 'PUT',
  }),
};

export const policiesAPI = {
  acknowledge: (payload) =>
    apiRequest('/policies/acknowledge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export default {
  auth: authAPI,
  events: eventsAPI,
  employees: employeesAPI,
  dashboard: dashboardAPI,
  feed: feedAPI,
  recognition: recognitionAPI,
  polls: pollsAPI,
  chat: chatAPI,
  attendance: attendanceAPI,
  leave: leaveAPI,
  departments: departmentsAPI,
  payroll: payrollAPI,
  payslips: payslipsAPI,
  team: teamAPI,
  assets: assetsAPI,
  employeeDocuments: employeeDocumentsAPI,
  policies: policiesAPI,
};
