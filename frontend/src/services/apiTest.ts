import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Create a separate axios instance for testing (without credentials)
// This helps diagnose CORS issues
const testApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Disable credentials for test endpoint
});

export default testApiClient;


