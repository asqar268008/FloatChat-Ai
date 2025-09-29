const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
            ...options,
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle different response types more gracefully
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                // Try to parse as JSON even if content-type is wrong
                try {
                    data = text ? JSON.parse(text) : {};
                } catch {
                    // If it's not JSON, create a proper error object
                    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
                }
            }
            
            if (!response.ok) {
                // Handle different error formats
                const errorMessage = data.error || 
                                   data.details || 
                                   data.message || 
                                   (typeof data === 'string' ? data : 'Something went wrong');
                throw new Error(errorMessage);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Auth methods
    async login(email, password) {
        return this.request('/login/', {
            method: 'POST',
            body: { email, password },
        });
    }

    async logout() {
        return this.request('/logout/', {
            method: 'POST',
        });
    }

    async register(email, password) {
        return this.request('/register/', {
            method: 'POST',
            body: { email, password },
        });
    }

    async getCurrentUser() {
        return this.request('/current-user/');
    }

    // Dashboard data methods
    async getDashboardData() {
        return this.request('/dashboard-data/');
    }

    async createDashboardData(chartData) {
        return this.request('/dashboard-data/', {
            method: 'POST',
            body: { chart_data: chartData },
        });
    }

    async updateDashboardData(id, chartData) {
        return this.request(`/dashboard-data/${id}/`, {
            method: 'PUT',
            body: { chart_data: chartData },
        });
    }

    async deleteDashboardData(id) {
        return this.request(`/dashboard-data/${id}/`, {
            method: 'DELETE',
        });
    }

    // Chat methods
    async getChatMessages() {
        return this.request('/chat-messages/');
    }

    async sendChatMessage(message, isDashboard = true) {
        return this.request('/chat-messages/', {
            method: 'POST',
            body: { 
                message,
                is_dashboard: isDashboard 
            },
        });
    }

    // Location methods
    async getLocationData() {
        return this.request('/location-data/');
    }

    async saveLocation(latitude, longitude) {
        return this.request('/location-data/', {
            method: 'POST',
            body: { latitude, longitude },
        });
    }

    // Argo Float methods
    async getArgoFloats() {
        return this.request('/argo-floats/');
    }

    async getFloatDetails(floatId) {
        return this.request(`/argo-floats/${floatId}/`);
    }

    async searchFloats(query) {
        return this.request(`/argo-floats/search/?q=${encodeURIComponent(query)}`);
    }
}

export default new ApiService();