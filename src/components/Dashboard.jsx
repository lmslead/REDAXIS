import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, attendanceAPI, feedAPI } from '../services/api';
import { getUser } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    checkTodayStatus();
    fetchFeedPreview();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedPreview = async () => {
    try {
      const response = await feedAPI.getAll({ limit: 3 });
      setRecentPosts(response.data || []);
    } catch (error) {
      console.error('Error fetching feed preview:', error);
      setRecentPosts([]);
    } finally {
      setFeedLoading(false);
    }
  };

  const checkTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log('=== CHECK TODAY STATUS START ===');
      console.log('Today date:', today);
      console.log('Current user object:', user);
      
      const userId = user._id || user.id;
      console.log('User ID to match:', userId);
      
      // Pass employeeId to only get current user's attendance
      const response = await attendanceAPI.getAll({
        startDate: today,
        endDate: today,
        employeeId: userId  // Add employeeId filter
      });
      
      console.log('API Response:', response);
      console.log('Filtered attendance records:', response.data);
      console.log('Number of records:', response.data?.length);
      
      // Since we filtered by employeeId, there should be 0 or 1 record
      const myRecord = response.data && response.data.length > 0 ? response.data[0] : null;
      
      console.log('\n=== FINAL RESULT ===');
      console.log('My Record:', myRecord);
      console.log('Found Record:', !!myRecord);
      console.log('Has CheckOut:', myRecord?.checkOut);
      console.log('Will show Check Out button:', myRecord ? !myRecord.checkOut : false);
      console.log('=== CHECK TODAY STATUS END ===\n');
      
      if (myRecord && myRecord.checkIn) {
        // Record exists AND has check-in time
        setTodayAttendance(myRecord);
        const shouldShowCheckOut = !myRecord.checkOut;
        console.log('✅ Setting checkedIn to:', shouldShowCheckOut);
        setCheckedIn(shouldShowCheckOut);
      } else {
        console.log('❌ No check-in record found for today - setting checkedIn to false');
        setTodayAttendance(null);
        setCheckedIn(false);
      }
    } catch (error) {
      console.error('❌ Error checking today status:', error);
      setTodayAttendance(null);
      setCheckedIn(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      console.log('handleCheckIn: Starting check-in...');
      const response = await attendanceAPI.checkIn();
      
      console.log('handleCheckIn: Response received:', response);
      
      // Check if the response indicates already checked in
      if (response.success === false) {
        alert(response.message || 'Already checked in today');
        console.log('handleCheckIn: Already checked in, refreshing status...');
        // Refresh the status to update UI
        await checkTodayStatus();
        return;
      }
      
      alert('Checked in successfully!');
      console.log('handleCheckIn: Success! Refreshing status and data...');
      // Refresh status from server to ensure UI is correct
      await checkTodayStatus();
      await fetchDashboardData();
    } catch (error) {
      console.error('handleCheckIn: Error occurred:', error);
      alert(error.message || 'Check-in failed');
      // Refresh status in case of "already checked in" error
      await checkTodayStatus();
    }
  };

  const handleCheckOut = async () => {
    try {
      console.log('handleCheckOut: Starting check-out...');
      const response = await attendanceAPI.checkOut();
      
      console.log('handleCheckOut: Response received:', response);
      
      // Check if the response indicates already checked out
      if (response.success === false) {
        alert(response.message || 'Already checked out today');
        console.log('handleCheckOut: Already checked out, refreshing status...');
        // Refresh the status to update UI
        await checkTodayStatus();
        return;
      }
      
      alert('Checked out successfully!');
      console.log('handleCheckOut: Success! Refreshing status and data...');
      // Refresh status from server to ensure UI is correct
      await checkTodayStatus();
      await fetchDashboardData();
    } catch (error) {
      console.error('handleCheckOut: Error occurred:', error);
      alert(error.message || 'Check-out failed');
      // Refresh status in case of error
      await checkTodayStatus();
    }
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
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Welcome back, {user?.firstName}!</h2>
          <p className="text-muted">Here's what's happening today</p>
        </div>
        <div className="col-auto">
          {!checkedIn ? (
            <button className="btn btn-success" onClick={handleCheckIn}>
              <i className="bi bi-clock-fill me-2"></i>Check In
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleCheckOut}>
              <i className="bi bi-clock-fill me-2"></i>Check Out
            </button>
          )}
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-2">Total Employees</h6>
                  <h3 className="fw-bold mb-0">{stats?.totalEmployees || 0}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <i className="bi bi-people-fill text-primary fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-2">Active Today</h6>
                  <h3 className="fw-bold mb-0">{stats?.todayAttendance || 0}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-check-circle-fill text-success fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-2">On Leave</h6>
                  <h3 className="fw-bold mb-0">{stats?.onLeaveEmployees || 0}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <i className="bi bi-calendar-x-fill text-warning fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted mb-2">Upcoming Events</h6>
                  <h3 className="fw-bold mb-0">{stats?.upcomingEvents || 0}</h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <i className="bi bi-calendar-event-fill text-info fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 align-items-stretch">
        <div className="col-xl-5 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-3">Quick Actions</h5>
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-primary text-start"
                  onClick={() => navigate('/leaves')}
                >
                  <i className="bi bi-calendar-plus me-2"></i>Apply for Leave
                </button>
                <button 
                  className="btn btn-outline-primary text-start"
                  onClick={() => navigate('/payroll')}
                >
                  <i className="bi bi-file-earmark-text me-2"></i>View Payslips
                </button>
                <button 
                  className="btn btn-outline-primary text-start"
                  onClick={() => navigate('/attendance')}
                >
                  <i className="bi bi-clock-history me-2"></i>Attendance History
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-7 col-lg-6">
          <div className="card border-0 shadow-sm h-100 feed-preview-card">
            <div className="card-body d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold mb-0">Company Feed</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={() => navigate('/feed')}
                >
                  View all
                  <i className="bi bi-arrow-up-right ms-1"></i>
                </button>
              </div>
              {feedLoading ? (
                <div className="text-muted small">Loading latest messages...</div>
              ) : recentPosts.length === 0 ? (
                <div className="text-muted small">No updates yet. Head to the feed to make the first announcement.</div>
              ) : (
                <div className="feed-preview-list d-flex flex-column gap-2">
                  {recentPosts.map((post) => {
                    const hasImage = Boolean(post.heroImage || (post.attachments && post.attachments.length));
                    return (
                      <button
                        type="button"
                        key={post._id}
                        className="feed-preview-item text-start"
                        onClick={() => navigate('/feed')}
                      >
                        <span
                          className="feed-preview-indicator"
                          style={{ backgroundColor: post.accentColor || '#2563eb' }}
                        ></span>
                        <div className="flex-grow-1">
                          <div className="feed-preview-title">
                            {post.title || post.content || 'Company update'}
                          </div>
                          <small className="text-muted">
                            {(post.author?.firstName && `${post.author.firstName} ${post.author.lastName || ''}`.trim()) || 'HR Team'}
                            {' • '}
                            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </small>
                        </div>
                        {hasImage && <i className="bi bi-image text-muted"></i>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-3">System Status</h5>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Active Employees</span>
                  <span className="text-success fw-bold">{stats?.activeEmployees || 0}</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{
                      width: `${((stats?.activeEmployees || 0) / (stats?.totalEmployees || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Pending Leaves</span>
                  <span className="text-warning fw-bold">{stats?.pendingLeaves || 0}</span>
                </div>
                <div className="alert alert-info mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  All systems operational
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
