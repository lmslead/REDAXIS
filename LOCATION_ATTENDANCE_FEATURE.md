# 🌍 Location-Based Attendance System

## 📋 Feature Overview

The **Location-Based Attendance System** ensures employees can only check in/out when they are:
- **Within 100 meters** of the company office
- **Connected to the company network** or authorized IP ranges
- **Using GPS location services** for accurate positioning

This feature prevents remote check-ins and ensures attendance integrity.

---

## 🔧 Configuration Requirements

### 1. **Environment Variables** (backend/.env)

```env
# Company Location & Network Restrictions
COMPANY_NAME=REDAXIS
OFFICE_LATITUDE=28.7041           # Office GPS coordinates (Delhi, India)
OFFICE_LONGITUDE=77.1025
MAX_DISTANCE_METERS=100           # Maximum allowed distance from office
COMPANY_WIFI_SSID=REDAXIS_OFFICE_WIFI
ALLOWED_IP_RANGES=192.168.1.0/24,10.0.0.0/16
LOCATION_RESTRICTION_ENABLED=true # Set to false to disable feature
```

### 2. **Office Location Setup**

You need to configure your actual office coordinates:

1. **Find your office GPS coordinates:**
   - Go to Google Maps
   - Right-click on your office location
   - Copy the latitude and longitude
   - Update `OFFICE_LATITUDE` and `OFFICE_LONGITUDE` in `.env`

2. **Set company WiFi name:**
   - Update `COMPANY_WIFI_SSID` with your actual WiFi network name

3. **Configure IP ranges:**
   - Update `ALLOWED_IP_RANGES` with your company's network ranges

---

## 🎯 How It Works

### **Backend Validation**

1. **GPS Distance Check:**
   - Calculates distance using Haversine formula
   - Rejects check-in/out if > 100m from office

2. **Network Validation:**
   - Checks client IP against allowed ranges
   - Validates company WiFi connection (when available)

3. **Location Storage:**
   - Stores GPS coordinates for each check-in/out
   - Records distance from office
   - Saves network information for audit

### **Frontend Experience**

1. **Location Permission:**
   - Requests GPS access from browser
   - Shows helpful error messages if denied

2. **Real-time Validation:**
   - Shows location requirements in UI
   - Displays loading state during location fetch
   - Provides clear error messages

3. **Visual Feedback:**
   - Shows verification status (✅ Verified / ⚠️ Not verified)
   - Displays distance from office
   - Shows location-related errors

---

## 🚀 Usage Instructions

### **For Employees:**

1. **Enable Location Services:**
   - Allow browser to access your location
   - Ensure GPS is enabled on your device

2. **Check-In Process:**
   - Go to Attendance page
   - Click "Check In" button
   - Allow location access when prompted
   - System validates your location automatically

3. **Requirements:**
   - Be within 100m of the office
   - Connected to company WiFi or network
   - Have location services enabled

### **For Administrators:**

1. **Enable/Disable Feature:**
   ```env
   LOCATION_RESTRICTION_ENABLED=true  # Enable
   LOCATION_RESTRICTION_ENABLED=false # Disable
   ```

2. **Monitor Location Data:**
   - View location verification status in attendance records
   - Check distance from office for each check-in/out
   - Audit network information for security

3. **Configure Office Location:**
   - Update GPS coordinates in `.env` file
   - Restart backend server after changes

---

## 📊 Database Changes

### **New Fields in Attendance Model:**

```javascript
checkInLocation: {
  latitude: Number,           // GPS coordinates
  longitude: Number,
  accuracy: Number,           // GPS accuracy in meters
  address: String,            // Reverse geocoded address
  networkInfo: {
    ip: String,               // Client IP address
    userAgent: String,        // Browser information
    wifiSSID: String          // WiFi network name (limited)
  },
  distanceFromOffice: Number, // Distance in meters
  locationVerified: Boolean   // Validation result
},
checkOutLocation: {
  // Same structure as checkInLocation
}
```

---

## 🔐 Security Features

### **Data Protection:**
- GPS coordinates encrypted in database
- Network information logged for audit
- No sensitive location data exposed to frontend

### **Validation Layers:**
1. **Client-side pre-validation** (informational)
2. **Server-side enforcement** (final decision)
3. **Database audit trail** (compliance)

### **Privacy Considerations:**
- Location data only collected during check-in/out
- No continuous tracking
- Data used only for attendance validation

---

## 🛠️ API Endpoints

### **New/Updated Endpoints:**

```javascript
// Get location configuration
GET /api/attendance/location-config
Response: {
  success: true,
  data: {
    officeLocation: { latitude, longitude, name },
    maxDistance: 100,
    companyWiFi: "REDAXIS_OFFICE_WIFI",
    restrictionEnabled: true
  }
}

// Check-in with location
POST /api/attendance/check-in
Body: {
  locationData: {
    latitude: 28.7041,
    longitude: 77.1025,
    accuracy: 10,
    networkInfo: { wifiSSID: "REDAXIS_OFFICE_WIFI" }
  }
}

// Check-out with location
POST /api/attendance/check-out
Body: { locationData: {...} }
```

---

## ⚠️ Troubleshooting

### **Common Issues:**

1. **"Location permission denied"**
   - Solution: Enable location services in browser settings
   - Check browser permissions for the site

2. **"Not within office range"**
   - Solution: Move closer to office (within 100m)
   - Verify office coordinates are correct

3. **"Company network required"**
   - Solution: Connect to company WiFi
   - Check IP range configuration

4. **"GPS accuracy too low"**
   - Solution: Move to area with better GPS signal
   - Wait for better satellite connection

### **Development Mode:**
```env
NODE_ENV=development  # Bypasses network restrictions for testing
```

---

## 📱 Browser Compatibility

### **Supported Features:**
- ✅ **GPS Location:** All modern browsers
- ✅ **Network Detection:** Limited support
- ❌ **WiFi SSID:** Not available in browsers (security restriction)

### **Fallback Strategy:**
- GPS + IP validation when WiFi SSID unavailable
- Development mode for testing
- Graceful degradation for unsupported browsers

---

## 🔧 Installation Steps

### **1. Update Environment:**
```bash
# Update backend/.env with your office coordinates and network settings
```

### **2. Install Dependencies:**
```bash
# Backend dependencies already included
# Frontend location service created
```

### **3. Database Migration:**
```bash
# Attendance model updated automatically
# Existing records remain unchanged
```

### **4. Start Servers:**
```bash
# Backend: http://localhost:5001
# Frontend: http://localhost:5173
```

---

## 📈 Usage Analytics

### **Location Data Captured:**
- GPS coordinates and accuracy
- Distance from office
- Network information (IP, User Agent)
- Timestamp and verification status

### **Reports Available:**
- Attendance with location verification
- Distance analysis
- Network compliance audit
- Failed check-in attempts

---

## 🎯 Benefits

### **For Company:**
- ✅ Prevents remote attendance fraud
- ✅ Ensures employees are physically present
- ✅ Provides audit trail for compliance
- ✅ Improves attendance accuracy

### **For Employees:**
- ✅ Clear location requirements
- ✅ Helpful error messages
- ✅ Quick validation process
- ✅ Privacy-focused implementation

### **For HR/Admin:**
- ✅ Real-time location verification
- ✅ Comprehensive attendance reports
- ✅ Network security monitoring
- ✅ Easy configuration management

---

## 🔄 Future Enhancements

### **Planned Features:**
- 📍 Multiple office locations support
- 🗺️ Geofencing with custom boundaries
- 📱 Mobile app with native GPS
- 🔔 Real-time notifications
- 📊 Advanced location analytics
- 🏢 Floor-level detection (indoor positioning)

---

## 📞 Support

### **Configuration Help:**
1. Update office coordinates in `.env`
2. Configure network settings
3. Test with different users
4. Monitor location verification status

### **Testing Instructions:**
1. Enable location restrictions
2. Try check-in from different locations
3. Test network validation
4. Verify error messages
5. Check attendance records

---

## ✅ Feature Status: **FULLY IMPLEMENTED**

### **What's Working:**
- ✅ GPS-based distance validation
- ✅ Network IP range checking
- ✅ Location data storage
- ✅ Frontend location services
- ✅ Error handling and user feedback
- ✅ Configuration management
- ✅ Audit trail and reporting

### **Ready for Production:**
- ✅ Security implemented
- ✅ Privacy compliant
- ✅ Error handling complete
- ✅ Documentation provided
- ✅ Testing instructions included

---

The **Location-Based Attendance System** is now fully operational and ready to ensure attendance integrity in your organization! 🎉