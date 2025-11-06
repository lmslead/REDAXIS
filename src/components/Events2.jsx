import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe } from "react-icons/fa";
import eventImg from "../assets/EventO.png";
import { eventsAPI } from "../services/api";
import "../App.css";

const Events2 = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Received from Event1 via navigate state
  const { date, time, timezone } = location.state || {};

  // States for form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [conferenceDetails, setConferenceDetails] = useState("");
  const [duration, setDuration] = useState("30 min");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!eventTitle || !eventTitle.trim()) {
      alert('Please enter an event title');
      return;
    }
    
    if (!time || !time.trim()) {
      alert('Please select a time from the previous page');
      return;
    }
    
    if (!date) {
      alert('Please select a date from the previous page');
      return;
    }
    
    setLoading(true);

    try {
      // Create event in backend
      const eventData = {
        title: eventTitle,
        date: new Date(date),
        time: time,
        timezone: timezone || 'Asia/Kolkata',
        duration: duration || '30 min',
        conferenceDetails: conferenceDetails || "Web conferencing details provided upon confirmation.",
      };

      const response = await eventsAPI.create(eventData);

      // Join the event as a participant
      if (response.data && response.data._id) {
        await eventsAPI.join(response.data._id, { name, email });
      }

      navigate("/event/confirmation", {
        state: {
          name,
          email,
          eventTitle,
          conferenceDetails: eventData.conferenceDetails,
          duration: eventData.duration,
          date,
          time,
          timezone: eventData.timezone,
        },
      });
    } catch (error) {
      alert(error.message || "Failed to create event");
      setLoading(false);
    }
  };

  return (
    <div className="container my-4">
      <div className="row g-4">
        {/* Event Details */}
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <div className="d-flex align-items-center gap-3 mb-4">
              <img
                src={eventImg}
                alt="Organizer"
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #6A7ADA",
                }}
              />
              <div>
                <div className="fw-medium text-dark">Maria</div>
                <h2 className="fw-bold fs-5 mb-0 text-primary">
                  {eventTitle || "Event title"}
                </h2>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaClock />
              <span className="text-muted fst-italic small">
                {time || "Time not selected"} - {date || "Date not selected"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaCalendarAlt />
              <span className="text-muted fst-italic small">
                {duration || "30 min"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaVideo />
              <span className="text-muted fst-italic small">
                {conferenceDetails ||
                  "Web conferencing details provided upon confirmation."}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <FaGlobe />
              <span className="text-muted fst-italic small">
                {timezone || "Time zone not selected"}
              </span>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <h2 className="fw-bold fs-5 text-primary mb-3">
              Fill Your Details here -
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Event Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter event title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 30 min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Web Conferencing Details 
                  <span className="text-primary ms-1">*</span>
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                  value={conferenceDetails}
                  onChange={(e) => setConferenceDetails(e.target.value)}
                />
                <small className="text-muted">
                  Add your meeting link (Zoom, Google Meet, Teams, etc.) so participants can join directly
                </small>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating Event...' : 'Submit'}
              </button>

              <p className="mt-3 small text-muted">
                By proceeding, you confirm that you have read and agree to
                <a href="#" className="text-decoration-none ms-1 text-primary">
                  Calendly’s Terms of Use
                </a>{" "}
                and
                <a href="#" className="text-decoration-none ms-1 text-primary">
                  Privacy Notice
                </a>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events2;
