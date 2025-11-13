import dotenv from 'dotenv';
dotenv.config();

// Company office location (configurable via environment variables)
const OFFICE_LOCATION = {
  latitude: parseFloat(process.env.OFFICE_LATITUDE) || 28.7041, // Default: New Delhi, India
  longitude: parseFloat(process.env.OFFICE_LONGITUDE) || 77.1025,
  maxDistance: parseInt(process.env.MAX_DISTANCE_METERS) || 100, // 100 meters
  companyWiFi: process.env.COMPANY_WIFI_SSID || 'RG_STAFF_HUB_OFFICE_WIFI',
  allowedIPRanges: process.env.ALLOWED_IP_RANGES?.split(',') || ['192.168.1.0/24', '10.0.0.0/16']
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // Distance in meters
  return Math.round(d);
};

/**
 * Check if IP address is within allowed company IP ranges
 * @param {string} ip - Client IP address
 * @returns {boolean} True if IP is within allowed ranges
 */
export const isCompanyNetwork = (ip) => {
  if (!ip) return false;
  
  // Skip validation for development
  if (process.env.NODE_ENV === 'development') {
    return true; // Allow in development mode
  }
  
  // Simple IP range check (you can enhance this with proper CIDR validation)
  const companyIPPrefixes = [
    '192.168.1.', // Local network
    '10.0.0.',    // Private network
    '172.16.',    // Private network
    '127.0.0.1'   // Localhost for testing
  ];
  
  return companyIPPrefixes.some(prefix => ip.startsWith(prefix));
};

/**
 * Validate if user is within company premises
 * @param {Object} locationData - User's location data
 * @param {string} clientIP - User's IP address
 * @param {string} userAgent - User's browser user agent
 * @returns {Object} Validation result with details
 */
export const validateLocation = (locationData, clientIP, userAgent) => {
  const result = {
    isValid: false,
    violations: [],
    details: {
      distanceFromOffice: null,
      isCompanyNetwork: false,
      isWithinGeoFence: false,
      wifiVerified: false
    }
  };

  // Skip validation if disabled
  if (process.env.LOCATION_RESTRICTION_ENABLED !== 'true') {
    result.isValid = true;
    result.details.message = 'Location restriction is disabled';
    return result;
  }

  try {
    // 1. GPS Distance Validation
    if (locationData?.latitude && locationData?.longitude) {
      const distance = calculateDistance(
        locationData.latitude,
        locationData.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );
      
      result.details.distanceFromOffice = distance;
      result.details.isWithinGeoFence = distance <= OFFICE_LOCATION.maxDistance;
      
      if (distance > OFFICE_LOCATION.maxDistance) {
        result.violations.push(`You are ${distance}m away from office. Maximum allowed: ${OFFICE_LOCATION.maxDistance}m`);
      }
    } else {
      result.violations.push('GPS location is required for check-in/out');
    }

    // 2. Network Validation
    result.details.isCompanyNetwork = isCompanyNetwork(clientIP);
    if (!result.details.isCompanyNetwork) {
      result.violations.push('You must be connected to company network');
    }

    // 3. WiFi SSID Validation (if provided)
    if (locationData?.networkInfo?.wifiSSID) {
      result.details.wifiVerified = locationData.networkInfo.wifiSSID === OFFICE_LOCATION.companyWiFi;
      if (!result.details.wifiVerified) {
        result.violations.push(`Please connect to company WiFi: ${OFFICE_LOCATION.companyWiFi}`);
      }
    }

    // Overall validation
    result.isValid = result.violations.length === 0 && 
                    result.details.isWithinGeoFence && 
                    result.details.isCompanyNetwork;

    // Special case: If within geofence and on company network, allow even without WiFi SSID
    if (result.details.isWithinGeoFence && result.details.isCompanyNetwork) {
      result.isValid = true;
      result.violations = result.violations.filter(v => !v.includes('WiFi'));
    }

  } catch (error) {
    console.error('Location validation error:', error);
    result.violations.push('Location validation failed. Please try again.');
  }

  return result;
};

/**
 * Get location configuration for frontend
 * @returns {Object} Public location configuration
 */
export const getLocationConfig = () => {
  return {
    officeLocation: {
      latitude: OFFICE_LOCATION.latitude,
      longitude: OFFICE_LOCATION.longitude,
      name: process.env.COMPANY_NAME || 'Company Office'
    },
    maxDistance: OFFICE_LOCATION.maxDistance,
    companyWiFi: OFFICE_LOCATION.companyWiFi,
    restrictionEnabled: process.env.LOCATION_RESTRICTION_ENABLED === 'true'
  };
};

export default {
  calculateDistance,
  isCompanyNetwork,
  validateLocation,
  getLocationConfig,
  OFFICE_LOCATION
};