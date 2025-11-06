import { useState, useEffect } from 'react';
import { getUser } from '../services/api';
import './Settings.css';

const Settings = () => {
  const currentUser = getUser();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      updates: true,
      events: true,
    },
    privacy: {
      showProfile: true,
      showEmail: false,
      showPhone: false,
    },
    preferences: {
      theme: 'light',
      language: 'en',
    },
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage if available
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      // Save settings to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleNotificationChange = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handlePrivacyChange = (key) => {
    setSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: !settings.privacy[key],
      },
    });
  };

  const handlePreferenceChange = (key, value) => {
    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    });
  };

  return (
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="fw-bold">Settings</h2>
          <p className="text-muted">Manage your account preferences</p>
        </div>
        <div className="col-auto">
          {saved && (
            <div className="alert alert-success mb-0 py-2" role="alert">
              <i className="bi bi-check-circle me-2"></i>Settings saved!
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          {/* Notifications Settings */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-4">
                <i className="bi bi-bell me-2"></i>Notification Preferences
              </h5>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="emailNotif"
                  checked={settings.notifications.email}
                  onChange={() => handleNotificationChange('email')}
                />
                <label className="form-check-label" htmlFor="emailNotif">
                  Email Notifications
                  <div className="text-muted small">Receive notifications via email</div>
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="pushNotif"
                  checked={settings.notifications.push}
                  onChange={() => handleNotificationChange('push')}
                />
                <label className="form-check-label" htmlFor="pushNotif">
                  Push Notifications
                  <div className="text-muted small">Receive browser push notifications</div>
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="updatesNotif"
                  checked={settings.notifications.updates}
                  onChange={() => handleNotificationChange('updates')}
                />
                <label className="form-check-label" htmlFor="updatesNotif">
                  Company Updates
                  <div className="text-muted small">Get notified about company announcements</div>
                </label>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="eventsNotif"
                  checked={settings.notifications.events}
                  onChange={() => handleNotificationChange('events')}
                />
                <label className="form-check-label" htmlFor="eventsNotif">
                  Event Reminders
                  <div className="text-muted small">Receive reminders for upcoming events</div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-4">
                <i className="bi bi-shield-lock me-2"></i>Privacy Settings
              </h5>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showProfile"
                  checked={settings.privacy.showProfile}
                  onChange={() => handlePrivacyChange('showProfile')}
                />
                <label className="form-check-label" htmlFor="showProfile">
                  Public Profile
                  <div className="text-muted small">Make your profile visible to all employees</div>
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showEmail"
                  checked={settings.privacy.showEmail}
                  onChange={() => handlePrivacyChange('showEmail')}
                />
                <label className="form-check-label" htmlFor="showEmail">
                  Show Email
                  <div className="text-muted small">Display your email address on your profile</div>
                </label>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showPhone"
                  checked={settings.privacy.showPhone}
                  onChange={() => handlePrivacyChange('showPhone')}
                />
                <label className="form-check-label" htmlFor="showPhone">
                  Show Phone Number
                  <div className="text-muted small">Display your phone number on your profile</div>
                </label>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-4">
                <i className="bi bi-sliders me-2"></i>Preferences
              </h5>
              <div className="mb-3">
                <label className="form-label">Theme</label>
                <select
                  className="form-select"
                  value={settings.preferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
                <small className="text-muted">Choose your preferred theme</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Language</label>
                <select
                  className="form-select"
                  value={settings.preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
                <small className="text-muted">Select your preferred language</small>
              </div>
            </div>
          </div>

          {/* Account Information */}
          {currentUser?.managementLevel === 3 && (
            <div className="card border-0 shadow-sm mb-4 border-danger">
              <div className="card-body">
                <h5 className="fw-bold mb-4 text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>Admin Settings
                </h5>
                <div className="alert alert-warning" role="alert">
                  <strong>Administrator Access</strong>
                  <p className="mb-0">As an admin, you have full access to system settings and user management.</p>
                </div>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary" disabled>
                    <i className="bi bi-people me-2"></i>Manage Users (Coming Soon)
                  </button>
                  <button className="btn btn-outline-primary" disabled>
                    <i className="bi bi-gear me-2"></i>System Settings (Coming Soon)
                  </button>
                  <button className="btn btn-outline-primary" disabled>
                    <i className="bi bi-graph-up me-2"></i>Analytics (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="d-grid">
            <button className="btn btn-primary btn-lg" onClick={handleSaveSettings}>
              <i className="bi bi-save me-2"></i>Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
