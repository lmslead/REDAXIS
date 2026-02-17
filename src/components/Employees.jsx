import { useState, useEffect } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf';
import { employeesAPI, departmentsAPI, teamAPI, assetsAPI, employeeDocumentsAPI } from '../services/api';
import { getUser } from '../services/api';
import { isHumanResourcesUser } from '../utils/hrAccess';
import './Employees.css';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmploymentType, setFilterEmploymentType] = useState('all');
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
  const [documentViewerState, setDocumentViewerState] = useState({ open: false, title: '' });
  const [documentViewerLoading, setDocumentViewerLoading] = useState(false);
  const [documentViewerPages, setDocumentViewerPages] = useState([]);
  const [documentViewerError, setDocumentViewerError] = useState('');
  const [exitDateDrafts, setExitDateDrafts] = useState({});
  const today = new Date();
  const [joiningExportFilters, setJoiningExportFilters] = useState({
    mode: 'month',
    month: String(today.getMonth() + 1),
    quarter: String(Math.floor(today.getMonth() / 3) + 1),
    year: String(today.getFullYear()),
    status: 'all',
    department: '',
    startDate: '',
    endDate: '',
  });
  const [exportingJoinings, setExportingJoinings] = useState(false);
  const [exportingEmployeeList, setExportingEmployeeList] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('Abc@123');
  
  const currentUser = getUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const isL3User = currentUser?.managementLevel === 3;
  const financeDepartmentNames = ['finance', 'finance department', 'finance & accounts', 'accounts', 'accounting'];
  const currentDepartmentName = (currentUser?.department?.name || currentUser?.departmentName || '')
    .trim()
    .toLowerCase();
  const isHRUser = isHumanResourcesUser(currentUser);
  const isFinanceL3User = isL3User && financeDepartmentNames.includes(currentDepartmentName);
  const canExportEmployeeList = currentUser?.managementLevel >= 4 || isFinanceL3User;
  const canManage = currentUser?.managementLevel >= 2; // L2, L3, and L4 can manage employees
  const canManageDocuments = currentUser?.managementLevel >= 3;
  const canResetPassword = currentUser?.managementLevel >= 3; // L3 and L4 can reset passwords
  const canExportJoinings = isHumanResourcesUser(currentUser);
  const canEditExitDate = currentUser?.managementLevel >= 4 || (isL3User && (isFinanceL3User || isHRUser));
  const getDocumentTypeLabel = (docType) => documentTypes.find((type) => type.key === docType)?.label || 'Document';
  const resetDocumentViewer = () => {
    setDocumentViewerPages([]);
    setDocumentViewerError('');
    setDocumentViewerState({ open: false, title: '' });
    setDocumentViewerLoading(false);
  };
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

  const formatDateInput = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
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
    employmentType: 'full-time',
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
      const nextExitDates = {};
      (response.data || []).forEach((employee) => {
        nextExitDates[employee._id] = formatDateInput(employee.exitDate);
      });
      setExitDateDrafts(nextExitDates);
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

  const handleJoiningExportFilterChange = (field, value) => {
    setJoiningExportFilters((prev) => ({ ...prev, [field]: value }));
  };

  const buildJoiningExportParams = () => {
    const params = { dateField: 'joiningDate' };
    const {
      mode,
      month,
      quarter,
      year,
      startDate,
      endDate,
      status,
      department,
    } = joiningExportFilters;

    if (mode === 'month') {
      if (!month || !year) {
        throw new Error('Select both month and year to export joinings.');
      }
      params.month = month;
      params.year = year;
    } else if (mode === 'quarter') {
      if (!quarter || !year) {
        throw new Error('Select both quarter and year to export joinings.');
      }
      params.quarter = quarter;
      params.year = year;
    } else if (mode === 'year') {
      if (!year) {
        throw new Error('Enter the year to export joinings.');
      }
      params.year = year;
    } else if (mode === 'custom') {
      if (!startDate && !endDate) {
        throw new Error('Provide a start date, end date, or both for custom exports.');
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }
    } else {
      throw new Error('Select a valid filter type for exporting joinings.');
    }

    if (status && status !== 'all') {
      params.status = status;
    }

    if (department) {
      params.departmentId = department;
    }

    return params;
  };

  const handleJoiningExport = async () => {
    try {
      setExportingJoinings(true);
      const params = buildJoiningExportParams();
      const blob = await employeesAPI.exportJoinings(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employee-joinings-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Failed to export joining data');
    } finally {
      setExportingJoinings(false);
    }
  };

  const buildEmployeeExportParams = () => {
    const params = {};
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (filterDept) {
      params.departmentId = filterDept;
    }
    if (isL3User && filterStatus && filterStatus !== 'all') {
      params.status = filterStatus;
    }
    return params;
  };

  const handleEmployeeListExport = async () => {
    try {
      setExportingEmployeeList(true);
      const params = buildEmployeeExportParams();
      const blob = await employeesAPI.exportList(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees-export-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Failed to export employee list');
    } finally {
      setExportingEmployeeList(false);
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
    resetDocumentViewer();
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

  const handleDocumentPreview = async (record) => {
    if (!record) return;
    setDocumentViewerLoading(true);
    setDocumentViewerError('');
    setDocumentViewerPages([]);
    const employeeLabel = documentEmployee?.employeeId || documentEmployee?._id || '';
    const docLabel = getDocumentTypeLabel(record.docType);
    setDocumentViewerState({ open: true, title: [docLabel, employeeLabel].filter(Boolean).join(' • ') });

    try {
      const blob = await employeeDocumentsAPI.download(record._id, { preview: true });
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const renderedPages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        renderedPages.push(canvas.toDataURL('image/png'));
      }

      setDocumentViewerPages(renderedPages);
    } catch (error) {
      setDocumentViewerError(error.message || 'Unable to display document');
    } finally {
      setDocumentViewerLoading(false);
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
      employmentType: employee.employmentType || 'full-time',
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

  const openResetPasswordModal = (employee) => {
    setResetPasswordEmployee(employee);
    setResetPasswordValue('Abc@123');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordEmployee) return;
    try {
      await employeesAPI.resetPassword(resetPasswordEmployee._id, { newPassword: resetPasswordValue });
      alert(`Password for ${resetPasswordEmployee.firstName} ${resetPasswordEmployee.lastName} has been reset successfully.`);
      setShowResetPasswordModal(false);
      setResetPasswordEmployee(null);
    } catch (error) {
      alert(error.message || 'Password reset failed');
    }
  };

  const handleStatusChange = async (employeeId, status, reason) => {
    const statusText = status === 'active'
      ? 'activate'
      : status === 'on-leave'
      ? 'suspend'
      : status === 'absconded'
      ? 'mark as absconded'
      : 'inactivate';
    const confirmMessage = `Are you sure you want to ${statusText} this employee?${status === 'inactive' || status === 'absconded' ? '\n\nNote: This user cannot login to the system.' : ''}`;
    
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

  const handleExitDateChange = (employeeId, value) => {
    setExitDateDrafts((prev) => ({
      ...prev,
      [employeeId]: value,
    }));
  };

  const handleExitDateSave = async (employee) => {
    if (!canEditExitDate || !employee?._id) return;
    if (employee._id === currentUserId) return;

    const draft = exitDateDrafts[employee._id] || '';
    const existing = formatDateInput(employee.exitDate);

    if (draft === existing) return;

    try {
      await employeesAPI.updateExitDate(employee._id, {
        exitDate: draft || null,
      });
      fetchEmployees();
    } catch (error) {
      alert(error.message || 'Failed to update exit date');
      setExitDateDrafts((prev) => ({
        ...prev,
        [employee._id]: existing,
      }));
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
    const matchesStatus = !isL3User || filterStatus === 'all' || emp.status === filterStatus;
    const matchesEmploymentType = filterEmploymentType === 'all' || emp.employmentType === filterEmploymentType;
    return matchesSearch && matchesDept && matchesStatus && matchesEmploymentType;
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

      {canExportJoinings && (
        <div className="card border-0 shadow-sm mb-4 joining-export-card">
          <div className="card-body py-3 px-3">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="joining-export-icon">
                  <i className="bi bi-clipboard-data"></i>
                </div>
                <div>
                  <h6 className="mb-0">Joining Export</h6>
                  <small className="text-muted">Quarterly / Monthly / Custom</small>
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline-primary ms-auto"
                onClick={handleJoiningExport}
                disabled={exportingJoinings}
              >
                {exportingJoinings ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Preparing
                  </span>
                ) : (
                  <span>
                    <i className="bi bi-download me-1"></i>Export CSV
                  </span>
                )}
              </button>
            </div>
            <div className="joining-export-fields">
              <div className="joining-export-field">
                <label className="form-label small fw-semibold">Filter Type</label>
                <select
                  className="form-select form-select-sm"
                  value={joiningExportFilters.mode}
                  onChange={(e) => handleJoiningExportFilterChange('mode', e.target.value)}
                >
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {(joiningExportFilters.mode === 'month' || joiningExportFilters.mode === 'quarter' || joiningExportFilters.mode === 'year') && (
                <div className="joining-export-field">
                  <label className="form-label small fw-semibold">Year</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="2000"
                    max="3000"
                    value={joiningExportFilters.year}
                    onChange={(e) => handleJoiningExportFilterChange('year', e.target.value)}
                  />
                </div>
              )}

              {joiningExportFilters.mode === 'month' && (
                <div className="joining-export-field">
                  <label className="form-label small fw-semibold">Month</label>
                  <select
                    className="form-select form-select-sm"
                    value={joiningExportFilters.month}
                    onChange={(e) => handleJoiningExportFilterChange('month', e.target.value)}
                  >
                    {Array.from({ length: 12 }).map((_, index) => (
                      <option key={index + 1} value={String(index + 1)}>
                        {new Date(0, index).toLocaleString('default', { month: 'short' })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {joiningExportFilters.mode === 'quarter' && (
                <div className="joining-export-field">
                  <label className="form-label small fw-semibold">Quarter</label>
                  <select
                    className="form-select form-select-sm"
                    value={joiningExportFilters.quarter}
                    onChange={(e) => handleJoiningExportFilterChange('quarter', e.target.value)}
                  >
                    {[1, 2, 3, 4].map((quarter) => (
                      <option key={quarter} value={String(quarter)}>
                        Q{quarter}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {joiningExportFilters.mode === 'custom' && (
                <>
                  <div className="joining-export-field">
                    <label className="form-label small fw-semibold">Start Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={joiningExportFilters.startDate}
                      onChange={(e) => handleJoiningExportFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  <div className="joining-export-field">
                    <label className="form-label small fw-semibold">End Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={joiningExportFilters.endDate}
                      onChange={(e) => handleJoiningExportFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="joining-export-field">
                <label className="form-label small fw-semibold">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={joiningExportFilters.status}
                  onChange={(e) => handleJoiningExportFilterChange('status', e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on-leave">On Leave</option>
                  <option value="absconded">Absconded</option>
                </select>
              </div>

              <div className="joining-export-field">
                <label className="form-label small fw-semibold">Department</label>
                <select
                  className="form-select form-select-sm"
                  value={joiningExportFilters.department}
                  onChange={(e) => handleJoiningExportFilterChange('department', e.target.value)}
                >
                  <option value="">All</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className={isL3User ? 'col-md-5' : 'col-md-6'}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={isL3User ? 'col-md-3' : 'col-md-4'}>
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
            {isL3User && (
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="absconded">Absconded</option>
                </select>
              </div>
            )}
            <div className="col-md-2">
              <select
                className="form-select"
                value={filterEmploymentType}
                onChange={(e) => setFilterEmploymentType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="probation">Probation</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div className="col-md-2">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDept('');
                    setFilterStatus('all');
                    setFilterEmploymentType('all');
                  }}
                >
                  Clear Filters
                </button>
                {canExportEmployeeList && (
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={handleEmployeeListExport}
                    disabled={exportingEmployeeList}
                  >
                    {exportingEmployeeList ? 'Preparing...' : 'Export Excel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive employees-table-wrapper">
            <table className="table table-hover align-middle employees-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>Employee ID</th>
                  <th style={{ width: '12%' }}>Name</th>
                  <th style={{ width: '10%' }}>Department</th>
                  <th style={{ width: '9%' }}>Position</th>
                  <th style={{ width: '5%' }}>Level</th>
                  <th style={{ width: '8%' }}>Type</th>
                  <th style={{ width: '11%' }}>Reporting Manager</th>
                  <th style={{ width: '9%' }}>Exit Date</th>
                  <th style={{ width: '7%' }}>Status</th>
                  {canManage && <th style={{ width: '21%', textAlign: 'center' }}>Actions</th>}
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
                    <td className="fw-bold text-primary" data-label="Employee ID">{employee.employeeId}</td>
                    <td data-label="Name">
                      <div className="d-flex align-items-center">
                        <img
                          src={employee.profileImage || '/assets/client.jpg'}
                          alt={employee.firstName}
                          className="rounded-circle me-2"
                          style={{ width: '36px', height: '36px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                        />
                        <span className="fw-medium">{employee.firstName} {employee.lastName}</span>
                      </div>
                    </td>
                    <td data-label="Department">
                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }} title={employee.department?.name || 'N/A'}>
                        {employee.department?.name || 'N/A'}
                      </span>
                    </td>
                    <td data-label="Position">
                      <span className="text-truncate d-block" style={{ maxWidth: '100px' }} title={employee.position || 'N/A'}>
                        {employee.position || 'N/A'}
                      </span>
                    </td>
                    <td data-label="Level">
                      <span className={`badge rounded-pill ${
                        employee.managementLevel === 4 ? 'bg-dark' :
                        employee.managementLevel === 3 ? 'bg-danger' :
                        employee.managementLevel === 2 ? 'bg-warning text-dark' :
                        employee.managementLevel === 1 ? 'bg-info text-dark' : 'bg-primary'
                      }`} style={{ fontSize: '0.7rem', padding: '0.35rem 0.6rem' }}>
                        L{employee.managementLevel}
                      </span>
                    </td>
                    <td data-label="Type">
                      <span className={`badge rounded-pill ${
                        employee.employmentType === 'full-time' ? 'bg-success' :
                        employee.employmentType === 'probation' ? 'bg-warning text-dark' :
                        employee.employmentType === 'internship' ? 'bg-info text-dark' : 'bg-secondary'
                      }`} style={{ fontSize: '0.65rem', padding: '0.3rem 0.5rem', textTransform: 'capitalize' }}>
                        {employee.employmentType?.replace('-', ' ') || 'Full Time'}
                      </span>
                    </td>
                    <td data-label="Reporting Manager">
                      {employee.reportingManager ? (
                        <span className="text-truncate d-block text-muted" style={{ maxWidth: '100px', fontSize: '0.8rem' }} title={`${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`}>
                          {employee.reportingManager.firstName} {employee.reportingManager.lastName}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td data-label="Exit Date" onClick={(e) => e.stopPropagation()}>
                      {canEditExitDate && employee._id !== currentUserId ? (
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem', minWidth: '110px' }}
                          value={exitDateDrafts[employee._id] || ''}
                          onChange={(e) => handleExitDateChange(employee._id, e.target.value)}
                          onBlur={() => handleExitDateSave(employee)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {employee.exitDate ? formatDateInput(employee.exitDate) : '-'}
                        </span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge rounded-pill text-uppercase ${
                        employee.status === 'active' ? 'bg-success' :
                        employee.status === 'on-leave' ? 'bg-warning text-dark' :
                        employee.status === 'absconded' ? 'bg-danger' : 'bg-secondary'
                      }`} style={{ fontSize: '0.65rem', padding: '0.35rem 0.55rem' }}>
                        {employee.status}
                      </span>
                    </td>
                    {canManage && (
                      <td
                        data-label="Actions"
                        className="employee-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="d-flex gap-1 justify-content-center employee-card-actions">
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

                          {/* Reset Password - L3 can reset up to L2, L4 can reset anyone */}
                          {canResetPassword && employee._id !== currentUserId &&
                            (currentUser?.managementLevel === 4 || employee.managementLevel < 3) && (
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => openResetPasswordModal(employee)}
                              title="Reset Password"
                            >
                              <i className="bi bi-key"></i>
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
                                <li>
                                  <a 
                                    className="dropdown-item" 
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (employee.status !== 'absconded') {
                                        handleStatusChange(employee._id, 'absconded', 'Marked absconded by admin');
                                      }
                                    }}
                                    style={{ 
                                      pointerEvents: employee.status === 'absconded' ? 'none' : 'auto',
                                      opacity: employee.status === 'absconded' ? 0.5 : 1
                                    }}
                                  >
                                    <i className="bi bi-exclamation-octagon me-2 text-danger"></i>Absconded
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
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder={editEmployee ? 'Leave blank to keep unchanged' : 'Default: Abc@123'}
                      />
                      {!editEmployee && <small className="text-muted">Leave blank for default: Abc@123</small>}
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
                    <div className="col-md-4">
                      <label className="form-label">Employment Type</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.employmentType}
                        onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                      >
                        <option value="full-time">Full Time</option>
                        <option value="probation">Probation</option>
                        <option value="internship">Internship</option>
                        <option value="contract">Contract</option>
                      </select>
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
                            // Get all records for this type if allowMultiple, else single record
                            const records = type.allowMultiple 
                              ? documentRecords.filter((doc) => doc.docType === type.key)
                              : [];
                            const singleRecord = !type.allowMultiple 
                              ? documentRecords.find((doc) => doc.docType === type.key)
                              : null;
                            const hasDocuments = type.allowMultiple ? records.length > 0 : !!singleRecord;
                            
                            return (
                              <div className="col-md-6" key={type.key}>
                                <div className={`document-status-card ${hasDocuments ? 'uploaded' : 'pending'}`}>
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <h6 className="mb-1">{type.label}</h6>
                                      <p className="text-muted small mb-1">{type.description}</p>
                                    </div>
                                    <span className={`badge ${hasDocuments ? 'bg-success' : 'bg-secondary'}`}>
                                      {type.allowMultiple 
                                        ? (records.length > 0 ? `${records.length} Uploaded` : 'Pending')
                                        : (singleRecord ? 'Uploaded' : 'Pending')}
                                    </span>
                                  </div>
                                  {type.allowMultiple ? (
                                    records.length > 0 ? (
                                      <div className="document-meta">
                                        {records.map((record, idx) => {
                                          const uploadedDate = record?.uploadedAt ? new Date(record.uploadedAt) : null;
                                          return (
                                            <div key={record._id} className="border-bottom py-2">
                                              <small className="text-muted d-block">
                                                Document {idx + 1} - {uploadedDate?.toLocaleDateString() || 'N/A'}
                                              </small>
                                              <div className="d-flex flex-wrap gap-3 align-items-center mt-1">
                                                <button
                                                  type="button"
                                                  className="btn btn-link p-0 small"
                                                  onClick={() => handleDocumentPreview(record)}
                                                >
                                                  <i className="bi bi-eye me-1"></i>View
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn btn-link p-0 small"
                                                  onClick={() => handleDocumentDownload(record)}
                                                >
                                                  <i className="bi bi-download me-1"></i>Download
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="document-meta text-muted small">
                                        No documents uploaded yet. Can upload multiple.
                                      </div>
                                    )
                                  ) : singleRecord ? (
                                    <div className="document-meta">
                                      <small className="text-muted d-block">Last updated</small>
                                      <strong className="d-block mb-2">
                                        {singleRecord.uploadedAt
                                          ? `${new Date(singleRecord.uploadedAt).toLocaleDateString()} • ${new Date(singleRecord.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                          : 'Recently updated'}
                                      </strong>
                                      <div className="d-flex flex-wrap gap-3 align-items-center">
                                        <button
                                          type="button"
                                          className="btn btn-link p-0 small"
                                          onClick={() => handleDocumentPreview(singleRecord)}
                                        >
                                          <i className="bi bi-eye me-1"></i>View PDF
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-link p-0 small"
                                          onClick={() => handleDocumentDownload(singleRecord)}
                                        >
                                          <i className="bi bi-download me-1"></i>Download PDF
                                        </button>
                                      </div>
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
                              <small className="text-muted">
                                Max 10 MB. {documentTypes.find((t) => t.key === documentForm.docType)?.allowMultiple
                                  ? 'A new document will be added.'
                                  : 'Existing file will be replaced.'}
                              </small>
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

      {/* Document Viewer */}
      {documentViewerState.open && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{documentViewerState.title || 'Document Preview'}</h5>
                <button type="button" className="btn-close" onClick={resetDocumentViewer}></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                {documentViewerLoading && (
                  <div className="d-flex justify-content-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}

                {documentViewerError && (
                  <div className="alert alert-warning mb-0">{documentViewerError}</div>
                )}

                {!documentViewerLoading && !documentViewerError && documentViewerPages.length > 0 && (
                  <div>
                    {documentViewerPages.map((pageUrl, index) => (
                      <div key={`doc-page-${index}`} className="mb-4">
                        <img src={pageUrl} alt={`Document page ${index + 1}`} className="img-fluid border rounded" />
                      </div>
                    ))}
                  </div>
                )}

                {!documentViewerLoading && !documentViewerError && documentViewerPages.length === 0 && (
                  <p className="text-center text-muted mb-0">No pages to display.</p>
                )}
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
                            <label className="text-muted" style={{ fontSize: '0.75rem' }}>Employment Type</label>
                            <p className="mb-2 small">
                              <span className={`badge ${
                                viewEmployee.employmentType === 'full-time' ? 'bg-success' :
                                viewEmployee.employmentType === 'probation' ? 'bg-warning text-dark' :
                                viewEmployee.employmentType === 'internship' ? 'bg-info text-dark' : 'bg-secondary'
                              }`} style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                                {viewEmployee.employmentType?.replace('-', ' ') || 'Full Time'}
                              </span>
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

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordEmployee && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-key me-2"></i>Reset Password
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowResetPasswordModal(false)}></button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  <p className="mb-3 text-muted" style={{ fontSize: '0.85rem' }}>
                    Reset password for <strong>{resetPasswordEmployee.firstName} {resetPasswordEmployee.lastName}</strong> ({resetPasswordEmployee.employeeId})
                  </p>
                  <div className="mb-3">
                    <label className="form-label">New Password *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      required
                      minLength={6}
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <div className="form-text">Default: Abc@123</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowResetPasswordModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-warning">
                    <i className="bi bi-key me-1"></i>Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Employees;
