import React, { useState, useEffect } from 'react';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import './Events.css';
import profile1 from "../assets/client.jpg";
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe, FaTrash } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { eventsAPI, getUser } from '../services/api';

export default function Event1() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll();
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (event) => {
    try {
      await eventsAPI.join(event._id, {});
      
      // Show success message
      alert('Successfully joined the event!');
      
      // Refresh events list
      fetchEvents();
      
      // Redirect to conference link if available
      if (event.conferenceDetails && 
          (event.conferenceDetails.startsWith('http://') || 
           event.conferenceDetails.startsWith('https://'))) {
        // Open in new tab
        window.open(event.conferenceDetails, '_blank');
      } else if (event.conferenceDetails && event.conferenceDetails.includes('http')) {
        // Try to extract URL from text
        const urlMatch = event.conferenceDetails.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          window.open(urlMatch[0], '_blank');
        } else {
          // Show conference details in alert if no URL found
          setTimeout(() => {
            alert(`Conference Details: ${event.conferenceDetails}`);
          }, 500);
        }
      } else {
        // No link available
        setTimeout(() => {
          alert(`Event joined! Conference details: ${event.conferenceDetails || 'Not provided yet'}`);
        }, 500);
      }
    } catch (error) {
      alert(error.message || 'Failed to join event');
    }
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    // Confirm before deleting
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) {
      return;
    }

    try {
      await eventsAPI.delete(eventId);
      alert('Event deleted successfully!');
      fetchEvents(); // Refresh the event list
    } catch (error) {
      alert(error.message || 'Failed to delete event');
    }
  };

  // Check if current user is the organizer of an event or is an admin
  const isEventOrganizer = (event) => {
    if (!currentUser) {
      console.log('No current user');
      return false;
    }
    
    console.log('Checking event:', event.title);
    console.log('Event organizer:', event.organizer);
    console.log('Current user:', currentUser);
    
    // Admin and HR can delete any event
    if (currentUser.managementLevel >= 2) { // L2 and L3 can manage events
      console.log('User is admin/hr - can delete');
      return true;
    }
    
    // Check if user is the organizer
    const organizerId = event.organizer?._id || event.organizer;
    const userId = currentUser._id || currentUser.id;
    
    console.log('Comparing:', organizerId, 'vs', userId);
    const canDelete = organizerId === userId;
    console.log('Can delete:', canDelete);
    
    return canDelete;
  };  const times = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  ];

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h3 className="fw-bold mb-4">Event List</h3>
      <div className="row">
        {/* LEFT SIDE */}
        <div className="col-md-5 mx-auto">
          {events.map((event) => (
            <div className="card mb-4 border-0 shadow-sm" key={event._id}>
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <img
                    src={event.organizer?.profileImage || profile1}
                    alt={event.organizerName}
                    className="me-3"
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <p className="mb-0 text-muted" style={{ fontSize: "14px" }}>
                      {event.organizerName}
                    </p>
                    <h5 className="mb-0">{event.title}</h5>
                  </div>
                </div>
                <ul className="list-unstyled small text-muted mb-3">
                  <li><FaClock /> {event.duration}</li>
                  <li className="my-2"><FaCalendarAlt /> {event.time} - {new Date(event.date).toDateString()}</li>
                  <li><FaVideo /> {event.conferenceDetails}</li>
                  <li><FaGlobe /> {event.timezone}</li>
                </ul>
                <div className="d-flex justify-content-center gap-2">
                  <button 
                    className="btn btn-primary px-4"
                    onClick={() => handleJoinEvent(event)}
                  >
                    Join Event
                  </button>
                  
                  {/* Show delete button only if current user is the organizer */}
                  {isEventOrganizer(event) && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteEvent(event._id, event.title)}
                      title="Delete Event"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-start gap-4 flex-wrap">
            <div style={{ flex: 1 }}>
              <h5 className="mb-3 fw-bold">Select a Date & Time</h5>
              <div
                className="bg-white p-3 rounded shadow-sm border mb-3"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Calendar onChange={setSelectedDate} value={selectedDate} />
              </div>

              <p className="mt-3 mb-1 fw-semibold">Time zone</p>
              <select
                className="form-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                <option value="Asia/Yerevan">Asia/Yerevan (Armenia)</option>
                <option value="America/New_York">America/New_York (USA - Eastern)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (USA - Pacific)</option>
                <option value="Europe/London">Europe/London (UK)</option>
                <option value="Europe/Berlin">Europe/Berlin (Germany)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (Japan)</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Africa/Nairobi">Africa/Nairobi (Kenya)</option>
              </select>
            </div>

            {/* Time Slots */}
            <div className="text-end" style={{ minWidth: "120px" }}>
              <p className="fw-semibold mb-2">{selectedDate.toDateString()}</p>
              <div className="d-flex flex-column gap-2">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`btn fw-semibold ${selectedTime === time ? "btn-primary" : "btn-outline-primary"}`}
                    style={{ borderRadius: "8px", borderWidth: "2px" }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <button
              className="btn btn-primary px-4 py-2 fw-bold"
              onClick={() => {
                if (!selectedTime) {
                  alert('Please select a time slot first');
                  return;
                }
                navigate("/event/schedule", {
                  state: {
                    date: selectedDate.toDateString(),
                    time: selectedTime,
                    timezone: timezone,
                  },
                });
              }}
            >
              Schedule New Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
