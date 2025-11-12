/**
 * Location Service for Network and GPS-based attendance validation
 * Handles geolocation, network detection, and location validation
 */

/**
 * Get user's current GPS position
 * @returns {Promise<Object>} GPS coordinates with accuracy
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds timeout
      maximumAge: 60000 // Cache for 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        let message = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please check your GPS settings.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
};

/**
 * Get network information (WiFi SSID, connection type)
 * Note: This is limited due to browser security restrictions
 * @returns {Promise<Object>} Network information
 */
export const getNetworkInfo = async () => {
  const networkInfo = {
    wifiSSID: null,
    connectionType: null,
    effectiveType: null,
    downlink: null
  };

  try {
    // Try to get network information (limited browser support)
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        networkInfo.connectionType = connection.type;
        networkInfo.effectiveType = connection.effectiveType;
        networkInfo.downlink = connection.downlink;
      }
    }

    // WiFi SSID is not accessible from browsers for security reasons
    // This would require a native app or special browser permissions
    networkInfo.wifiSSID = null; // Browsers cannot access WiFi SSID

  } catch (error) {
    console.warn('Network information not available:', error);
  }

  return networkInfo;
};

/**
 * Calculate distance between two GPS coordinates
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c;
  return Math.round(d);
};

/**
 * Get comprehensive location data for attendance
 * @returns {Promise<Object>} Complete location data
 */
export const getLocationData = async () => {
  try {
    console.log('🌍 Getting location data...');
    
    // Get GPS coordinates
    const gpsLocation = await getCurrentLocation();
    console.log('📍 GPS Location:', gpsLocation);
    
    // Get network information
    const networkInfo = await getNetworkInfo();
    console.log('🌐 Network Info:', networkInfo);
    
    // Try to get address from coordinates (reverse geocoding)
    let address = null;
    try {
      // You can implement reverse geocoding here using services like:
      // - Google Maps Geocoding API
      // - OpenStreetMap Nominatim
      // - Here Maps API
      // For now, we'll leave it as null
      address = `Lat: ${gpsLocation.latitude.toFixed(6)}, Lon: ${gpsLocation.longitude.toFixed(6)}`;
    } catch (error) {
      console.warn('Address lookup failed:', error);
    }

    const locationData = {
      latitude: gpsLocation.latitude,
      longitude: gpsLocation.longitude,
      accuracy: gpsLocation.accuracy,
      address,
      timestamp: gpsLocation.timestamp,
      networkInfo: {
        wifiSSID: networkInfo.wifiSSID, // Will be null from browser
        connectionType: networkInfo.connectionType,
        effectiveType: networkInfo.effectiveType,
        downlink: networkInfo.downlink,
        userAgent: navigator.userAgent
      }
    };

    console.log('✅ Complete location data:', locationData);
    return locationData;

  } catch (error) {
    console.error('❌ Location data error:', error);
    throw error;
  }
};

/**
 * Validate location against office requirements
 * @param {Object} locationData - User location data
 * @param {Object} officeConfig - Office location configuration
 * @returns {Object} Validation result
 */
export const validateLocationClient = (locationData, officeConfig) => {
  const result = {
    isValid: false,
    violations: [],
    details: {
      distanceFromOffice: null,
      isWithinGeoFence: false,
      hasGPS: false
    }
  };

  try {
    // Check if GPS data is available
    if (!locationData.latitude || !locationData.longitude) {
      result.violations.push('GPS location is required');
      return result;
    }

    result.details.hasGPS = true;

    // Calculate distance from office
    const distance = calculateDistance(
      locationData.latitude,
      locationData.longitude,
      officeConfig.officeLocation.latitude,
      officeConfig.officeLocation.longitude
    );

    result.details.distanceFromOffice = distance;
    result.details.isWithinGeoFence = distance <= officeConfig.maxDistance;

    if (distance > officeConfig.maxDistance) {
      result.violations.push(
        `You are ${distance}m away from ${officeConfig.officeLocation.name}. ` +
        `Maximum allowed distance: ${officeConfig.maxDistance}m`
      );
    }

    // Client-side validation is informational only
    // Final validation happens on the server
    result.isValid = result.violations.length === 0;

  } catch (error) {
    console.error('Client location validation error:', error);
    result.violations.push('Location validation failed');
  }

  return result;
};

/**
 * Show location permission request dialog
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestLocationPermission = async () => {
  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'granted') {
        return true;
      }
    }

    // Try to get location (this will trigger permission request if needed)
    await getCurrentLocation();
    return true;
  } catch (error) {
    console.error('Location permission denied:', error);
    return false;
  }
};

/**
 * Show helpful error messages based on location validation
 * @param {Array} violations - List of validation violations
 * @returns {string} User-friendly error message
 */
export const getLocationErrorMessage = (violations) => {
  if (!violations || violations.length === 0) {
    return '';
  }

  const messages = violations.map(violation => `• ${violation}`).join('\n');
  
  return `Location Verification Failed:\n\n${messages}\n\n` +
         'Please ensure you are:\n' +
         '• Within the office premises or nearby area\n' +
         '• Connected to company WiFi or network\n' +
         '• Have location services enabled';
};

export default {
  getCurrentLocation,
  getNetworkInfo,
  getLocationData,
  calculateDistance,
  validateLocationClient,
  requestLocationPermission,
  getLocationErrorMessage
};