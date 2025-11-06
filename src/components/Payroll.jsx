import { useState, useEffect } from 'react';
import { payrollAPI, getUser } from '../services/api';
import './Payroll.css';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  const currentUser = getUser();
  const canManage = currentUser?.managementLevel >= 2; // Only L2 and L3 can manage payroll

  useEffect(() => {
    fetchPayrolls();
  }, [filterMonth, filterYear]);

  const fetchPayrolls = async () => {
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
    }).format(amount || 0);
  };

  const downloadPayslip = (payroll) => {
    // Create a simple HTML payslip
    const payslipContent = `
      <html>
        <head>
          <title>Payslip - ${payroll.employee?.firstName} ${payroll.employee?.lastName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 1.2em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Redaxis HRMS</h1>
            <h2>PAYSLIP</h2>
            <p>${payroll.month}/${payroll.year}</p>
          </div>
          
          <div class="section">
            <h3>Employee Details</h3>
            <table>
              <tr><td>Name:</td><td>${payroll.employee?.firstName} ${payroll.employee?.lastName}</td></tr>
              <tr><td>Employee ID:</td><td>${payroll.employee?.employeeId}</td></tr>
              <tr><td>Department:</td><td>${payroll.employee?.department?.name || 'N/A'}</td></tr>
              <tr><td>Position:</td><td>${payroll.employee?.position || 'N/A'}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h3>Earnings</h3>
            <table>
              <tr><td>Basic Salary:</td><td>${formatCurrency(payroll.basicSalary)}</td></tr>
              <tr><td>Allowances:</td><td>${formatCurrency(payroll.allowances)}</td></tr>
              <tr><td>Bonus:</td><td>${formatCurrency(payroll.bonus)}</td></tr>
              <tr class="total"><td>Gross Salary:</td><td>${formatCurrency(payroll.grossSalary)}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h3>Deductions</h3>
            <table>
              <tr><td>Tax:</td><td>${formatCurrency(payroll.tax)}</td></tr>
              <tr><td>Other Deductions:</td><td>${formatCurrency(payroll.deductions)}</td></tr>
              <tr class="total"><td>Total Deductions:</td><td>${formatCurrency((payroll.tax || 0) + (payroll.deductions || 0))}</td></tr>
            </table>
          </div>
          
          <div class="section" style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            <table>
              <tr class="total" style="font-size: 1.5em; color: #28a745;">
                <td>NET SALARY:</td>
                <td>${formatCurrency(payroll.netSalary)}</td>
              </tr>
            </table>
          </div>
          
          <div class="section" style="margin-top: 50px; text-align: center; color: #666;">
            <p>This is a computer-generated document. No signature is required.</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([payslipContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payslip_${payroll.employee?.employeeId}_${payroll.month}_${payroll.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const myPayrolls = canManage ? payrolls : payrolls.filter(p => 
    p.employee?._id === currentUser._id || p.employee === currentUser._id
  );

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
                        <strong>{new Date(payroll.year, payroll.month - 1).toLocaleString('default', { month: 'long' })} {payroll.year}</strong>
                      </td>
                      <td>{formatCurrency(payroll.basicSalary)}</td>
                      <td>{formatCurrency(payroll.allowances)}</td>
                      <td className="fw-bold">{formatCurrency(payroll.grossSalary)}</td>
                      <td className="text-danger">{formatCurrency((payroll.tax || 0) + (payroll.deductions || 0))}</td>
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
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => downloadPayslip(payroll)}
                        >
                          <i className="bi bi-download"></i>
                        </button>
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
                <button type="button" className="btn btn-success" onClick={() => downloadPayslip(selectedPayroll)}>
                  <i className="bi bi-download me-2"></i>Download Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
