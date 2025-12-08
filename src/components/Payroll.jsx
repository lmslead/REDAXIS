import { useState, useEffect } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { payrollAPI, payslipsAPI, employeesAPI, getUser } from '../services/api';
import './Payroll.css';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const FINANCE_DEPARTMENT_NAMES = (import.meta.env.VITE_FINANCE_DEPARTMENTS || 'Finance')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

const resolveDepartmentName = (user) => {
  if (!user) return '';
  if (user.department?.name) {
    return user.department.name.toLowerCase();
  }
  if (typeof user.department === 'string') {
    return (user.departmentName || '').toLowerCase();
  }
  return (user.departmentName || '').toLowerCase();
};

const createDefaultUploadForm = () => ({
  employeeId: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  remarks: '',
});

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('records');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingPayslip, setUploadingPayslip] = useState(false);
  const [payslips, setPayslips] = useState([]);
  const [payslipLoading, setPayslipLoading] = useState(true);
  const [payslipFilterMonth, setPayslipFilterMonth] = useState('');
  const [payslipFilterYear, setPayslipFilterYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [uploadForm, setUploadForm] = useState(createDefaultUploadForm);
  const [viewerState, setViewerState] = useState({ open: false, title: '' });
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerPages, setViewerPages] = useState([]);

  const resetViewerState = () => {
    setViewerPages([]);
    setViewerState({ open: false, title: '' });
  };
  
  const currentUser = getUser();
  const currentDepartmentName = resolveDepartmentName(currentUser);
  const isFinanceUploader = currentDepartmentName
    ? FINANCE_DEPARTMENT_NAMES.includes(currentDepartmentName)
    : false;
  const canManage = currentUser?.managementLevel >= 2; // Only L2 and L3 can manage payroll
  const canUploadPayslips = currentUser
    ? currentUser.managementLevel >= 4 || (currentUser.managementLevel >= 3 && isFinanceUploader)
    : false;

  useEffect(() => {
    fetchPayrolls();
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetchPayslips();
  }, [payslipFilterMonth, payslipFilterYear]);

  useEffect(() => {
    if (canUploadPayslips) {
      fetchEmployees();
    }
  }, [canUploadPayslips]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      
      const response = await payrollAPI.getAll(params);
      setPayrolls(response.data);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async () => {
    setPayslipLoading(true);
    try {
      const params = {};
      if (payslipFilterMonth) params.month = payslipFilterMonth;
      if (payslipFilterYear) params.year = payslipFilterYear;

      const response = await payslipsAPI.getAll(params);
      setPayslips(response.data);
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setPayslipLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleViewDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setShowDetailModal(true);
  };

  const handleProcessPayroll = async (month, year) => {
    if (!window.confirm(`Process payroll for ${month}/${year}?`)) return;
    
    try {
      await payrollAPI.process({ month: parseInt(month), year: parseInt(year) });
      alert('Payroll processed successfully!');
      fetchPayrolls();
    } catch (error) {
      alert(error.message || 'Payroll processing failed');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(Number(amount) || 0);
  };

  const getAllowanceTotal = (allowances) => {
    if (!allowances) return 0;
    if (typeof allowances === 'number') return allowances;
    return Object.values(allowances).reduce((sum, value) => sum + (Number(value) || 0), 0);
  };

  const getDeductionTotal = (deductions) => {
    if (!deductions) return 0;
    if (typeof deductions === 'number') return deductions;
    return Object.values(deductions).reduce((sum, value) => sum + (Number(value) || 0), 0);
  };

  const formatPeriodLabel = (record) => {
    if (!record) return 'N/A';
    return `${new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' })} ${record.year}`;
  };

  const handlePayslipAction = async (payslip) => {
    if (canUploadPayslips) {
      try {
        const blob = await payslipsAPI.download(payslip._id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = payslip.fileName || `Payslip_${payslip.employee?.employeeId}_${payslip.month}_${payslip.year}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        alert(error.message || 'Unable to download payslip');
      }
      return;
    }

    const viewerTitleParts = [formatPeriodLabel(payslip), payslip.employee?.employeeId].filter(Boolean);
    const viewerTitle = viewerTitleParts.join(' - ');
    setViewerLoading(true);
    setViewerPages([]);
    setViewerState({ open: true, title: viewerTitle });

    try {
      const blob = await payslipsAPI.download(payslip._id);
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

      setViewerPages(renderedPages);
    } catch (error) {
      resetViewerState();
      alert(error.message || 'Unable to display payslip');
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    resetViewerState();
    setViewerLoading(false);
  };

  const openPayslipUploadModal = (payslip) => {
    setUploadTarget(payslip || null);
    setUploadForm({
      employeeId: payslip?.employee?._id || payslip?.employee || '',
      month: payslip?.month || new Date().getMonth() + 1,
      year: payslip?.year || new Date().getFullYear(),
      remarks: payslip?.remarks || '',
    });
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const handleUploadFormChange = (field, value) => {
    setUploadForm((prev) => ({
      ...prev,
      [field]: field === 'month' || field === 'year' ? Number(value) : value,
    }));
  };

  const handlePayslipUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.employeeId) {
      alert('Please select an employee');
      return;
    }
    if (!uploadFile) {
      alert('Please select a PDF to upload');
      return;
    }

    setUploadingPayslip(true);
    try {
      await payslipsAPI.upload({
        employeeId: uploadForm.employeeId,
        month: uploadForm.month,
        year: uploadForm.year,
        remarks: uploadForm.remarks,
        file: uploadFile,
      });
      alert('Payslip uploaded successfully');
      setShowUploadModal(false);
      setUploadTarget(null);
      setUploadForm(createDefaultUploadForm());
      setUploadFile(null);
      fetchPayslips();
    } catch (error) {
      alert(error.message || 'Payslip upload failed');
    } finally {
      setUploadingPayslip(false);
    }
  };

  const myPayrolls = canManage ? payrolls : payrolls.filter(p => 
    p.employee?._id === currentUser._id || p.employee === currentUser._id
  );

  const sortedPayslipRows = [...payslips].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
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
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Payroll Management</h2>
          <p className="text-muted">View and manage payroll records</p>
        </div>
        {canManage && (
          <div className="col-auto">
            <button 
              className="btn btn-primary"
              onClick={() => handleProcessPayroll(new Date().getMonth() + 1, new Date().getFullYear())}
            >
              <i className="bi bi-calculator me-2"></i>Process Payroll
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="d-flex flex-wrap gap-2">
          <button
            className={`btn ${activeTab === 'records' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('records')}
          >
            Payroll Records
          </button>
          <button
            className={`btn ${activeTab === 'payslips' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('payslips')}
          >
            Payslips
          </button>
        </div>
      </div>

      {activeTab === 'records' && (
        <>
          {/* Filters */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                  >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => { setFilterMonth(''); setFilterYear(new Date().getFullYear()); }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payroll Summary Cards */}
          {!canManage && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <p className="text-muted mb-1">Total Payslips</p>
                    <h3 className="fw-bold mb-0">{myPayrolls.length}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <p className="text-muted mb-1">This Year</p>
                    <h3 className="fw-bold mb-0">
                      {myPayrolls.filter(p => p.year === new Date().getFullYear()).length}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 shadow-sm bg-success text-white">
                  <div className="card-body">
                    <p className="mb-1">Latest Net Salary</p>
                    <h3 className="fw-bold mb-0">
                      {myPayrolls.length > 0 
                        ? formatCurrency(myPayrolls.sort((a, b) => 
                            new Date(b.year, b.month) - new Date(a.year, a.month)
                          )[0]?.netSalary)
                        : '₹0.00'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payroll Table */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      {canManage && <th>Employee</th>}
                      <th>Period</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Gross Salary</th>
                      <th>Deductions</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPayrolls
                      .sort((a, b) => {
                        if (b.year !== a.year) return b.year - a.year;
                        return b.month - a.month;
                      })
                      .map(payroll => (
                        <tr key={payroll._id}>
                          {canManage && (
                            <td>
                              {payroll.employee?.firstName} {payroll.employee?.lastName}
                              <br />
                              <small className="text-muted">{payroll.employee?.employeeId}</small>
                            </td>
                          )}
                          <td>
                            <strong>{formatPeriodLabel(payroll)}</strong>
                          </td>
                          <td>{formatCurrency(payroll.basicSalary)}</td>
                          <td>{formatCurrency(getAllowanceTotal(payroll.allowances))}</td>
                          <td className="fw-bold">{formatCurrency(payroll.grossSalary)}</td>
                          <td className="text-danger">{formatCurrency(getDeductionTotal(payroll.deductions))}</td>
                          <td className="fw-bold text-success">{formatCurrency(payroll.netSalary)}</td>
                          <td>
                            <span className={`badge ${
                              payroll.status === 'paid' ? 'bg-success' :
                              payroll.status === 'pending' ? 'bg-warning' : 'bg-secondary'
                            }`}>
                              {payroll.status?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => handleViewDetails(payroll)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {canUploadPayslips && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => openPayslipUploadModal({
                                  employee: payroll.employee,
                                  month: payroll.month,
                                  year: payroll.year,
                                })}
                              >
                                <i className="bi bi-upload me-1"></i>
                                Upload Payslip
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {myPayrolls.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    <p>No payroll records found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'payslips' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
              <div>
                <h5 className="fw-bold mb-1">Payslip Archive</h5>
                <p className="text-muted mb-0">
                  {canUploadPayslips
                    ? 'Upload monthly payslips for employees. Files are compressed and stored securely on the server.'
                    : 'Download your signed payslips as soon as Finance uploads them.'}
                </p>
              </div>
              {canUploadPayslips && (
                <button className="btn btn-primary mt-3 mt-md-0" onClick={() => openPayslipUploadModal(null)}>
                  <i className="bi bi-upload me-2"></i>Upload Payslip
                </button>
              )}
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={payslipFilterMonth}
                  onChange={(event) => setPayslipFilterMonth(event.target.value)}
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((monthValue) => (
                    <option key={`payslip-month-${monthValue}`} value={monthValue}>
                      {new Date(2000, monthValue - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={payslipFilterYear}
                  onChange={(event) => setPayslipFilterYear(Number(event.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((yearValue) => (
                    <option key={`payslip-year-${yearValue}`} value={yearValue}>{yearValue}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => { setPayslipFilterMonth(''); setPayslipFilterYear(new Date().getFullYear()); }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
            {payslipLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      {canUploadPayslips && <th>Employee</th>}
                      <th>Period</th>
                      <th>Status</th>
                      <th>Uploaded On</th>
                      {canUploadPayslips && <th>Uploaded By</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayslipRows.map((payslip) => {
                      const uploadedByLabel = payslip.uploadedBy?.firstName
                        ? `${payslip.uploadedBy.firstName} ${payslip.uploadedBy.lastName || ''}`.trim()
                        : (payslip.uploadedBy ? 'Finance Team' : '--');
                      return (
                        <tr key={`payslip-${payslip._id}`}>
                          {canUploadPayslips && (
                            <td>
                              {payslip.employee?.firstName} {payslip.employee?.lastName}
                              <br />
                              <small className="text-muted">{payslip.employee?.employeeId}</small>
                            </td>
                          )}
                          <td>{formatPeriodLabel(payslip)}</td>
                          <td>
                            <span className="badge bg-success">Uploaded</span>
                          </td>
                          <td>{payslip.uploadedAt ? new Date(payslip.uploadedAt).toLocaleString() : '--'}</td>
                          {canUploadPayslips && <td>{uploadedByLabel}</td>}
                          <td className="d-flex gap-2 flex-wrap">
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handlePayslipAction(payslip)}
                            >
                              <i className={`bi ${canUploadPayslips ? 'bi-download' : 'bi-eye'} me-1`}></i>
                              {canUploadPayslips ? 'Download' : 'View'}
                            </button>
                            {canUploadPayslips && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => openPayslipUploadModal(payslip)}
                              >
                                <i className="bi bi-upload me-1"></i>
                                Replace
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {sortedPayslipRows.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-file-earmark-text fs-1 d-block mb-2"></i>
                    <p>{canUploadPayslips ? 'No payslips found for the selected filters.' : 'Payslips will appear here once Finance uploads them.'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayroll && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Payslip Details - {new Date(selectedPayroll.year, selectedPayroll.month - 1).toLocaleString('default', { month: 'long' })} {selectedPayroll.year}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowDetailModal(false); setSelectedPayroll(null); }}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="fw-bold">Employee Information</h6>
                    <p className="mb-1"><strong>Name:</strong> {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}</p>
                    <p className="mb-1"><strong>ID:</strong> {selectedPayroll.employee?.employeeId}</p>
                    <p className="mb-1"><strong>Department:</strong> {selectedPayroll.employee?.department?.name || 'N/A'}</p>
                    <p className="mb-1"><strong>Position:</strong> {selectedPayroll.employee?.position || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Payment Information</h6>
                    <p className="mb-1"><strong>Period:</strong> {selectedPayroll.month}/{selectedPayroll.year}</p>
                    <p className="mb-1"><strong>Working Days:</strong> {selectedPayroll.workingDays || 'N/A'}</p>
                    <p className="mb-1"><strong>Status:</strong> 
                      <span className={`badge ms-2 ${
                        selectedPayroll.status === 'paid' ? 'bg-success' :
                        selectedPayroll.status === 'pending' ? 'bg-warning' : 'bg-secondary'
                      }`}>
                        {selectedPayroll.status?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold">Earnings</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td>Basic Salary</td><td className="text-end">{formatCurrency(selectedPayroll.basicSalary)}</td></tr>
                        <tr><td>Allowances</td><td className="text-end">{formatCurrency(selectedPayroll.allowances)}</td></tr>
                        <tr><td>Bonus</td><td className="text-end">{formatCurrency(selectedPayroll.bonus)}</td></tr>
                        <tr className="fw-bold bg-light">
                          <td>Gross Salary</td>
                          <td className="text-end">{formatCurrency(selectedPayroll.grossSalary)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold">Deductions</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td>Tax</td><td className="text-end text-danger">{formatCurrency(selectedPayroll.tax)}</td></tr>
                        <tr><td>Other Deductions</td><td className="text-end text-danger">{formatCurrency(selectedPayroll.deductions)}</td></tr>
                        <tr className="fw-bold bg-light">
                          <td>Total Deductions</td>
                          <td className="text-end text-danger">{formatCurrency((selectedPayroll.tax || 0) + (selectedPayroll.deductions || 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="alert alert-success mt-4" role="alert">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">NET SALARY</h5>
                    <h4 className="mb-0 fw-bold">{formatCurrency(selectedPayroll.netSalary)}</h4>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDetailModal(false); setSelectedPayroll(null); }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{uploadTarget?.fileName ? 'Replace Payslip' : 'Upload Payslip'}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowUploadModal(false); setUploadTarget(null); setUploadFile(null); setUploadForm(createDefaultUploadForm()); }}></button>
              </div>
              <form onSubmit={handlePayslipUpload}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Employee</label>
                    <select
                      className="form-select"
                      value={uploadForm.employeeId}
                      onChange={(event) => handleUploadFormChange('employeeId', event.target.value)}
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.firstName} {employee.lastName} ({employee.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Month</label>
                      <select
                        className="form-select"
                        value={uploadForm.month}
                        onChange={(event) => handleUploadFormChange('month', event.target.value)}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((monthValue) => (
                          <option key={monthValue} value={monthValue}>
                            {new Date(2000, monthValue - 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Year</label>
                      <input
                        type="number"
                        className="form-control"
                        min="2000"
                        value={uploadForm.year}
                        onChange={(event) => handleUploadFormChange('year', event.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3 mt-3">
                    <label className="form-label">Remarks (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={uploadForm.remarks}
                      onChange={(event) => handleUploadFormChange('remarks', event.target.value)}
                      placeholder="e.g., Confirmed by Finance"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Payslip PDF</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="form-control"
                      onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                      required
                    />
                    <small className="text-muted">PDF only. Files are compressed and stored securely on the server.</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setShowUploadModal(false); setUploadTarget(null); setUploadFile(null); setUploadForm(createDefaultUploadForm()); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploadingPayslip || !uploadFile}
                  >
                    {uploadingPayslip ? 'Uploading...' : 'Save Payslip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Viewer */}
      {viewerState.open && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-dialog modal-xl" style={{ maxWidth: '80vw' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{viewerState.title || 'Payslip Preview'}</h5>
                <button type="button" className="btn-close" onClick={closeViewer}></button>
              </div>
              <div className="modal-body bg-light" style={{ minHeight: '80vh', padding: '0.5rem' }}>
                {viewerLoading && viewerPages.length === 0 ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                    {viewerPages.map((src, index) => (
                      <div key={`payslip-page-${index}`} className="mb-4">
                        <img
                          src={src}
                          alt={`Payslip page ${index + 1}`}
                          style={{ width: '100%', height: 'auto', boxShadow: '0 0 12px rgba(0,0,0,0.1)' }}
                        />
                        <div className="text-center text-muted mt-2">Page {index + 1}</div>
                      </div>
                    ))}
                    {viewerPages.length === 0 && !viewerLoading && (
                      <p className="text-center text-muted mb-0">Unable to display this payslip.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
