/**
 * Dashboard statistics and data loading
 */

const Dashboard = {
    salesChart: null,
    paymentMethodsChart: null,

    // Load dashboard statistics
    async loadStats() {
        try {
            const response = await Auth.authenticatedFetch('/api/admin/stats');
            if (!response) return;

            const data = await response.json();
            
            if (data.success) {
                this.updateStats(data.data);
                
                // Load chart data
                if (data.data.salesData) {
                    this.renderSalesChart(data.data.salesData);
                }
                if (data.data.paymentMethods) {
                    this.renderPaymentMethodsChart(data.data.paymentMethods);
                }
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
            const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
            totalRevenue.textContent = `$${stats.totalRevenue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        const revenueChange = document.getElementById('revenueChange');
        if (revenueChange && stats.revenueChange !== undefined) {
            const sign = stats.revenueChange >= 0 ? '+' : '';
            revenueChange.textContent = `${sign}${stats.revenueChange.toFixed(1)}% this month`;
            revenueChange.className = stats.revenueChange >= 0 ? 'text-green-600 text-sm mt-1' : 'text-red-600 text-sm mt-1';
        }

        // Total Orders
        const totalOrders = document.getElementById('totalOrders');
        if (totalOrders && stats.totalOrders !== undefined) {
            const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
            totalOrders.textContent = stats.totalOrders.toLocaleString(locale);
        }

        const ordersChange = document.getElementById('ordersChange');
        if (ordersChange && stats.ordersChange !== undefined) {
            const sign = stats.ordersChange >= 0 ? '+' : '';
            ordersChange.textContent = `${sign}${stats.ordersChange} this month`;
        }

        // Active Users
        const activeUsers = document.getElementById('activeUsers');
        if (activeUsers && stats.activeUsers !== undefined) {
            const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
            activeUsers.textContent = stats.activeUsers.toLocaleString(locale);
        }

        const usersChange = document.getElementById('usersChange');
        if (usersChange && stats.usersChange !== undefined) {
            const sign = stats.usersChange >= 0 ? '+' : '';
            usersChange.textContent = `${sign}${stats.usersChange} this month`;
        }

        // Conversion Rate
        const conversionRate = document.getElementById('conversionRate');
        if (conversionRate && stats.conversionRate !== undefined) {
            conversionRate.textContent = `${stats.conversionRate.toFixed(1)}%`;
        }

        const conversionChange = document.getElementById('conversionChange');
        if (conversionChange && stats.conversionChange !== undefined) {
            const sign = stats.conversionChange >= 0 ? '+' : '';
            conversionChange.textContent = `${sign}${stats.conversionChange.toFixed(1)}% this month`;
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
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">${window.i18n ? window.i18n.t('noOrders') : 'No orders'}</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const statusClass = this.getStatusClass(order.status);
            const orderDate = order.createdAt || order.date || new Date();
            const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
            const date = new Date(orderDate).toLocaleString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr class="table-row">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${order.id || order.orderReference || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.telegram_username ? `@${order.telegram_username}` : order.telegram_user_id || 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.country_name || order.country_code || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${(order.finalPrice || order.price || '0.00').toFixed(2)}</td>
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
        if (window.i18n) {
            // Use i18n if available
            const key = status || 'pending';
            return window.i18n.t(key);
        }
        
        // Fallback to English
        const statusMap = {
            'completed': 'Completed',
            'pending': 'Pending',
            'failed': 'Failed',
            'processing': 'Processing',
            'active': 'Active',
            'cancelled': 'Cancelled',
            'on_hold': 'On Hold'
        };
        return statusMap[status] || status;
    },

    // Render sales chart
    renderSalesChart(data) {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy previous chart if exists
        if (this.salesChart) {
            this.salesChart.destroy();
        }

        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Sales ($)',
                    data: data.values,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return 'Sales: $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    },

    // Render payment methods chart
    renderPaymentMethodsChart(data) {
        const canvas = document.getElementById('paymentMethodsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy previous chart if exists
        if (this.paymentMethodsChart) {
            this.paymentMethodsChart.destroy();
        }

        const labels = {
            'telegram_stars': 'Telegram Stars',
            'bank_card': 'Bank Card',
            'crypto': 'Cryptocurrency'
        };

        this.paymentMethodsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels.map(label => labels[label] || label),
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check that Auth is available
    if (typeof Auth === 'undefined') {
        console.error('Auth is not defined. Make sure auth.js is loaded before dashboard.js');
        return;
    }
    
    try {
        Dashboard.loadStats();
        Dashboard.loadRecentOrders();
        
        // Refresh stats every 5 minutes
        setInterval(() => {
            Dashboard.loadStats();
            Dashboard.loadRecentOrders();
        }, 5 * 60 * 1000);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});

