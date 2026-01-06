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

        // Если body уже строка, используем как есть, иначе преобразуем в JSON
        const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined;

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: body
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
// Контент уже скрыт через inline скрипт в <head>
const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/login.html');

// Функция для проверки и показа контента
function checkAuthAndShowContent() {
    if (!isLoginPage) {
        if (Auth.isAuthenticated()) {
            // Показываем контент только если авторизован
            document.body.style.display = '';
        } else {
            // Перенаправляем на страницу входа
            Auth.protectPage();
        }
    }
}

// Выполняем проверку как можно раньше
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthAndShowContent);
} else {
    // DOM уже загружен
    checkAuthAndShowContent();
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

