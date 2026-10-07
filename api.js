/**
 * TrustAI Frontend API Client
 * Handles all communication with Spring Boot backend
 */

const API_BASE_URL = 'http://localhost:8081/api';
let authToken = localStorage.getItem('authToken');

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, method = 'GET', body = null, headers = {}, baseUrl = API_BASE_URL) {
    const requestOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        credentials: 'include'
    };

    // Add auth token if available
    if (authToken) {
        requestOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Add body if present
    if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, requestOptions);
        const responseText = await response.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = { message: responseText || 'The backend returned an invalid response' };
        }

        if (!response.ok) {
            throw new Error(data.message || data.detail || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * File upload handler (multipart/form-data)
 */
async function uploadFile(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);

    const requestOptions = {
        method: 'POST',
        credentials: 'include'
    };

    // Add auth token
    const headers = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    requestOptions.headers = headers;
    requestOptions.body = formData;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);
        const responseText = await response.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = { message: responseText || 'The backend returned an invalid response' };
        }

        if (!response.ok) {
            throw new Error(data.message || data.detail || 'File upload failed');
        }

        return data;
    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}

/**
 * Authentication APIs
 */
async function register(fullName, email, username, password) {
    const body = { fullName, email, username, password };
    return apiRequest('/auth/register', 'POST', body);
}

async function login(email, password) {
    const body = { email, password };
    const response = await apiRequest('/auth/login', 'POST', body);

    if (response.success && response.data.token) {
        authToken = response.data.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
    }

    return response;
}

async function logout() {
    try {
        await apiRequest('/auth/logout', 'POST');
    } finally {
        authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }
}

/**
 * User APIs
 */
async function getUserProfile() {
    const response = await apiRequest('/users/profile', 'GET');
    return response;
}

async function updateUserProfile(fullName, phone, username, email) {
    const params = new URLSearchParams();
    if (fullName) params.append('fullName', fullName);
    if (phone) params.append('phone', phone);
    if (username) params.append('username', username);
    if (email) params.append('email', email);

    const response = await apiRequest(`/users/profile?${params}`, 'PUT');
    if (response.success && response.data) {
        if (response.data.token) {
            authToken = response.data.token;
            localStorage.setItem('authToken', authToken);
        }
        if (response.data.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        }
    }
    return response;
}

async function uploadProfilePhoto(file) {
    return uploadFile('/users/profile/photo', file);
}

/**
 * Detection APIs
 */
async function uploadDetectionFile(file) {
    return uploadFile('/detections/upload', file);
}

async function getDetection(detectionId) {
    const response = await apiRequest(`/detections/${detectionId}`, 'GET');
    return response;
}

async function getMyDetections(page = 0, size = 10) {
    const response = await apiRequest(`/detections/my?page=${page}&size=${size}`, 'GET');
    return response;
}

async function getDetectionStatus(detectionId) {
    const response = await apiRequest(`/detections/${detectionId}/status`, 'GET');
    return response;
}

/**
 * Trust Verification APIs
 */
async function getTrustVerification(detectionId) {
    const response = await apiRequest(`/trust/${detectionId}`, 'GET');
    return response;
}

/**
 * Report APIs
 */
async function getReport(detectionId) {
    const response = await apiRequest(`/reports/${detectionId}`, 'GET');
    return response;
}

async function generateReport(detectionId) {
    const response = await apiRequest(`/reports/${detectionId}/generate`, 'POST');
    return response;
}

async function downloadReport(detectionId) {
    const response = await fetch(`${API_BASE_URL}/reports/${detectionId}/download`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    if (!response.ok) {
        throw new Error('Report download failed');
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `trustai-report-${detectionId}.txt`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
}

/**
 * Settings APIs
 */
async function getSettings() {
    const response = await apiRequest('/settings', 'GET');
    return response;
}

async function updateSettings(language, timezone, emailNotifications, scanAlerts, darkMode) {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    if (timezone) params.append('timezone', timezone);
    if (emailNotifications !== undefined) params.append('emailNotifications', emailNotifications);
    if (scanAlerts !== undefined) params.append('scanAlerts', scanAlerts);
    if (darkMode !== undefined) params.append('darkMode', darkMode);

    const response = await apiRequest(`/settings?${params}`, 'PUT');
    return response;
}

/**
 * Admin APIs
 */
async function getAdminStatistics() {
    const response = await apiRequest('/admin/statistics', 'GET');
    return response;
}

async function getAdminUsers() {
    const response = await apiRequest('/admin/users', 'GET');
    return response;
}

async function getAdminDetections() {
    const response = await apiRequest('/admin/detections', 'GET');
    return response;
}

/**
 * Utility: Check if user is authenticated
 */
function isAuthenticated() {
    return authToken !== null;
}

/**
 * Utility: Get current user from localStorage
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Utility: Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Utility: Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
