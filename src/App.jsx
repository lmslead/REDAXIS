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
import { getToken, authAPI } from "./services/api";

const MOBILE_BREAKPOINT = 992;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const getIsMobile = () =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false;

  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(getIsMobile);
  const [sidebarOpen, setSidebarOpen] = useState(() => !getIsMobile());

  useEffect(() => {
    checkAuth();
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

  const checkAuth = async () => {
    const token = getToken();
    if (token) {
      try {
        await authAPI.getMe();
      } catch (error) {
        console.error("Auth check failed:", error);
        authAPI.logout();
      }
    }
    setLoading(false);
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
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="app-shell d-flex">
              <Sidebar
                isMobile={isMobileView}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
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
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/resignation" element={<Resignation />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
