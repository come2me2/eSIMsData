/**
 * Authentication module for Admin Panel
 */

const Auth = {
    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('admin_token');
        return token !== null && token !== undefined;
    },

    // Get authentication token
    getToken() {
        return localStorage.getItem('admin_token');
    },

    // Login
    async login(username, password) {
        try {
            const response = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success && data.token) {
                localStorage.setItem('admin_token', data.token);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Ошибка входа' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Ошибка соединения с сервером' };
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
    },

    // Make authenticated request
    async authenticatedFetch(url, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Unauthorized - redirect to login
            this.logout();
            return null;
        }

        return response;
    },

    // Protect page - redirect to login if not authenticated
    protectPage() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    }
};

// Auto-protect pages (except login.html)
if (!window.location.pathname.includes('login.html')) {
    Auth.protectPage();
}

// Logout button handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                Auth.logout();
            }
        });
    }
});

