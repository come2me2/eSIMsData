/**
 * Dashboard statistics and data loading
 */

const Dashboard = {
    // Load dashboard statistics
    async loadStats() {
        try {
            const response = await Auth.authenticatedFetch('/api/admin/stats');
            if (!response) return;

            const data = await response.json();
            
            if (data.success) {
                this.updateStats(data.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    // Update statistics display
    updateStats(stats) {
        // Total Revenue
        const totalRevenue = document.getElementById('totalRevenue');
        if (totalRevenue && stats.totalRevenue) {
            totalRevenue.textContent = `$${stats.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        const revenueChange = document.getElementById('revenueChange');
        if (revenueChange && stats.revenueChange !== undefined) {
            const sign = stats.revenueChange >= 0 ? '+' : '';
            const isPositive = stats.revenueChange >= 0;
            revenueChange.innerHTML = `
                <span class="inline-flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isPositive ? 'M13 7l5 5m0 0l-5 5m5-5H6' : 'M13 17l5-5m0 0l-5-5m5 5H6'}"></path>
                    </svg>
                    ${sign}${Math.abs(stats.revenueChange).toFixed(1)}% за месяц
                </span>
            `;
        }

        // Total Orders
        const totalOrders = document.getElementById('totalOrders');
        if (totalOrders && stats.totalOrders !== undefined) {
            totalOrders.textContent = stats.totalOrders.toLocaleString('ru-RU');
        }

        const ordersChange = document.getElementById('ordersChange');
        if (ordersChange && stats.ordersChange !== undefined) {
            const sign = stats.ordersChange >= 0 ? '+' : '';
            const isPositive = stats.ordersChange >= 0;
            ordersChange.innerHTML = `
                <span class="inline-flex items-center ${isPositive ? 'text-blue-600' : 'text-red-600'}">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isPositive ? 'M13 7l5 5m0 0l-5 5m5-5H6' : 'M13 17l5-5m0 0l-5-5m5 5H6'}"></path>
                    </svg>
                    ${sign}${Math.abs(stats.ordersChange)} за месяц
                </span>
            `;
        }

        // Active Users
        const activeUsers = document.getElementById('activeUsers');
        if (activeUsers && stats.activeUsers !== undefined) {
            activeUsers.textContent = stats.activeUsers.toLocaleString('ru-RU');
        }

        const usersChange = document.getElementById('usersChange');
        if (usersChange && stats.usersChange !== undefined) {
            const sign = stats.usersChange >= 0 ? '+' : '';
            const isPositive = stats.usersChange >= 0;
            usersChange.innerHTML = `
                <span class="inline-flex items-center ${isPositive ? 'text-purple-600' : 'text-red-600'}">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isPositive ? 'M13 7l5 5m0 0l-5 5m5-5H6' : 'M13 17l5-5m0 0l-5-5m5 5H6'}"></path>
                    </svg>
                    ${sign}${Math.abs(stats.usersChange)} за месяц
                </span>
            `;
        }

        // Conversion Rate
        const conversionRate = document.getElementById('conversionRate');
        if (conversionRate && stats.conversionRate !== undefined) {
            conversionRate.textContent = `${stats.conversionRate.toFixed(1)}%`;
        }

        const conversionChange = document.getElementById('conversionChange');
        if (conversionChange && stats.conversionChange !== undefined) {
            const sign = stats.conversionChange >= 0 ? '+' : '';
            const isPositive = stats.conversionChange >= 0;
            conversionChange.innerHTML = `
                <span class="inline-flex items-center ${isPositive ? 'text-orange-600' : 'text-red-600'}">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isPositive ? 'M13 7l5 5m0 0l-5 5m5-5H6' : 'M13 17l5-5m0 0l-5-5m5 5H6'}"></path>
                    </svg>
                    ${sign}${Math.abs(stats.conversionChange).toFixed(1)}% за месяц
                </span>
            `;
        }
    },

    // Load recent orders
    async loadRecentOrders() {
        try {
            const response = await Auth.authenticatedFetch('/api/admin/orders?limit=10&sort=createdAt&order=desc');
            if (!response) return;

            const data = await response.json();
            
            if (data.success && data.orders) {
                this.renderRecentOrders(data.orders);
            }
        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    },

    // Render recent orders table
    renderRecentOrders(orders) {
        const tbody = document.getElementById('recentOrdersTable');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Нет заказов</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const statusClass = this.getStatusClass(order.status);
            const date = new Date(order.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr class="table-row hover:bg-gray-50 transition-colors duration-150">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${order.id || order.orderReference || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.telegram_username ? `<span class="font-medium">@${order.telegram_username}</span>` : order.telegram_user_id || 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.country_name || order.country_code || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${order.price || '0.00'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="status-badge ${statusClass}">${this.getStatusText(order.status)}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                </tr>
            `;
        }).join('');
    },

    // Get status CSS class
    getStatusClass(status) {
        const statusMap = {
            'completed': 'status-completed',
            'pending': 'status-pending',
            'failed': 'status-failed',
            'processing': 'status-processing',
            'active': 'status-completed',
            'cancelled': 'status-failed'
        };
        return statusMap[status] || 'status-pending';
    },

    // Get status text
    getStatusText(status) {
        const statusMap = {
            'completed': 'Завершен',
            'pending': 'Ожидает',
            'failed': 'Ошибка',
            'processing': 'Обработка',
            'active': 'Активен',
            'cancelled': 'Отменен'
        };
        return statusMap[status] || status;
    }
};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.loadStats();
    Dashboard.loadRecentOrders();
    
    // Refresh stats every 5 minutes
    setInterval(() => {
        Dashboard.loadStats();
        Dashboard.loadRecentOrders();
    }, 5 * 60 * 1000);
});
