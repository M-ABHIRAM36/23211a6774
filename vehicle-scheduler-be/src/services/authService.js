const axiosInstance = require('../config/axiosConfig');

let cachedToken = null;
let tokenExpiry = null; // Unix timestamp in seconds

/**
 * Validates that all required credentials are present in the environment.
 */
function validateCredentials() {
  const required = ['EMAIL', 'NAME', 'ROLL_NO', 'ACCESS_CODE', 'CLIENT_ID', 'CLIENT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required configuration environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Fetches a new authentication token from the external API.
 * @returns {Promise<string>} The JWT token
 */
async function fetchNewToken() {
  validateCredentials();

  const payload = {
    email: process.env.EMAIL,
    name: process.env.NAME,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  };

  try {
    const response = await axiosInstance.post('/auth', payload);
    
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Auth API returned status code ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const { access_token, expires_in } = response.data;
    if (!access_token) {
      throw new Error('Auth response did not contain access_token');
    }

    cachedToken = access_token;
    // Set expiry timestamp (expires_in is the Unix timestamp in seconds when it expires)
    tokenExpiry = expires_in ? parseInt(expires_in, 10) : Math.floor(Date.now() / 1000) + 900; // fallback to 15 min

    return cachedToken;
  } catch (error) {
    // Standardize error handling for downstream controller
    if (error.response) {
      const errorMsg = error.response.data ? JSON.stringify(error.response.data) : error.message;
      const status = error.response.status;
      const customErr = new Error(`External auth service failed with status ${status}: ${errorMsg}`);
      customErr.status = status;
      throw customErr;
    }
    throw error;
  }
}

/**
 * Retrieves the authentication token (reuses cached token if valid).
 * @returns {Promise<string>} The valid JWT token
 */
async function getToken() {
  const currentTime = Math.floor(Date.now() / 1000);
  const safetyBuffer = 10; // Refresh token 10 seconds before actual expiry

  if (cachedToken && tokenExpiry && (currentTime < (tokenExpiry - safetyBuffer))) {
    return cachedToken;
  }

  return fetchNewToken();
}

/**
 * Clears the cached token (useful for manual retries upon auth failures).
 */
function invalidateToken() {
  cachedToken = null;
  tokenExpiry = null;
}

module.exports = {
  getToken,
  invalidateToken
};
