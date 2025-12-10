import { useState, useEffect } from 'react';
import { employeesAPI, departmentsAPI, teamAPI, assetsAPI, employeeDocumentsAPI } from '../services/api';
import { getUser } from '../services/api';
import './Employees.css';

// CSS to remove number input spinners and fix dropdown issues
const styles = `
  input[type="number"].no-spinner::-webkit-outer-spin-button,
  input[type="number"].no-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"].no-spinner {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .table-hover tbody tr:hover {
    position: relative;
    z-index: 1;
  }
  .dropdown-menu {
    position: absolute !important;
    z-index: 1060 !important;
    display: none;
  }
  .dropdown-menu.show {
    display: block !important;
  }
`;

const createEmptyAddress = () => ({
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
});

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [canViewSensitiveData, setCanViewSensitiveData] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentEmployee, setDocumentEmployee] = useState(null);
  const [documentRecords, setDocumentRecords] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentForm, setDocumentForm] = useState({ docType: '', file: null });
  const [documentError, setDocumentError] = useState('');
  const [documentInputKey, setDocumentInputKey] = useState(Date.now());
  
  const currentUser = getUser();
  const canManage = currentUser?.managementLevel >= 2; // L2, L3, and L4 can manage employees
  const canManageDocuments = currentUser?.managementLevel >= 3;
  const formatAddress = (addressObj) => {
    if (!addressObj) return 'N/A';
    const parts = [
      addressObj.street,
      addressObj.city,
      addressObj.state,
      addressObj.zipCode,
      addressObj.country,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'N/A';
  };

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    password: '',
    phone: '',
    panCard: '',
    aadharCard: '',
    department: '',
    position: '',
    reportingManager: '',
    managementLevel: 0,
    canApproveLeaves: false,
    canManageAttendance: false,
    saturdayWorking: false,
    dateOfBirth: '',
    joiningDate: new Date().toISOString().split('T')[0],
    assetsAllocated: '',
    salary: {
      grossSalary: '',
    },
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifscCode: '',
    },
    complianceDetails: {
      uanNumber: '',
      pfNumber: '',
      esiNumber: '',
    },
    currentAddress: createEmptyAddress(),
    permanentAddress: createEmptyAddress(),
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      // Store permission flag from backend
      if (response.canViewSensitiveData !== undefined) {
        setCanViewSensitiveData(response.canViewSensitiveData);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await teamAPI.getManagers();
      setManagers(response.data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
      // Set empty array if fetch fails - this is okay, user can still create employees without RM
      setManagers([]);
    }
  };

  const fetchEmployeeDocuments = async (employeeId) => {
    setDocumentLoading(true);
    setDocumentError('');
    try {
      const response = await employeeDocumentsAPI.getAll({ employeeId });
      setDocumentRecords(response.data || []);
      setDocumentTypes(response.docTypes || []);
      const firstType = response.docTypes?.[0]?.key || '';
      setDocumentForm((prev) => ({
        ...prev,
        docType: prev.docType && response.docTypes?.some((type) => type.key === prev.docType)
          ? prev.docType
          : firstType,
        file: null,
      }));
      setDocumentInputKey(Date.now());
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocumentError(error.message || 'Failed to load documents');
      setDocumentRecords([]);
      setDocumentTypes([]);
    } finally {
      setDocumentLoading(false);
    }
  };

  const openDocumentModal = (employee) => {
    setDocumentEmployee(employee);
    setShowDocumentModal(true);
    fetchEmployeeDocuments(employee._id);
  };

  const closeDocumentModal = () => {
    setShowDocumentModal(false);
    setDocumentEmployee(null);
    setDocumentRecords([]);
    setDocumentTypes([]);
    setDocumentForm({ docType: '', file: null });
    setDocumentError('');
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!documentEmployee) {
      return;
    }

    if (!documentForm.docType) {
      setDocumentError('Select a document type before uploading');
      return;
    }

    if (!documentForm.file) {
      setDocumentError('Attach a PDF file to upload');
      return;
    }

    setDocumentUploading(true);
    setDocumentError('');
    try {
      await employeeDocumentsAPI.upload({
        employeeId: documentEmployee._id,
        docType: documentForm.docType,
        file: documentForm.file,
      });
      alert('Document uploaded successfully!');
      setDocumentForm((prev) => ({ ...prev, file: null }));
      setDocumentInputKey(Date.now());
      fetchEmployeeDocuments(documentEmployee._id);
    } catch (error) {
      console.error('Document upload failed:', error);
      setDocumentError(error.message || 'Failed to upload document');
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDocumentDownload = async (record) => {
    try {
      const blob = await employeeDocumentsAPI.download(record._id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.fileName || `${record.docType}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Failed to download document');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up the form data before sending
      const submitData = {
        ...formData,
        // Convert empty string to null for reportingManager
        reportingManager: formData.reportingManager || null,
        // Ensure managementLevel is a number
        managementLevel: parseInt(formData.managementLevel) || 0,
      };
      submitData.address = submitData.currentAddress;

      // Remove assetsAllocated from employee data - we'll handle it separately
      const assetToAllocate = submitData.assetsAllocated;
      delete submitData.assetsAllocated;

      let employeeId;
      if (editEmployee) {
        await employeesAPI.update(editEmployee._id, submitData);
        employeeId = editEmployee._id;
        alert('Employee updated successfully!');
      } else {
        const result = await employeesAPI.create(submitData);
        employeeId = result.data._id;
        alert('Employee created successfully!');
      }

      // Add asset if provided
      if (assetToAllocate && assetToAllocate.trim()) {
        try {
          await assetsAPI.addAsset(employeeId, { assetName: assetToAllocate.trim() });
        } catch (assetError) {
          console.error('Failed to add asset:', assetError);
          alert(`Employee saved, but asset allocation failed: ${assetError.message}`);
        }
      }

      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      alert(error.message || 'Operation failed');
    }
  };

  const handleEdit = (employee) => {
    setEditEmployee(employee);
    const safeCurrentAddress = { ...(employee.currentAddress || employee.address || createEmptyAddress()) };
    const safePermanentAddress = { ...(employee.permanentAddress || employee.address || createEmptyAddress()) };
    setFormData({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      personalEmail: employee.personalEmail || '',
      password: '',
      phone: employee.phone || '',
      panCard: employee.panCard || '',
      aadharCard: employee.aadharCard || '',
      department: employee.department?._id || '',
      position: employee.position || '',
      reportingManager: employee.reportingManager?._id || '',
      managementLevel: employee.managementLevel || 0,
      canApproveLeaves: employee.canApproveLeaves || false,
      canManageAttendance: employee.canManageAttendance || false,
      saturdayWorking: employee.saturdayWorking || false,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
      // Only load sensitive data if user has permission
      salary: canViewSensitiveData ? (employee.salary || { grossSalary: '' }) : { grossSalary: '' },
      bankDetails: canViewSensitiveData ? (employee.bankDetails || { accountNumber: '', bankName: '', ifscCode: '' }) : { accountNumber: '', bankName: '', ifscCode: '' },
      complianceDetails: canViewSensitiveData ? (employee.complianceDetails || { uanNumber: '', pfNumber: '', esiNumber: '' }) : { uanNumber: '', pfNumber: '', esiNumber: '' },
      currentAddress: safeCurrentAddress,
      permanentAddress: safePermanentAddress,
      assetsAllocated: '',
    });
    setShowModal(true);
  };

  const handleView = async (employee) => {
    try {
      // Fetch full employee details from API to get permission-filtered data
      const response = await employeesAPI.getById(employee._id);
      setViewEmployee(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      alert('Failed to load employee details');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeesAPI.delete(id);
        alert('Employee deleted successfully!');
        fetchEmployees();
      } catch (error) {
        alert(error.message || 'Delete failed');
      }
    }
  };

  const handleStatusChange = async (employeeId, status, reason) => {
    const statusText = status === 'active' ? 'activate' : status === 'on-leave' ? 'suspend' : 'inactivate';
    const confirmMessage = `Are you sure you want to ${statusText} this employee?${status === 'inactive' ? '\n\nNote: Inactive users cannot login to the system.' : ''}`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await employeesAPI.updateStatus(employeeId, { 
          status, 
          isActive: status === 'active',
          reason 
        });
        alert(`Employee ${statusText}d successfully!`);
        fetchEmployees();
      } catch (error) {
        alert(error.message || `Failed to ${statusText} employee`);
      }
    }
  };

  const resetForm = () => {
    setEditEmployee(null);
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: '',
      password: '',
      phone: '',
      panCard: '',
      aadharCard: '',
      department: '',
      position: '',
      reportingManager: '',
      managementLevel: 0,
      canApproveLeaves: false,
      canManageAttendance: false,
      saturdayWorking: false,
      dateOfBirth: '',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: { basic: 0, allowances: 0, deductions: 0 },
      currentAddress: createEmptyAddress(),
      permanentAddress: createEmptyAddress(),
      assetsAllocated: '',
    });
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.personalEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || emp.department?._id === filterDept;
    const matchesRole = !filterRole || emp.role === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="container-fluid py-4 employees-page">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Employee Management</h2>
          <p className="text-muted">Manage employee information and records</p>
        </div>
        {canManage && (
          <div className="col-auto">
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              <i className="bi bi-plus-circle me-2"></i>Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSearchTerm(''); setFilterDept(''); setFilterRole(''); }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive employees-table-wrapper" style={{ overflow: 'visible' }}>
            <table className="table table-hover align-middle employees-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Work Email</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Level</th>
                  <th>Reporting Manager</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(employee => (
                  <tr 
                    key={employee._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleView(employee)}
                    title="Click to view details"
                  >
                    <td className="fw-bold" data-label="Employee ID">{employee.employeeId}</td>
                    <td data-label="Name">
                      <div className="d-flex align-items-center">
                        <img
                          src={employee.profileImage || '/assets/client.jpg'}
                          alt={employee.firstName}
                          className="rounded-circle me-2"
                          style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                        />
                        <span>{employee.firstName} {employee.lastName}</span>
                      </div>
                    </td>
                    <td data-label="Work Email">{employee.email}</td>
                    <td data-label="Department">{employee.department?.name || 'N/A'}</td>
                    <td data-label="Position">{employee.position || 'N/A'}</td>
                    <td data-label="Level">
                      <span className={`badge ${
                        employee.managementLevel === 4 ? 'bg-dark' :
                        employee.managementLevel === 3 ? 'bg-danger' :
                        employee.managementLevel === 2 ? 'bg-warning' :
                        employee.managementLevel === 1 ? 'bg-info' : 'bg-primary'
                      }`}>
                        L{employee.managementLevel} - {
                          employee.managementLevel === 4 ? 'CEO/OWNER' :
                          employee.managementLevel === 3 ? 'ADMIN' :
                          employee.managementLevel === 2 ? 'SR. MANAGER' :
                          employee.managementLevel === 1 ? 'MANAGER' : 'EMPLOYEE'
                        }
                      </span>
                    </td>
                    <td data-label="Reporting Manager">
                      {employee.reportingManager ? (
                        <span className="text-muted small">
                          {employee.reportingManager.firstName} {employee.reportingManager.lastName}
                        </span>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${
                        employee.status === 'active' ? 'bg-success' :
                        employee.status === 'on-leave' ? 'bg-warning' : 'bg-secondary'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    {canManage && (
                      <td
                        data-label="Actions"
                        className="employee-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="d-flex gap-1 employee-card-actions">
                          {/* L2 can edit L0/L1 only, L3 can edit up to L2, L4 can edit anyone */}
                          {(currentUser?.managementLevel === 4 ||
                            currentUser?.managementLevel === 3 || 
                            (currentUser?.managementLevel === 2 && 
                             employee.managementLevel < 2 && 
                             employee._id !== currentUser?.id)) && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEdit(employee)}
                              title="Edit Employee"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}

                          {canManageDocuments && (
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => openDocumentModal(employee)}
                              title="Manage employment documents"
                            >
                              <i className="bi bi-folder-check"></i>
                            </button>
                          )}
                          
                          {/* L3 and L4 can manage status (L3 cannot manage L3/L4 status) */}
                          {(currentUser?.managementLevel === 4 || 
                            (currentUser?.managementLevel === 3 && employee.managementLevel < 3)) && 
                            employee._id !== currentUser?.id && (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button 
                                className="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                type="button" 
                                data-bs-toggle="dropdown"
                                data-bs-offset="0,5"
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <i className="bi bi-gear"></i>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                  <a 
                                    className="dropdown-item" 
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (employee.status !== 'active') {
                                        handleStatusChange(employee._id, 'active', 'Activated by admin');
                                      }
                                    }}
                                    style={{ 
                                      pointerEvents: employee.status === 'active' ? 'none' : 'auto',
                                      opacity: employee.status === 'active' ? 0.5 : 1
                                    }}
                                  >
                                    <i className="bi bi-check-circle me-2 text-success"></i>Activate
                                  </a>
                                </li>
                                <li>
                                  <a 
                                    className="dropdown-item" 
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (employee.status !== 'on-leave') {
                                        handleStatusChange(employee._id, 'on-leave', 'Suspended by admin');
                                      }
                                    }}
                                    style={{ 
                                      pointerEvents: employee.status === 'on-leave' ? 'none' : 'auto',
                                      opacity: employee.status === 'on-leave' ? 0.5 : 1
                                    }}
                                  >
                                    <i className="bi bi-pause-circle me-2 text-warning"></i>Suspend
                                  </a>
                                </li>
                                <li>
                                  <a 
                                    className="dropdown-item" 
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (employee.status !== 'inactive') {
                                        handleStatusChange(employee._id, 'inactive', 'Inactivated by admin');
                                      }
                                    }}
                                    style={{ 
                                      pointerEvents: employee.status === 'inactive' ? 'none' : 'auto',
                                      opacity: employee.status === 'inactive' ? 0.5 : 1
                                    }}
                                  >
                                    <i className="bi bi-x-circle me-2 text-danger"></i>Inactivate
                                  </a>
                                </li>
                              </ul>
                            </div>
                          )}
                          
                          {/* Only L3 and L4 can delete (L3 cannot delete L4) */}
                          {(currentUser?.managementLevel === 4 || 
                            (currentUser?.managementLevel === 3 && employee.managementLevel < 4)) && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(employee._id)}
                              title="Delete Employee"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                <p>No employees found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && canManage && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editEmployee ? 'Edit Employee' : 'Add New Employee'}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                  <div className="row g-3">
                    {/* Basic Information */}
                    <div className="col-12">
                      <h6 className="fw-bold text-primary border-bottom pb-2">Basic Information</h6>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Employee ID *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={formData.employeeId}
                        onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                        disabled={editEmployee}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Work Email *</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Personal Email</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={formData.personalEmail}
                        onChange={(e) => setFormData({...formData, personalEmail: e.target.value})}
                        placeholder="Enter personal email"
                      />
                      <small className="text-muted">Optional contact email</small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Password {!editEmployee && '*'}</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        required={!editEmployee}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder={editEmployee ? 'Leave blank to keep unchanged' : ''}
                      />
                    </div>

                    {/* Identity Documents */}
                    {(!editEmployee || canViewSensitiveData) && (
                      <>
                        <div className="col-12 mt-3">
                          <h6 className="fw-bold text-primary border-bottom pb-2">
                            Identity Documents
                            {editEmployee && !canViewSensitiveData && (
                              <span className="badge bg-warning text-dark ms-2">Restricted</span>
                            )}
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">PAN Card</label>
                          <input
                            type="text"
                            className="form-control form-control-sm text-uppercase"
                            value={formData.panCard || ''}
                            onChange={(e) => setFormData({...formData, panCard: e.target.value.toUpperCase()})}
                            placeholder="ABCDE1234F"
                            maxLength="10"
                            pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                            title="Enter valid PAN (e.g., ABCDE1234F)"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                          <small className="text-muted">Format: ABCDE1234F</small>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Aadhar Card</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.aadharCard || ''}
                            onChange={(e) => setFormData({...formData, aadharCard: e.target.value.replace(/\D/g, '')})}
                            placeholder="123456789012"
                            maxLength="12"
                            pattern="\d{12}"
                            title="Enter 12-digit Aadhar number"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                          <small className="text-muted">12-digit number</small>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                          />
                        </div>
                      </>
                    )}

                    {/* Address Details */}
                    <div className="col-12 mt-3">
                      <h6 className="fw-bold text-primary border-bottom pb-2">Current Address</h6>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.currentAddress.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress, street: e.target.value }
                        })}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.currentAddress.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress, city: e.target.value }
                        })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.currentAddress.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress, state: e.target.value }
                        })}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Zip Code</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.currentAddress.zipCode}
                        onChange={(e) => setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress, zipCode: e.target.value }
                        })}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.currentAddress.country}
                        onChange={(e) => setFormData({
                          ...formData,
                          currentAddress: { ...formData.currentAddress, country: e.target.value }
                        })}
                      />
                    </div>

                    <div className="col-12 mt-3">
                      <h6 className="fw-bold text-primary border-bottom pb-2">Permanent Address</h6>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.permanentAddress.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress, street: e.target.value }
                        })}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.permanentAddress.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress, city: e.target.value }
                        })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.permanentAddress.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress, state: e.target.value }
                        })}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Zip Code</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.permanentAddress.zipCode}
                        onChange={(e) => setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress, zipCode: e.target.value }
                        })}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.permanentAddress.country}
                        onChange={(e) => setFormData({
                          ...formData,
                          permanentAddress: { ...formData.permanentAddress, country: e.target.value }
                        })}
                      />
                    </div>

                    {/* Organization Details */}
                    <div className="col-12 mt-3">
                      <h6 className="fw-bold text-primary border-bottom pb-2">Organization Details</h6>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Department</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.department}
                        onChange={(e) => {
                          setFormData({
                            ...formData, 
                            department: e.target.value,
                            position: ''
                          });
                        }}
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Position</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        disabled={!formData.department}
                      >
                        <option value="">Select Position</option>
                        {formData.department && departments
                          .find(dept => dept._id === formData.department)
                          ?.positions?.map((position, index) => (
                            <option key={index} value={position}>{position}</option>
                          ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Joining Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                      />
                    </div>

                    {/* Hierarchy & Permissions */}
                    <div className="col-12 mt-3">
                      <h6 className="fw-bold text-primary border-bottom pb-2">Hierarchy & Permissions</h6>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Management Level</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.managementLevel}
                        onChange={(e) => {
                          const level = parseInt(e.target.value);
                          setFormData({
                            ...formData, 
                            managementLevel: level,
                            canApproveLeaves: level >= 1,
                            canManageAttendance: level >= 1
                          });
                        }}
                      >
                        <option value="0">L0 - Employee</option>
                        <option value="1">L1 - Reporting Manager</option>
                        <option value="2">L2 - Senior Manager</option>
                        {currentUser?.managementLevel >= 3 && <option value="3">L3 - Admin</option>}
                        {currentUser?.managementLevel === 4 && <option value="4">L4 - CEO/Owner</option>}
                      </select>
                      <small className="text-muted">L1+ can approve leaves & manage attendance</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Reporting Manager</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.reportingManager}
                        onChange={(e) => setFormData({...formData, reportingManager: e.target.value})}
                      >
                        <option value="">No Manager (Top Level)</option>
                        {managers
                          .filter(mgr => mgr._id !== editEmployee?._id)
                          .map(mgr => (
                            <option key={mgr._id} value={mgr._id}>
                              {mgr.firstName} {mgr.lastName} - L{mgr.managementLevel}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Work Schedule */}
                    <div className="col-md-6">
                      <label className="form-label">Saturday Work Schedule</label>
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="saturdayWorking"
                          checked={formData.saturdayWorking}
                          onChange={(e) => setFormData({...formData, saturdayWorking: e.target.checked})}
                        />
                        <label className="form-check-label" htmlFor="saturdayWorking">
                          Saturday is a working day
                        </label>
                      </div>
                      <small className="text-muted">Enable if this employee works on Saturdays. Sundays are week off for all.</small>
                    </div>

                    {/* Assets Information */}
                    <div className="col-12 mt-3">
                      <h6 className="fw-bold text-primary border-bottom pb-2">Assets Allocated</h6>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Asset Name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g., Laptop HP EliteBook, iPhone 13, etc."
                        value={formData.assetsAllocated}
                        onChange={(e) => setFormData({...formData, assetsAllocated: e.target.value})}
                      />
                      <small className="text-muted">Enter asset name to be allocated to this employee</small>
                    </div>

                    {/* Salary Information */}
                    {(!editEmployee || canViewSensitiveData) && (
                      <>
                        <div className="col-12 mt-3">
                          <h6 className="fw-bold text-primary border-bottom pb-2">
                            Salary Information
                            {editEmployee && !canViewSensitiveData && (
                              <span className="badge bg-warning text-dark ms-2">Finance Only</span>
                            )}
                          </h6>
                        </div>
                        <div className="col-md-12">
                          <label className="form-label">Gross Salary</label>
                          <input
                            type="number"
                            className="form-control form-control-sm no-spinner"
                            value={formData.salary?.grossSalary || ''}
                            onChange={(e) => setFormData({...formData, salary: {...(formData.salary || {}), grossSalary: e.target.value === '' ? '' : parseInt(e.target.value)}})}
                            onWheel={(e) => e.target.blur()}
                            placeholder="Enter gross salary"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                          {editEmployee && !canViewSensitiveData && (
                            <small className="text-warning">Only Finance Department (L3/L4) can view/edit salary details</small>
                          )}
                        </div>
                      </>
                    )}

                    {/* Banking Details */}
                    {(!editEmployee || canViewSensitiveData) && (
                      <>
                        <div className="col-12 mt-3">
                          <h6 className="fw-bold text-primary border-bottom pb-2">
                            Banking Details
                            {editEmployee && !canViewSensitiveData && (
                              <span className="badge bg-warning text-dark ms-2">Finance Only</span>
                            )}
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Account Number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.bankDetails?.accountNumber || ''}
                            onChange={(e) => setFormData({...formData, bankDetails: {...(formData.bankDetails || {}), accountNumber: e.target.value}})}
                            placeholder="Enter account number"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Bank Name</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.bankDetails?.bankName || ''}
                            onChange={(e) => setFormData({...formData, bankDetails: {...(formData.bankDetails || {}), bankName: e.target.value}})}
                            placeholder="Enter bank name"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">IFSC Code</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.bankDetails?.ifscCode || ''}
                            onChange={(e) => setFormData({...formData, bankDetails: {...(formData.bankDetails || {}), ifscCode: e.target.value.toUpperCase()}})}
                            placeholder="Enter IFSC code"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                        </div>
                        {editEmployee && !canViewSensitiveData && (
                          <div className="col-12">
                            <small className="text-warning">Only Finance Department (L3/L4) can view/edit banking details</small>
                          </div>
                        )}
                      </>
                    )}

                    {/* Compliance Details */}
                    {(!editEmployee || canViewSensitiveData) && (
                      <>
                        <div className="col-12 mt-3">
                          <h6 className="fw-bold text-primary border-bottom pb-2">
                            Compliance Details
                            {editEmployee && !canViewSensitiveData && (
                              <span className="badge bg-warning text-dark ms-2">Finance Only</span>
                            )}
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">UAN Number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.complianceDetails?.uanNumber || ''}
                            onChange={(e) => setFormData({...formData, complianceDetails: {...(formData.complianceDetails || {}), uanNumber: e.target.value}})}
                            placeholder="Enter UAN number"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">PF Number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.complianceDetails?.pfNumber || ''}
                            onChange={(e) => setFormData({...formData, complianceDetails: {...(formData.complianceDetails || {}), pfNumber: e.target.value}})}
                            placeholder="Enter PF number"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">ESI Number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={formData.complianceDetails?.esiNumber || ''}
                            onChange={(e) => setFormData({...formData, complianceDetails: {...(formData.complianceDetails || {}), esiNumber: e.target.value}})}
                            placeholder="Enter ESI number"
                            disabled={editEmployee && !canViewSensitiveData}
                          />
                        </div>
                        {editEmployee && !canViewSensitiveData && (
                          <div className="col-12">
                            <small className="text-warning">Only Finance Department (L3/L4) can view/edit compliance details</small>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer" style={{ flexShrink: 0 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editEmployee ? 'Update Employee' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Employment Documents Modal */}
      {showDocumentModal && documentEmployee && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-0">Employment Documents</h5>
                  <small className="text-muted">
                    {documentEmployee.firstName} {documentEmployee.lastName} • {documentEmployee.employeeId}
                  </small>
                </div>
                <button type="button" className="btn-close" onClick={closeDocumentModal}></button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto' }}>
                {documentLoading ? (
                  <div className="d-flex justify-content-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="row g-4">
                    <div className="col-lg-7">
                      {documentTypes.length === 0 ? (
                        <div className="alert alert-info mb-0">Document types not configured</div>
                      ) : (
                        <div className="row g-3">
                          {documentTypes.map((type) => {
                            const record = documentRecords.find((doc) => doc.docType === type.key);
                            const uploadedDate = record?.uploadedAt ? new Date(record.uploadedAt) : null;
                            return (
                              <div className="col-md-6" key={type.key}>
                                <div className={`document-status-card ${record ? 'uploaded' : 'pending'}`}>
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <h6 className="mb-1">{type.label}</h6>
                                      <p className="text-muted small mb-1">{type.description}</p>
                                    </div>
                                    <span className={`badge ${record ? 'bg-success' : 'bg-secondary'}`}>
                                      {record ? 'Uploaded' : 'Pending'}
                                    </span>
                                  </div>
                                  {record ? (
                                    <div className="document-meta">
                                      <small className="text-muted d-block">Last updated</small>
                                      <strong className="d-block mb-2">
                                        {uploadedDate
                                          ? `${uploadedDate.toLocaleDateString()} • ${uploadedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                          : 'Recently updated'}
                                      </strong>
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 small"
                                        onClick={() => handleDocumentDownload(record)}
                                      >
                                        <i className="bi bi-download me-1"></i>Download PDF
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="document-meta text-muted small">
                                      Upload pending for this letter type.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="col-lg-5">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3">Upload / Replace Document</h6>
                          {documentError && (
                            <div className="alert alert-danger py-2">{documentError}</div>
                          )}
                          <form onSubmit={handleDocumentUpload}>
                            <div className="mb-3">
                              <label className="form-label">Document Type</label>
                              <select
                                className="form-select"
                                value={documentForm.docType}
                                onChange={(e) => {
                                  setDocumentForm((prev) => ({ ...prev, docType: e.target.value }));
                                  setDocumentError('');
                                }}
                                required
                              >
                                <option value="" disabled>Select type</option>
                                {documentTypes.map((type) => (
                                  <option key={type.key} value={type.key}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="mb-3">
                              <label className="form-label">PDF File</label>
                              <input
                                key={documentInputKey}
                                type="file"
                                accept="application/pdf"
                                className="form-control"
                                onChange={(e) => {
                                  setDocumentForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }));
                                  setDocumentError('');
                                }}
                                required
                              />
                              <small className="text-muted">Max 10 MB. Existing files will be replaced.</small>
                            </div>
                            <button
                              type="submit"
                              className="btn btn-primary w-100"
                              disabled={documentUploading || documentTypes.length === 0}
                            >
                              {documentUploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDocumentModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Details Modal */}
      {showViewModal && viewEmployee && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '1200px' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header py-2" style={{ flexShrink: 0 }}>
                <h5 className="modal-title mb-0">
                  <i className="bi bi-person-badge me-2"></i>
                  Employee Details - {viewEmployee.employeeId}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body py-3" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                <div className="row g-3">
                  {/* Profile Section - Compact */}
                  <div className="col-12">
                    <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                      <img
                        src={viewEmployee.profileImage || '/assets/client.jpg'}
                        alt={viewEmployee.firstName}
                        className="rounded-circle me-3"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', border: '3px solid #e9ecef' }}
                      />
                      <div className="flex-grow-1">
                        <h4 className="mb-1">{viewEmployee.firstName} {viewEmployee.lastName}</h4>
                        <p className="text-muted mb-2 small">{viewEmployee.position || 'N/A'} • {viewEmployee.department?.name || 'N/A'}</p>
                        <div>
                          <span className={`badge ${
                            viewEmployee.status === 'active' ? 'bg-success' :
                            viewEmployee.status === 'on-leave' ? 'bg-warning' : 'bg-secondary'
                          } me-2`}>
                            {viewEmployee.status?.toUpperCase()}
                          </span>
                          <span className={`badge ${
                            viewEmployee.managementLevel === 4 ? 'bg-dark' :
                            viewEmployee.managementLevel === 3 ? 'bg-danger' :
                            viewEmployee.managementLevel === 2 ? 'bg-warning' :
                            viewEmployee.managementLevel === 1 ? 'bg-info' : 'bg-primary'
                          }`}>
                            L{viewEmployee.managementLevel} - {
                              viewEmployee.managementLevel === 4 ? 'CEO' :
                              viewEmployee.managementLevel === 3 ? 'ADMIN' :
                              viewEmployee.managementLevel === 2 ? 'SR.MGR' :
                              viewEmployee.managementLevel === 1 ? 'MANAGER' : 'EMPLOYEE'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Two Column Layout for Better Space Usage */}
                  <div className="col-md-6">
                    {/* Basic Information */}
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body p-3">
                        <h6 className="fw-bold text-primary mb-2 small">
                          <i className="bi bi-info-circle me-1"></i>Basic Information
                        </h6>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Employee ID</label>
                            <p className="mb-2 small fw-bold">{viewEmployee.employeeId}</p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Work Email</label>
                            <p className="mb-2 small">{viewEmployee.email}</p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Personal Email</label>
                            <p className="mb-2 small">{viewEmployee.personalEmail || 'N/A'}</p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Phone</label>
                            <p className="mb-2 small">{viewEmployee.phone || 'N/A'}</p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Date of Birth</label>
                            <p className="mb-0 small">
                              {viewEmployee.dateOfBirth 
                                ? new Date(viewEmployee.dateOfBirth).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    {/* Organization Details */}
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body p-3">
                        <h6 className="fw-bold text-primary mb-2 small">
                          <i className="bi bi-building me-1"></i>Organization Details
                        </h6>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Department</label>
                            <p className="mb-2 small">{viewEmployee.department?.name || 'N/A'}</p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Position</label>
                            <p className="mb-2 small">{viewEmployee.position || 'N/A'}</p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Joining Date</label>
                            <p className="mb-2 small">
                              {viewEmployee.joiningDate 
                                ? new Date(viewEmployee.joiningDate).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="col-6">
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Reporting Manager</label>
                            <p className="mb-0 small">
                              {viewEmployee.reportingManager 
                                ? `${viewEmployee.reportingManager.firstName} ${viewEmployee.reportingManager.lastName}`
                                : 'Top Level'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions - Single Row */}
                  <div className="col-12">
                    <div className="card border-0 bg-light">
                      <div className="card-body p-3">
                        <h6 className="fw-bold text-primary mb-2 small">
                          <i className="bi bi-shield-check me-1"></i>Permissions & Settings
                        </h6>
                        <div className="d-flex gap-4 flex-wrap">
                          <div>
                            <label className="text-muted me-2" style={{ fontSize: '0.75rem' }}>Approve Leaves:</label>
                            {viewEmployee.canApproveLeaves 
                              ? <span className="badge bg-success">Yes</span>
                              : <span className="badge bg-secondary">No</span>}
                          </div>
                          <div>
                            <label className="text-muted me-2" style={{ fontSize: '0.75rem' }}>Manage Attendance:</label>
                            {viewEmployee.canManageAttendance 
                              ? <span className="badge bg-success">Yes</span>
                              : <span className="badge bg-secondary">No</span>}
                          </div>
                          <div>
                            <label className="text-muted me-2" style={{ fontSize: '0.75rem' }}>Saturday Working:</label>
                            {viewEmployee.saturdayWorking 
                              ? <span className="badge bg-info">Yes</span>
                              : <span className="badge bg-secondary">No</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assets Allocated - Compact */}
                  {viewEmployee.assets && viewEmployee.assets.length > 0 && (
                    <div className="col-12">
                      <div className="card border-0 bg-light">
                        <div className="card-body p-3">
                          <h6 className="fw-bold text-primary mb-2 small">
                            <i className="bi bi-laptop me-1"></i>Assets Allocated
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0 small">
                              <thead>
                                <tr>
                                  <th className="text-muted" style={{ fontSize: '0.75rem' }}>Asset Name</th>
                                  <th className="text-muted" style={{ fontSize: '0.75rem' }}>Allocated Date</th>
                                  <th className="text-muted" style={{ fontSize: '0.75rem' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {viewEmployee.assets.map((asset, index) => (
                                  <tr key={index}>
                                    <td>{asset.name}</td>
                                    <td>{new Date(asset.allocatedDate).toLocaleDateString()}</td>
                                    <td>
                                      <span className={`badge ${asset.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                                        {asset.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sensitive Data - Compact Two Column Layout */}
                  {(viewEmployee.salary || viewEmployee.bankDetails || 
                    viewEmployee.complianceDetails || viewEmployee.panCard || 
                    viewEmployee.aadharCard) && (
                    <>
                      {/* Identity Documents & Salary - Side by Side */}
                      {(viewEmployee.panCard || viewEmployee.aadharCard) && (
                        <div className="col-md-6">
                          <div className="card border-0 bg-light h-100">
                            <div className="card-body p-3">
                              <h6 className="fw-bold text-primary mb-2 small">
                                <i className="bi bi-card-checklist me-1"></i>Identity 
                                <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>Finance</span>
                              </h6>
                              <div className="row g-2">
                                {viewEmployee.panCard && (
                                  <div className="col-12">
                                    <label className="text-muted" style={{ fontSize: '0.75rem' }}>PAN Card</label>
                                    <p className="mb-2 small fw-bold">{viewEmployee.panCard}</p>
                                  </div>
                                )}
                                {viewEmployee.aadharCard && (
                                  <div className="col-12">
                                    <label className="text-muted" style={{ fontSize: '0.75rem' }}>Aadhar Card</label>
                                    <p className="mb-0 small fw-bold">{viewEmployee.aadharCard}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {viewEmployee.salary && (
                        <div className="col-md-6">
                          <div className="card border-0 bg-light h-100">
                            <div className="card-body p-3">
                              <h6 className="fw-bold text-primary mb-2 small">
                                <i className="bi bi-cash-stack me-1"></i>Salary
                                <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>Finance</span>
                              </h6>
                              <div className="row g-2">
                                <div className="col-12">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>Gross Salary</label>
                                  <p className="mb-0 small fw-bold">
                                    ₹ {viewEmployee.salary.grossSalary?.toLocaleString('en-IN') || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bank Details */}
                      {viewEmployee.bankDetails && (
                        <div className="col-md-6">
                          <div className="card border-0 bg-light">
                            <div className="card-body p-3">
                              <h6 className="fw-bold text-primary mb-2 small">
                                <i className="bi bi-bank me-1"></i>Bank Details
                                <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>Finance</span>
                              </h6>
                              <div className="row g-2">
                                <div className="col-6">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>Bank Name</label>
                                  <p className="mb-2 small">{viewEmployee.bankDetails.bankName || 'N/A'}</p>
                                </div>
                                <div className="col-6">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>IFSC Code</label>
                                  <p className="mb-2 small">{viewEmployee.bankDetails.ifscCode || 'N/A'}</p>
                                </div>
                                <div className="col-12">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>Account Number</label>
                                  <p className="mb-0 small fw-bold">{viewEmployee.bankDetails.accountNumber || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compliance Details */}
                      {viewEmployee.complianceDetails && (
                        <div className="col-md-6">
                          <div className="card border-0 bg-light">
                            <div className="card-body p-3">
                              <h6 className="fw-bold text-primary mb-2 small">
                                <i className="bi bi-file-earmark-text me-1"></i>Compliance
                                <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>Finance</span>
                              </h6>
                              <div className="row g-2">
                                <div className="col-6">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>UAN Number</label>
                                  <p className="mb-2 small">{viewEmployee.complianceDetails.uanNumber || 'N/A'}</p>
                                </div>
                                <div className="col-6">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>PF Number</label>
                                  <p className="mb-2 small">{viewEmployee.complianceDetails.pfNumber || 'N/A'}</p>
                                </div>
                                <div className="col-12">
                                  <label className="text-muted" style={{ fontSize: '0.75rem' }}>ESI Number</label>
                                  <p className="mb-0 small">{viewEmployee.complianceDetails.esiNumber || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Address - Full Width Compact */}
                  {(viewEmployee.currentAddress || viewEmployee.permanentAddress || viewEmployee.address) && (
                    <div className="col-12">
                      <div className="card border-0 bg-light">
                        <div className="card-body p-3">
                          <h6 className="fw-bold text-primary mb-2 small">
                            <i className="bi bi-geo-alt me-1"></i>Address Information
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="text-muted" style={{ fontSize: '0.75rem' }}>Current Address</label>
                              <p className="mb-0 small">
                                {formatAddress(viewEmployee.currentAddress || viewEmployee.address)}
                              </p>
                            </div>
                            <div className="col-md-6">
                              <label className="text-muted" style={{ fontSize: '0.75rem' }}>Permanent Address</label>
                              <p className="mb-0 small">
                                {formatAddress(viewEmployee.permanentAddress || viewEmployee.currentAddress || viewEmployee.address)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer py-2" style={{ flexShrink: 0 }}>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
                {canManage && (currentUser?.managementLevel === 4 ||
                  currentUser?.managementLevel === 3 || 
                  (currentUser?.managementLevel === 2 && 
                   viewEmployee.managementLevel < 2 && 
                   viewEmployee._id !== currentUser?.id)) && (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewEmployee);
                  }}>
                    <i className="bi bi-pencil me-1"></i>Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Employees;
