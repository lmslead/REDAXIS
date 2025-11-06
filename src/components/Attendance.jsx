import { useState, useEffect } from 'react';
import { attendanceAPI, employeesAPI, getUser, leaveAPI } from '../services/api';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Attendance.css';

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('month'); // 'month' or 'date'
  const [specificDate, setSpecificDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  const currentUser = getUser();
  console.log('🔍 Current user from localStorage:', currentUser);
  const canManage = currentUser?.managementLevel >= 1; // L1, L2, L3 can manage team attendance

  useEffect(() => {
    // Fetch employees if admin/HR
    if (canManage) {
      employeesAPI.getAll().then(response => {
        // Backend already filters based on permissions, no need for client-side filtering
        setEmployees(response.data);
      }).catch(error => {
        console.error('Error fetching employees:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  useEffect(() => {
    fetchAttendance();
    fetchStats();
    checkTodayStatus();
  }, [selectedDate, selectedEmployee, filterMonth, filterYear, filterType, specificDate]);

  const fetchAttendance = async () => {
    try {
      let startDate, endDate;
      
      if (filterType === 'date' && specificDate) {
        // Filter by specific date - use simple date strings
        startDate = specificDate;
        endDate = specificDate;
      } else {
        // Filter by month - use first and last day as simple dates
        const firstDay = new Date(filterYear, filterMonth, 1);
        const lastDay = new Date(filterYear, filterMonth + 1, 0);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
      }
      
      const params = {
        startDate,
        endDate,
      };
      
      // If regular employee, always filter to their own records
      if (!canManage) {
        const userId = currentUser._id || currentUser.id;
        console.log('Employee filtering - User ID:', userId);
        console.log('Current User:', currentUser);
        if (userId) {
          params.employeeId = userId;
        }
      }
      // If admin/HR and employee selected, filter by that employee
      else if (canManage && selectedEmployee) {
        params.employeeId = selectedEmployee;
      }
      
      console.log('=== FETCH ATTENDANCE START ===');
      console.log('Params:', JSON.stringify(params, null, 2));
      console.log('StartDate:', params.startDate);
      console.log('EndDate:', params.endDate);
      console.log('EmployeeId:', params.employeeId);
      
      const response = await attendanceAPI.getAll(params);
      
      console.log('Response:', response);
      console.log('Response.data:', response.data);
      console.log('Record count:', response.data?.length || 0);
      
      if (response.data && response.data.length > 0) {
        console.log('First record:', response.data[0]);
      } else {
        console.warn('⚠️ NO RECORDS RETURNED! Check backend logs.');
      }
      console.log('=== FETCH ATTENDANCE END ===\n');
      
      // Filter out records with null/undefined employee references
      const validRecords = response.data ? response.data.filter(record => record && record.employee) : [];
      console.log('Valid records (with employee):', validRecords.length);
      if (response.data && response.data.length !== validRecords.length) {
        console.warn(`⚠️ Filtered out ${response.data.length - validRecords.length} records with null employees`);
      }
      
      console.log('📝 Setting attendanceRecords state with:', validRecords.length, 'records');
      console.log('Sample record structure:', validRecords[0]);
      setAttendanceRecords(validRecords);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      let startDate, endDate;
      
      if (filterType === 'date' && specificDate) {
        // Stats for specific date - use simple date strings
        startDate = specificDate;
        endDate = specificDate;
      } else {
        // Stats for current month - use first and last day as simple dates
        const firstDay = new Date(filterYear, filterMonth, 1);
        const lastDay = new Date(filterYear, filterMonth + 1, 0);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
      }
      
      const params = {
        startDate,
        endDate,
      };
      
      // If regular employee, always filter to their own records
      if (!canManage) {
        const userId = currentUser._id || currentUser.id;
        console.log('Employee stats - User ID:', userId);
        if (userId) {
          params.employeeId = userId;
        }
      }
      // If admin/HR and employee selected, add employee filter
      else if (canManage && selectedEmployee) {
        params.employeeId = selectedEmployee;
      }
      
      console.log('Fetching stats with params:', params);
      const response = await attendanceAPI.getStats(params);
      console.log('Stats response:', response);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        totalDays: 0,
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        attendancePercentage: 0
      });
    }
  };

  const checkTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log('=== ATTENDANCE CHECK TODAY STATUS START ===');
      console.log('Today date:', today);
      console.log('Current user:', currentUser);
      
      const userId = currentUser._id || currentUser.id;
      console.log('User ID:', userId);
      
      // Pass employeeId to only get current user's attendance
      const response = await attendanceAPI.getAll({
        startDate: today,
        endDate: today,
        employeeId: userId  // Add employeeId filter
      });
      
      console.log('API Response:', response);
      console.log('Filtered records:', response.data);
      
      // Since we filtered by employeeId, there should be 0 or 1 record
      const myRecord = response.data && response.data.length > 0 ? response.data[0] : null;
      
      console.log('Attendance RESULT:', {
        foundRecord: !!myRecord,
        myRecord,
        hasCheckOut: myRecord?.checkOut,
        willShowCheckOut: myRecord ? !myRecord.checkOut : false
      });
      console.log('=== ATTENDANCE CHECK TODAY STATUS END ===\n');
      
      if (myRecord) {
        setTodayAttendance(myRecord);
        const shouldShowCheckOut = !myRecord.checkOut;
        console.log('✅ Attendance: Setting checkedIn to:', shouldShowCheckOut);
        setCheckedIn(shouldShowCheckOut);
      } else {
        console.log('❌ Attendance: No record found');
        setTodayAttendance(null);
        setCheckedIn(false);
      }
    } catch (error) {
      console.error('❌ Attendance checkTodayStatus error:', error);
      setTodayAttendance(null);
      setCheckedIn(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      console.log('Attendance handleCheckIn: Starting check-in...');
      const response = await attendanceAPI.checkIn();
      
      console.log('Attendance handleCheckIn: Response received:', response);
      
      // Check if the response indicates already checked in
      if (response.success === false) {
        alert(response.message || 'Already checked in today');
        console.log('Attendance handleCheckIn: Already checked in, refreshing...');
        // Refresh the status to update UI
        await checkTodayStatus();
        await fetchAttendance();
        await fetchStats();
        return;
      }
      
      alert('Checked in successfully!');
      console.log('Attendance handleCheckIn: Success! Refreshing data...');
      // Refresh status from server to ensure UI is correct
      await checkTodayStatus();
      await fetchAttendance();
      await fetchStats();
    } catch (error) {
      console.error('Attendance handleCheckIn: Error occurred:', error);
      alert(error.message || 'Check-in failed');
      // Refresh status in case of "already checked in" error
      await checkTodayStatus();
      await fetchAttendance();
      await fetchStats();
    }
  };

  const handleCheckOut = async () => {
    try {
      console.log('Attendance handleCheckOut: Starting check-out...');
      const response = await attendanceAPI.checkOut();
      
      console.log('Attendance handleCheckOut: Response received:', response);
      
      // Check if the response indicates already checked out
      if (response.success === false) {
        alert(response.message || 'Already checked out today');
        console.log('Attendance handleCheckOut: Already checked out, refreshing...');
        // Refresh the status to update UI
        await checkTodayStatus();
        await fetchAttendance();
        await fetchStats();
        return;
      }
      
      alert('Checked out successfully!');
      console.log('Attendance handleCheckOut: Success! Refreshing data...');
      // Refresh status from server to ensure UI is correct
      await checkTodayStatus();
      await fetchAttendance();
      await fetchStats();
    } catch (error) {
      console.error('Attendance handleCheckOut: Error occurred:', error);
      alert(error.message || 'Check-out failed');
      // Refresh status in case of "already checked out" error
      await checkTodayStatus();
      await fetchAttendance();
      await fetchStats();
    }
  };

  const handleSyncLeaves = async () => {
    if (!canManage) {
      alert('Only Admin and HR can sync leaves');
      return;
    }

    try {
      setSyncing(true);
      console.log('🔄 Starting leave sync...');
      
      const response = await leaveAPI.syncToAttendance();
      
      console.log('✅ Sync response:', response);
      
      if (response.success) {
        alert(`✅ Successfully synced ${response.successCount} approved leaves to attendance!`);
        // Refresh all data to show the newly synced leaves
        await fetchAttendance();
        await fetchStats();
        await checkTodayStatus();
      } else {
        alert('⚠️ Sync completed with issues. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Error syncing leaves:', error);
      alert(`❌ Failed to sync leaves: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const exportToCSV = () => {
    // Prepare data for export
    const employeeName = selectedEmployee 
      ? employees.find(emp => emp._id === selectedEmployee)
      : null;
    
    let filename;
    if (filterType === 'date' && specificDate) {
      const dateStr = new Date(specificDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).replace(/\s/g, '_');
      filename = selectedEmployee && employeeName
        ? `${employeeName?.firstName || 'Employee'}_${employeeName?.lastName || 'Unknown'}_Attendance_${dateStr}.csv`
        : `All_Employees_Attendance_${dateStr}.csv`;
    } else {
      const monthName = new Date(filterYear, filterMonth).toLocaleDateString('en-US', { month: 'long' });
      filename = selectedEmployee && employeeName
        ? `${employeeName?.firstName || 'Employee'}_${employeeName?.lastName || 'Unknown'}_Attendance_${monthName}_${filterYear}.csv`
        : `All_Employees_Attendance_${monthName}_${filterYear}.csv`;
    }
    
    // CSV headers
    let csv = 'Date,Employee,Employee ID,Check-In,Check-Out,Working Hours,Status\n';
    
    // CSV data rows
    attendanceRecords
      .filter(record => {
        // Filter for regular employees
        if (!canManage) {
          return record.employee?._id === currentUser._id || record.employee === currentUser._id;
        }
        
        // L2 users cannot view L2 and L3 level users' attendance
        if (currentUser?.managementLevel === 2) {
          const employeeLevel = typeof record.employee === 'object' && record.employee
            ? record.employee.managementLevel
            : null;
          if (employeeLevel >= 2) return false; // Exclude L2 and L3
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(record => {
        const employeeName = typeof record.employee === 'object' && record.employee
          ? `${record.employee.firstName || 'Unknown'} ${record.employee.lastName || 'User'}`
          : 'Unknown';
        const employeeId = typeof record.employee === 'object' && record.employee
          ? record.employee.employeeId || 'N/A'
          : 'N/A';
        const date = new Date(record.date).toLocaleDateString();
        const checkIn = formatTime(record.checkIn);
        const checkOut = formatTime(record.checkOut);
        const workingHours = calculateWorkingHours(record.checkIn, record.checkOut);
        const status = record.status?.toUpperCase() || 'N/A';
        
        csv += `${date},"${employeeName}",${employeeId},${checkIn},${checkOut},${workingHours},${status}\n`;
      });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Attendance sheet exported successfully as ${filename}`);
  };

  const getAttendanceForDate = (date) => {
    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      console.warn('⚠️ attendanceRecords is not an array:', attendanceRecords);
      return [];
    }
    const dateStr = date.toISOString().split('T')[0];
    const filtered = attendanceRecords.filter(record => 
      record && record.date && new Date(record.date).toISOString().split('T')[0] === dateStr
    );
    
    if (filtered.length > 0) {
      console.log(`📊 getAttendanceForDate(${dateStr}):`, filtered.length, 'records');
    }
    
    return filtered;
  };

  const tileClassName = ({ date }) => {
    if (!date) return '';
    
    const records = getAttendanceForDate(date);
    if (!records || records.length === 0) {
      return '';
    }
    
    // Get current user from getUser() function
    const user = getUser();
    if (!user) {
      console.warn('⚠️ No user from getUser() in tileClassName');
      return '';
    }
    
    // Try multiple ID formats: _id, id, userId
    const userId = user._id || user.id || user.userId;
    if (!userId) {
      console.warn('⚠️ No user ID found in user object:', JSON.stringify(user));
      return '';
    }
    
    // Debug logging for troubleshooting
    const dateStr = date.toISOString().split('T')[0];
    console.log(`📅 Tile for ${dateStr}:`, {
      recordsCount: records.length,
      canManage,
      selectedEmployee,
      userId,
      userObject: user,
      records: records.map(r => ({
        employeeId: typeof r.employee === 'object' ? r.employee?._id : r.employee,
        employeeObject: r.employee,
        status: r.status,
        date: r.date
      }))
    });
    
    // For admin/HR viewing filtered employee, or for employee viewing own data
    let myRecord;
    if (canManage && selectedEmployee) {
      // Admin/HR viewing specific employee
      myRecord = records.find(r => {
        if (!r || !r.employee) return false;
        const empId = typeof r.employee === 'object' ? (r.employee?._id || r.employee?.id) : r.employee;
        const match = empId === selectedEmployee;
        console.log(`  Checking employee filter: ${empId} === ${selectedEmployee} ? ${match}`);
        return match;
      });
    } else {
      // Employee viewing own data OR admin viewing all (show current user's record)
      myRecord = records.find(r => {
        if (!r || !r.employee) return false;
        const empId = typeof r.employee === 'object' ? (r.employee?._id || r.employee?.id) : r.employee;
        const match = empId === userId || empId?.toString() === userId?.toString();
        console.log(`  Checking user match: ${empId} === ${userId} ? ${match}`);
        if (match) {
          console.log(`✅ Found matching record for ${dateStr}:`, r.status);
        }
        return match;
      });
    }
    
    if (myRecord && myRecord.status) {
      const className = myRecord.status === 'present' ? 'attendance-present' :
                       myRecord.status === 'absent' ? 'attendance-absent' :
                       myRecord.status === 'half-day' ? 'attendance-halfday' :
                       myRecord.status === 'on-leave' ? 'attendance-leave' : '';
      
      console.log(`🎨 Applying class "${className}" for ${dateStr}`, myRecord);
      return className;
    }
    
    console.log(`❌ No matching record found for ${dateStr}`);
    return '';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return new Date(timeStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
          <h2 className="fw-bold">Attendance Management</h2>
          <p className="text-muted">Track and manage attendance records</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Days</p>
                  <h3 className="fw-bold mb-0">{stats?.totalDays || 0}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="bi bi-calendar-check text-primary fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Present</p>
                  <h3 className="fw-bold mb-0 text-success">{stats?.present || 0}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Absent</p>
                  <h3 className="fw-bold mb-0 text-danger">{stats?.absent || 0}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <i className="bi bi-x-circle text-danger fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Attendance %</p>
                  <h3 className="fw-bold mb-0 text-info">
                    {stats?.attendancePercentage ? `${stats.attendancePercentage.toFixed(1)}%` : '0%'}
                  </h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <i className="bi bi-pie-chart text-info fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters for Admin/HR */}
      {canManage && (
        <div className="row mb-4">
          <div className="col-md-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="fw-bold mb-3">
                  <i className="bi bi-funnel me-2"></i>
                  Filters
                </h5>
                
                {/* Filter Type Toggle */}
                <div className="mb-3">
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn ${filterType === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => {
                        setFilterType('month');
                        setSpecificDate('');
                      }}
                    >
                      <i className="bi bi-calendar-month me-2"></i>
                      Filter by Month
                    </button>
                    <button
                      type="button"
                      className={`btn ${filterType === 'date' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setFilterType('date')}
                    >
                      <i className="bi bi-calendar-day me-2"></i>
                      Filter by Specific Date
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  {canManage && (
                    <div className="col-md-3">
                      <label className="form-label">Employee</label>
                      <select 
                        className="form-select"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                      >
                        <option value="">All Employees</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filterType === 'month' ? (
                    <>
                      <div className="col-md-3">
                        <label className="form-label">Month</label>
                        <select 
                          className="form-select"
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        >
                          <option value="0">January</option>
                          <option value="1">February</option>
                          <option value="2">March</option>
                          <option value="3">April</option>
                          <option value="4">May</option>
                          <option value="5">June</option>
                          <option value="6">July</option>
                          <option value="7">August</option>
                          <option value="8">September</option>
                          <option value="9">October</option>
                          <option value="10">November</option>
                          <option value="11">December</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Year</label>
                        <select 
                          className="form-select"
                          value={filterYear}
                          onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        >
                          <option value="2023">2023</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label">Select Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}

                  <div className="col-md-3 d-flex align-items-end">
                    <button 
                      className="btn btn-secondary w-100 me-2"
                      onClick={() => {
                        setFilterType('month');
                        setFilterMonth(new Date().getMonth());
                        setFilterYear(new Date().getFullYear());
                        setSelectedEmployee('');
                        setSpecificDate('');
                      }}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Reset Filters
                    </button>
                  </div>

                  <div className="col-md-3 d-flex align-items-end">
                    <button 
                      className="btn btn-success w-100"
                      onClick={handleSyncLeaves}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-repeat me-2"></i>
                          Sync Approved Leaves
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Calendar */}
        <div className="col-md-4 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Attendance Calendar</h5>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileClassName={tileClassName}
                className="w-100 border-0"
              />
              <div className="mt-3">
                <div className="d-flex align-items-center mb-2">
                  <span className="attendance-legend attendance-present me-2"></span>
                  <small>Present</small>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <span className="attendance-legend attendance-absent me-2"></span>
                  <small>Absent</small>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <span className="attendance-legend attendance-halfday me-2"></span>
                  <small>Half Day</small>
                </div>
                <div className="d-flex align-items-center">
                  <span className="attendance-legend attendance-leave me-2"></span>
                  <small>On Leave</small>
                </div>
              </div>
            </div>
          </div>

          {/* Check In/Out Card */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Today's Attendance</h5>
              {todayAttendance ? (
                <div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Check-In</small>
                    <strong>{formatTime(todayAttendance.checkIn)}</strong>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Check-Out</small>
                    <strong>{formatTime(todayAttendance.checkOut)}</strong>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Working Hours</small>
                    <strong>{calculateWorkingHours(todayAttendance.checkIn, todayAttendance.checkOut)}</strong>
                  </div>
                </div>
              ) : (
                <p className="text-muted">No attendance recorded today</p>
              )}
              
              <div className="d-grid gap-2 mt-3">
                {!checkedIn ? (
                  <button className="btn btn-success" onClick={handleCheckIn}>
                    <i className="bi bi-box-arrow-in-right me-2"></i>Check In
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={handleCheckOut}>
                    <i className="bi bi-box-arrow-right me-2"></i>Check Out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  Attendance Records - {
                    filterType === 'date' && specificDate
                      ? new Date(specificDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : new Date(filterYear, filterMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  }
                  {canManage && selectedEmployee && (
                    <span className="text-primary ms-2">
                      ({employees.find(emp => emp._id === selectedEmployee)?.firstName} {employees.find(emp => emp._id === selectedEmployee)?.lastName})
                    </span>
                  )}
                </h5>
                {canManage && attendanceRecords.length > 0 && (
                  <button className="btn btn-success btn-sm" onClick={exportToCSV}>
                    <i className="bi bi-download me-2"></i>Export CSV
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {canManage && !selectedEmployee && <th>Employee</th>}
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={canManage && !selectedEmployee ? "6" : "5"} className="text-center text-muted py-4">
                          No attendance records found for this period
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords
                        .filter(record => {
                          if (!record) return false;
                          
                          // Backend already filters based on permissions, no need for client-side level filtering
                          
                          // For regular employees, only show their own records
                          if (!canManage) {
                            const userId = currentUser?._id || currentUser?.id;
                            const employeeId = typeof record.employee === 'object' && record.employee
                              ? (record.employee._id || record.employee.id)
                              : record.employee;
                            return employeeId === userId;
                          }
                          
                          // For managers/admins, show all records returned by backend
                          return true;
                        })
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(record => (
                          <tr key={record._id}>
                            <td>{new Date(record.date).toLocaleDateString()}</td>
                            {canManage && !selectedEmployee && (
                              <td>
                                {typeof record.employee === 'object' && record.employee
                                  ? `${record.employee.firstName || 'Unknown'} ${record.employee.lastName || 'User'}`
                                  : 'Unknown'}
                              </td>
                            )}
                            <td>{formatTime(record.checkIn)}</td>
                            <td>{formatTime(record.checkOut)}</td>
                            <td>{calculateWorkingHours(record.checkIn, record.checkOut)}</td>
                            <td>
                              <span className={`badge ${
                                record.status === 'present' ? 'bg-success' :
                                record.status === 'absent' ? 'bg-danger' :
                                record.status === 'half-day' ? 'bg-warning' :
                                record.status === 'on-leave' ? 'bg-info' : 'bg-secondary'
                              }`}>
                                {record.status?.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
                {attendanceRecords.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    <p>No attendance records found for this month</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
