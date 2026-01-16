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
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorLoadingOrders'));
        }
    },
    
    // Render users table
    renderUsers(users) {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;
        
        if (users.length === 0) {
            const noUsersText = window.i18n ? window.i18n.t('noUsers') : 'No users';
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">${noUsersText}</td></tr>`;
            return;
        }
        
        tbody.innerHTML = users.map(user => {
            const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
            const firstOrderDate = user.firstOrderDate 
                ? new Date(user.firstOrderDate).toLocaleDateString(locale)
                : 'N/A';
            const lastOrderDate = user.lastOrderDate 
                ? new Date(user.lastOrderDate).toLocaleDateString(locale)
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
                            ${window.i18n ? window.i18n.t('details') : 'Details'}
                        </button>
                        <span class="mx-2 text-gray-300">|</span>
                        <a href="orders.html?userId=${user.telegram_user_id}" class="text-blue-600 hover:text-blue-800 font-medium">
                            ${window.i18n ? window.i18n.t('orders') : 'Orders'}
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
                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                this.showError(t('orderNotFound'));
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorLoadingOrderDetails'));
        }
    },
    
    // Render user details
    renderUserDetails(user) {
        const container = document.getElementById('userDetails');
        if (!container) return;
        
        // Format dates
        const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
        const registrationDate = user.registrationDate || user.firstOrderDate;
        const formattedRegistrationDate = registrationDate 
            ? new Date(registrationDate).toLocaleString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        const firstOrderDate = user.firstOrderDate 
            ? new Date(user.firstOrderDate).toLocaleString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        const lastOrderDate = user.lastOrderDate 
            ? new Date(user.lastOrderDate).toLocaleString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- User Information -->
                <div class="space-y-5">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('orderInfo')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5 space-y-4">
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">Telegram ID</span>
                                <span class="ml-4 font-semibold text-gray-900 text-right">${user.telegram_user_id}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">Username</span>
                                <span class="ml-4 font-medium text-gray-900 text-right">${user.telegram_username ? `@${user.telegram_username}` : t('notSpecified')}</span>
                            </div>
                            <div class="flex items-start justify-between pt-3 border-t border-gray-200">
                                <span class="text-sm text-gray-600">${t('totalOrders')}</span>
                                <span class="ml-4 font-bold text-xl text-blue-600">${user.totalOrders}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('totalSpent')}</span>
                                <span class="ml-4 font-bold text-xl text-green-600">$${user.totalSpent.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Dates -->
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('date')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5 space-y-4">
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('registeredAt')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right text-xs">${formattedRegistrationDate}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('firstOrder')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right text-xs">${firstOrderDate}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('lastOrder')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right text-xs">${lastOrderDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- User Orders -->
                <div class="space-y-5">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('recentOrders')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5">
                            ${user.orders && user.orders.length > 0 ? `
                                <div class="space-y-2 max-h-96 overflow-y-auto">
                                    ${user.orders.slice(0, 10).map(order => {
                                        const orderDate = new Date(order.createdAt || order.date || 0).toLocaleDateString(locale);
                                        const orderStatus = order.status || 'completed';
                                        const statusMap = {
                                            'completed': { text: 'Completed', color: 'bg-green-100 text-green-800' },
                                            'on_hold': { text: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
                                            'canceled': { text: 'Canceled', color: 'bg-gray-100 text-gray-800' },
                                            'failed': { text: 'Failed', color: 'bg-red-100 text-red-800' },
                                            'pending': { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
                                            'processing': { text: 'Processing', color: 'bg-blue-100 text-blue-800' }
                                        };
                                        const statusInfo = statusMap[orderStatus] || { text: orderStatus, color: 'bg-gray-100 text-gray-800' };
                                        
                                        // Get order ID and escape it for use in onclick
                                        const orderId = order.orderReference || order.id || order.number || '';
                                        const orderIdEscaped = orderId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                                        const userIdEscaped = (user.telegram_user_id || '').toString().replace(/'/g, "\\'").replace(/"/g, '&quot;');
                                        
                                        return `
                                            <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                                                <div class="flex-1">
                                                    <div class="flex items-center gap-2 mb-1">
                                                        <span class="text-sm font-semibold text-gray-900">#${order.orderReference || order.id || order.number || 'N/A'}</span>
                                                        <span class="px-2 py-0.5 text-xs font-medium rounded ${statusInfo.color}">${statusInfo.text}</span>
                                                    </div>
                                                    <div class="text-xs text-gray-500">
                                                        ${order.country_name || order.country_code || 'N/A'} • ${orderDate}
                                                    </div>
                                                </div>
                                                <div class="text-right ml-4">
                                                    <div class="text-sm font-bold text-gray-900">$${(order.finalPrice || order.price || '0.00').toFixed(2)}</div>
                                                    ${orderId ? `<button onclick="Users.openOrderDetails('${orderIdEscaped}', '${userIdEscaped}')" class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">${t('viewDetails')}</button>` : '<span class="text-xs text-gray-400">N/A</span>'}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                ${user.orders.length > 10 ? `
                                    <div class="mt-3 pt-3 border-t border-gray-200 text-center">
                                        <a href="orders.html?userId=${user.telegram_user_id}" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                            ${t('viewAll')} (${user.orders.length - 10} more)
                                        </a>
                                    </div>
                                ` : ''}
                            ` : `
                                <div class="text-center py-8">
                                    <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                    </svg>
                                    <p class="text-sm text-gray-500">${t('noOrders')}</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Open order details modal
    async openOrderDetails(orderId, userId) {
        try {
            console.log('[Users] openOrderDetails called:', { orderId, userId });
            
            // Validate parameters
            if (!orderId || orderId === 'N/A' || (typeof orderId === 'string' && orderId.trim() === '')) {
                console.error('[Users] Invalid orderId:', orderId);
                this.showError('Order ID is required');
                return;
            }
            
            // Check if Orders is available (we're on users page, need to load orders functionality)
            if (typeof Orders !== 'undefined' && typeof Orders.showOrderDetails === 'function') {
                console.log('[Users] Calling Orders.showOrderDetails');
                // If orders.js is loaded, use its function
                await Orders.showOrderDetails(orderId, userId);
            } else {
                console.log('[Users] Orders not available, redirecting to orders page');
                // Otherwise, navigate to orders page with search
                window.location.href = `orders.html?search=${encodeURIComponent(orderId)}`;
            }
        } catch (error) {
            console.error('[Users] Error in openOrderDetails:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorLoadingOrderDetails') + ': ' + (error.message || error));
        }
    },
    
    showError(message) {
        alert('Error: ' + message);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check that Auth is available
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
        
        // Close order modal (same handler as in orders.js, but we add it here too for users.html)
        const closeModal = document.getElementById('closeModal');
        const orderModal = document.getElementById('orderModal');
        if (closeModal && orderModal) {
            // Check if handler is not already attached (orders.js might have already attached it)
            if (!closeModal.hasAttribute('data-handler-attached')) {
                closeModal.addEventListener('click', () => {
                    orderModal.classList.add('hidden');
                });
                closeModal.setAttribute('data-handler-attached', 'true');
            }
            orderModal.addEventListener('click', (e) => {
                if (e.target === orderModal) {
                    orderModal.classList.add('hidden');
                }
            });
        }
    } catch (error) {
        console.error('Error initializing users page:', error);
    }
});

