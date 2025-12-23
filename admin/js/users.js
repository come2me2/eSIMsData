/**
 * Users management page
 */

const Users = {
    // Load users
    async loadUsers() {
        try {
            const response = await Auth.authenticatedFetch('/api/admin/users');
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.renderUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Ошибка загрузки пользователей');
        }
    },
    
    // Render users table
    renderUsers(users) {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Нет пользователей</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => {
            const firstOrderDate = user.firstOrderDate 
                ? new Date(user.firstOrderDate).toLocaleDateString('ru-RU')
                : 'N/A';
            const lastOrderDate = user.lastOrderDate 
                ? new Date(user.lastOrderDate).toLocaleDateString('ru-RU')
                : 'N/A';
            
            const username = user.telegram_username ? `@${user.telegram_username}` : user.telegram_user_id;
            
            return `
                <tr class="table-row hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.totalOrders}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${user.totalSpent.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${firstOrderDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastOrderDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <a href="orders.html?userId=${user.telegram_user_id}" class="text-blue-600 hover:text-blue-800 font-medium">
                            Заказы
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    showError(message) {
        alert('Ошибка: ' + message);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что Auth доступен
    if (typeof Auth === 'undefined') {
        console.error('Auth is not defined. Make sure auth.js is loaded before users.js');
        return;
    }
    
    try {
        Users.loadUsers();
        
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                Users.loadUsers();
            });
        }
    } catch (error) {
        console.error('Error initializing users page:', error);
    }
});

