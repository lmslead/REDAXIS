import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./components/SideBar";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Event2 from "./components/Events2";
import Event1 from "./components/Event1";
import Event3 from "./components/Event3";
import Employees from "./components/Employees";
import DepartmentManagement from "./components/DepartmentManagement";
import Profile from "./components/Profile";
import Attendance from "./components/Attendance";
import Payroll from "./components/Payroll";
import Feed from "./components/Feed";
import Recognition from "./components/Recognition";
import Chat from "./components/Chat";
import Settings from "./components/Settings";
import Leaves from "./components/Leaves";
import MyTeam from "./components/MyTeam";
import Assets from "./components/Assets";
import Resignation from "./components/Resignation";
import Policies from "./components/Policies";
import PolicyGate from "./components/PolicyGate";
import ScreenshotShield from "./components/ScreenshotShield";
import Polls from "./components/Polls";
import { getToken, authAPI, setUser as persistUser, getUser, policiesAPI } from "./services/api";

const MOBILE_BREAKPOINT = 992;

const hasAcknowledgedPolicies = (user) => {
  if (!user) {
    return false;
  }
  const transportAck = user?.policyAcknowledgements?.transportPolicy?.acknowledged;
  const attendanceAck = user?.policyAcknowledgements?.attendanceLeavePolicy?.acknowledged;
  return Boolean(transportAck && attendanceAck);
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const getIsMobile = () =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false;

  const [loading, setLoading] = useState(true);
  const [appUser, setAppUser] = useState(() => getUser());
  const [isMobileView, setIsMobileView] = useState(getIsMobile);
  const [sidebarOpen, setSidebarOpen] = useState(() => !getIsMobile());
  const [needsPolicyAcknowledgement, setNeedsPolicyAcknowledgement] = useState(
    () => !hasAcknowledgedPolicies(getUser())
  );
  const [policyAckError, setPolicyAckError] = useState("");
  const [policyAckLoading, setPolicyAckLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAuthChanged = () => {
      checkAuth();
    };

    window.addEventListener("rg-auth-changed", handleAuthChanged);
    return () => window.removeEventListener("rg-auth-changed", handleAuthChanged);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setIsMobileView(getIsMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobileView);
  }, [isMobileView]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!isMobileView) {
      document.body.style.overflow = "";
      return;
    }
    
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileView, sidebarOpen]);

  useEffect(() => {
    if (!needsPolicyAcknowledgement) {
      setPolicyAckError("");
    }
  }, [needsPolicyAcknowledgement]);

  const checkAuth = async () => {
    const token = getToken();
    if (!token) {
      setAppUser(null);
      setNeedsPolicyAcknowledgement(false);
      setLoading(false);
      return;
    }
    try {
      const response = await authAPI.getMe();
      persistUser(response.data);
      setAppUser(response.data);
      setNeedsPolicyAcknowledgement(!hasAcknowledgedPolicies(response.data));
    } catch (error) {
      console.error("Auth check failed:", error);
      authAPI.logout();
      setAppUser(null);
      setNeedsPolicyAcknowledgement(false);
    }
    setLoading(false);
  };

  const handlePolicyAcknowledgement = async ({ policies }) => {
    if (policyAckLoading) {
      return;
    }

    setPolicyAckError("");
    setPolicyAckLoading(true);

    try {
      const response = await policiesAPI.acknowledge({ policies });
      persistUser(response.data);
      setAppUser(response.data);
      setNeedsPolicyAcknowledgement(false);
    } catch (error) {
      setPolicyAckError(error.message || "Unable to record acknowledgement. Please try again.");
    } finally {
      setPolicyAckLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScreenshotShield user={appUser} />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <div className="app-shell d-flex">
                  <Sidebar
                    isMobile={isMobileView}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    user={appUser}
                  />
                  {isMobileView && sidebarOpen && (
                    <div
                      className="sidebar-overlay"
                      onClick={() => setSidebarOpen(false)}
                    ></div>
                  )}
                  <div className="app-shell__content flex-grow-1 p-4">
                    {isMobileView && (
                      <button
                        type="button"
                        className="sidebar-toggle btn btn-light shadow-sm mb-3"
                        onClick={() => setSidebarOpen(true)}
                      >
                        <span className="sidebar-toggle__icon" />
                        Menu
                      </button>
                    )}
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/event" element={<Event1 />} />
                      <Route path="/event/schedule" element={<Event2 />} />
                      <Route path="/event/confirmation" element={<Event3 />} />
                      <Route path="/employees" element={<Employees />} />
                      <Route path="/departments" element={<DepartmentManagement />} />
                      <Route path="/my-team" element={<MyTeam />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/attendance" element={<Attendance />} />
                      <Route path="/leaves" element={<Leaves />} />
                      <Route path="/payroll" element={<Payroll />} />
                      <Route path="/feed" element={<Feed />} />
                      <Route path="/recognition" element={<Recognition />} />
                      <Route path="/polls" element={<Polls />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/assets" element={<Assets />} />
                      <Route path="/policies" element={<Policies />} />
                      <Route path="/exit" element={<Resignation />} />
                      <Route path="/resignation" element={<Navigate to="/exit" replace />} />
                    </Routes>
                  </div>
                </div>
                <PolicyGate
                  open={Boolean(appUser && needsPolicyAcknowledgement)}
                  onAcknowledge={handlePolicyAcknowledgement}
                  acknowledging={policyAckLoading}
                  errorMessage={policyAckError}
                />
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
