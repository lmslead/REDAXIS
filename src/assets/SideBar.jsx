import React from "react";
import { NavLink } from "react-router-dom";
import profile from "../assets/Photo.jpg";
import logo from "../assets/HRMS_Logo.png";

const items = [
  { name: "Dashboard", icon: "bi-speedometer2", path: "/" },
  { name: "Chat", icon: "bi-chat-dots", path: "/chat" },
  { name: "Employees", icon: "bi-people", path: "/employees" },
  { name: "Feed", icon: "bi-newspaper", path: "/feed" },
  { name: "Recognition", icon: "bi-award", path: "/recognition" },
  { name: "Event", icon: "bi-calendar-event", path: "/event" },
  { name: "Profile", icon: "bi-person", path: "/profile" },
  { name: "Settings", icon: "bi-gear", path: "/settings" },
];

export default function SideBar() {
  return (
    <div
      className="sidebar d-flex flex-column text-white vh-100 p-3"
      style={{ 
        minWidth: "202px", 
        maxWidth: "224px", 
        width: "18vw", 
        backgroundColor: "#697CE8" 
      }}
    >
      <div className="text-center mb-3">
        <img
          src={logo}
          alt="HRMS Logo"
          className="mb-2"
          style={{ 
            width: "100%", 
            maxWidth: "157px",
            height: "auto" 
          }}
        />
        <br />
        <div className="d-flex align-items-center">
          <img
            src={profile}
            alt="Profile"
            className="rounded-circle me-2"
            style={{ 
              width: "45px", 
              height: "45px", 
              objectFit: "cover",
              minWidth: "45px"
            }}
          />
          <div>
            <h6 className="fw-bold mb-1" style={{ fontSize: "0.9rem" }}>Maria</h6>
            <small style={{ fontSize: "0.73rem" }}>HR Manager</small>
          </div>
        </div>
      </div>

      <div className="nav-links mt-2 flex-grow-1">
        {items.map((item) => (
          <NavLink
            to={item.path}
            key={item.name}
            className={({ isActive }) =>
              `py-2 px-2 rounded d-flex align-items-center text-decoration-none ${
                isActive ? "bg-light text-dark fw-bold" : "text-white"
              }`
            }
            style={{ 
              marginBottom: "14px",
              fontSize: "0.9rem",
              whiteSpace: "nowrap"
            }}
          >
            <i className={`bi ${item.icon} me-2`} style={{ minWidth: "17px", fontSize: "0.98rem" }}></i>
            <span className="nav-text">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}