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
                        <button onclick="Users.showUserDetails('${user.telegram_user_id}')" class="text-blue-600 hover:text-blue-800 font-medium">
                            Детали
                        </button>
                        <span class="mx-2 text-gray-300">|</span>
                        <a href="orders.html?userId=${user.telegram_user_id}" class="text-blue-600 hover:text-blue-800 font-medium">
                            Заказы
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Show user details
    async showUserDetails(userId) {
        try {
            const response = await Auth.authenticatedFetch(`/api/admin/users/${userId}`);
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success && data.user) {
                this.renderUserDetails(data.user);
                document.getElementById('userModal').classList.remove('hidden');
            } else {
                this.showError('Пользователь не найден');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showError('Ошибка загрузки деталей пользователя');
        }
    },
    
    // Render user details
    renderUserDetails(user) {
        const container = document.getElementById('userDetails');
        if (!container) return;
        
        const firstOrderDate = user.firstOrderDate 
            ? new Date(user.firstOrderDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        const lastOrderDate = user.lastOrderDate 
            ? new Date(user.lastOrderDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Основная информация -->
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-2">Основная информация</h4>
                        <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <span class="text-sm text-gray-600">Telegram ID:</span>
                                <span class="ml-2 font-medium">${user.telegram_user_id}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Username:</span>
                                <span class="ml-2 font-medium">${user.telegram_username ? `@${user.telegram_username}` : 'Не указан'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Всего заказов:</span>
                                <span class="ml-2 font-semibold text-lg">${user.totalOrders}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Всего потрачено:</span>
                                <span class="ml-2 font-semibold text-lg text-green-600">$${user.totalSpent.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-2">Даты</h4>
                        <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <span class="text-sm text-gray-600">Первый заказ:</span>
                                <span class="ml-2 font-medium">${firstOrderDate}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Последний заказ:</span>
                                <span class="ml-2 font-medium">${lastOrderDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Заказы пользователя -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-500 uppercase mb-2">Последние заказы</h4>
                    <div class="bg-gray-50 rounded-lg p-4">
                        ${user.orders && user.orders.length > 0 ? `
                            <div class="space-y-2 max-h-96 overflow-y-auto">
                                ${user.orders.slice(0, 10).map(order => {
                                    const orderDate = new Date(order.createdAt || order.date || 0).toLocaleDateString('ru-RU');
                                    return `
                                        <div class="flex items-center justify-between p-2 bg-white rounded border">
                                            <div>
                                                <span class="text-sm font-medium">#${order.orderReference || order.id || 'N/A'}</span>
                                                <span class="text-xs text-gray-500 ml-2">${order.country_name || order.country_code || ''}</span>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-sm font-semibold">$${order.price || '0.00'}</div>
                                                <div class="text-xs text-gray-500">${orderDate}</div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${user.orders.length > 10 ? `<p class="text-sm text-gray-500 mt-2">И еще ${user.orders.length - 10} заказов...</p>` : ''}
                        ` : '<p class="text-sm text-gray-500">Нет заказов</p>'}
                    </div>
                </div>
            </div>
        `;
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
        
        // Close user modal
        const closeUserModal = document.getElementById('closeUserModal');
        const userModal = document.getElementById('userModal');
        if (closeUserModal && userModal) {
            closeUserModal.addEventListener('click', () => {
                userModal.classList.add('hidden');
            });
            userModal.addEventListener('click', (e) => {
                if (e.target === userModal) {
                    userModal.classList.add('hidden');
                }
            });
        }
    } catch (error) {
        console.error('Error initializing users page:', error);
    }
});

