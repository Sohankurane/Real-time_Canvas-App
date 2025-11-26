import { API_URL, STORAGE_KEYS } from '../constants';

/**
 * Auth Service - Handles all authentication related API calls
 */

export const authService = {
  /**
   * Register a new user
   */
  register: async (fullName, username, password) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: fullName, 
          username, 
          password 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Registration failed');
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Login user
   */
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Login failed');
      }
      
      // Save JWT token
      if (data.access_token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  /**
   * Get stored auth token
   */
  getToken: () => {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
  }
};
