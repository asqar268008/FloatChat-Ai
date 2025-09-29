const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getCSRFToken() {
        // Get CSRF token from cookies
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        // Get CSRF token for POST requests
        const csrfToken = await this.getCSRFToken();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Important for session authentication
            ...options,
        };

        // Add CSRF token for POST, PUT, DELETE requests
        if (['POST', 'PUT', 'DELETE'].includes(options.method) && csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
        }

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            console.log(`API ${options.method || 'GET'} ${url}:`, response.status);
            
            // Handle response
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try {
                    data = text ? JSON.parse(text) : {};
                } catch {
                    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
                }
            }
            
            if (!response.ok) {
                const errorMessage = data.error || 
                                   data.details || 
                                   data.message || 
                                   `HTTP ${response.status}: ${response.statusText}`;
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

    // AGENT INTEGRATION METHODS
    async generateVisualization(query, filename = null) {
        return this.request('/dashboard-data/generate_visualization/', {
            method: 'POST',
            body: {
                query: query,
                filename: filename || `chart_${Date.now()}`
            },
        });
    }

    async aiChat(query) {
        return this.request(`/dashboard-data/ai_chat/?query=${encodeURIComponent(query)}`, {
            method: 'GET',
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
}

export default new ApiService();