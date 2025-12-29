/**
 * Orders management page
 */

const Orders = {
    currentPage: 1,
    pageSize: 20,
    currentStatus: '',
    currentPaymentType: '',
    currentSearch: '',
    currentDateFrom: '',
    currentDateTo: '',
    currentUserId: '',
    
    // Load orders
    async loadOrders(page = 1) {
        try {
            const offset = (page - 1) * this.pageSize;
            let url = `/api/admin/orders?limit=${this.pageSize}&offset=${offset}&sort=createdAt&order=desc`;
            
            // Apply all filters
            if (this.currentStatus) {
                url += `&status=${this.currentStatus}`;
            }
            if (this.currentPaymentType) {
                url += `&paymentType=${this.currentPaymentType}`;
            }
            if (this.currentSearch) {
                url += `&search=${encodeURIComponent(this.currentSearch)}`;
            }
            if (this.currentUserId) {
                url += `&userId=${encodeURIComponent(this.currentUserId)}`;
            }
            if (this.currentDateFrom) {
                url += `&dateFrom=${this.currentDateFrom}`;
            }
            if (this.currentDateTo) {
                url += `&dateTo=${this.currentDateTo}`;
            }
            
            const response = await Auth.authenticatedFetch(url);
            if (!response) {
                console.error('No response from server - authentication may have failed');
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', response.status, errorText);
                const errorMsg = window.i18n ? window.i18n.t('serverError') : 'Server error';
                this.showError(`${errorMsg}: ${response.status}`);
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderOrders(data.orders || []);
                this.renderPagination(data.total || 0, page);
            } else {
                console.error('API returned error:', data);
                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                this.showError(data.error || t('errorLoadingOrders'));
                // Show empty table on error
                this.renderOrders([]);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorLoadingOrders') + ': ' + error.message);
            // Показываем пустую таблицу при ошибке
            this.renderOrders([]);
        }
    },
    
    // Render orders table
    renderOrders(orders) {
        const tbody = document.getElementById('ordersTable');
        if (!tbody) return;
        
        if (orders.length === 0) {
            const noOrdersText = window.i18n ? window.i18n.t('noOrders') : 'No orders';
            tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">${noOrdersText}</td></tr>`;
            return;
        }
        
        tbody.innerHTML = orders.map(order => {
            const statusClass = this.getStatusClass(order.status);
            const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
            const date = new Date(order.createdAt || order.date || 0).toLocaleString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const orderId = order.orderReference || order.id || 'N/A';
            const userId = order.telegram_user_id || 'N/A';
            const username = order.telegram_username ? `@${order.telegram_username}` : userId;
            const paymentType = this.getPaymentTypeText(order.payment_method || order.paymentType);
            const planName = order.plan_name || order.bundle_name || order.plan_id || 'N/A';
            
            return `
                <tr class="table-row hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${orderId}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.country_name || order.country_code || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${planName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${order.price || '0.00'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${paymentType}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="status-badge ${statusClass}">${this.getStatusText(order.status)}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick="Orders.showOrderDetails('${orderId}', '${userId}')" class="text-blue-600 hover:text-blue-800 font-medium">
                            ${window.i18n ? window.i18n.t('details') : 'Details'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Show order details modal
    async showOrderDetails(orderId, userId) {
        try {
            // Build fullOrderId: userId_orderReference
            // If userId exists and is not 'N/A', use format userId_orderId
            const fullOrderId = (userId && userId !== 'N/A' && orderId && orderId !== 'N/A') 
                ? `${userId}_${orderId}` 
                : orderId;
            
            console.log(`[Orders] Loading order details: orderId=${orderId}, userId=${userId}, fullOrderId=${fullOrderId}`);
            
            const response = await Auth.authenticatedFetch(`/api/admin/orders/${fullOrderId}`);
            if (!response) return;
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Orders] Server error:', response.status, errorData);
                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                this.showError(errorData.error || t('orderNotFound'));
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.order) {
                this.renderOrderDetails(data.order);
                document.getElementById('orderModal').classList.remove('hidden');
            } else {
                console.error('[Orders] Order not found in response:', data);
                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                this.showError(t('orderNotFound'));
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorLoadingOrderDetails') + ': ' + error.message);
        }
    },
    
    // Render order details
    renderOrderDetails(order) {
        const container = document.getElementById('orderDetails');
        if (!container) return;
        
        const locale = window.i18n ? window.i18n.getLocale() : 'en-US';
        const date = new Date(order.createdAt || order.date || 0).toLocaleString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // eSIM data - check all possible sources
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        const iccid = order.iccid || order.assignments?.iccid || order.esimData?.iccid || t('notSpecified');
        const matchingId = order.matchingId || order.assignments?.matchingId || order.esimData?.matchingId || t('notSpecified');
        const rspUrl = order.rspUrl || order.smdpAddress || order.assignments?.smdpAddress || order.esimData?.smdpAddress || t('notSpecified');
        const qrCode = order.qrCode || order.assignments?.qrCode || order.esimData?.qrCode || order.qr_code || null;
        
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Order Information -->
                <div class="space-y-5">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('orderInfo')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5 space-y-4">
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('orderId')}</span>
                                <span class="ml-4 font-semibold text-gray-900 text-right">#${order.orderReference || order.id || 'N/A'}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('user')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right">${order.telegram_username ? `@${order.telegram_username}` : order.telegram_user_id || 'N/A'}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('country')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right">${order.country_name || order.country_code || 'N/A'}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('plan')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right">${order.plan_name || order.plan_id || 'N/A'}</span>
                            </div>
                            <div class="flex items-start justify-between pt-3 border-t border-gray-200">
                                <span class="text-sm text-gray-600">${t('amount')}</span>
                                <span class="ml-4 font-bold text-xl text-blue-600">$${order.price || '0.00'}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('paymentMethod')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right">${this.getPaymentTypeText(order.payment_method || order.paymentType)}</span>
                            </div>
                            <div class="flex items-start justify-between">
                                <span class="text-sm text-gray-600">${t('createdAt')}</span>
                                <span class="ml-4 font-medium text-gray-900 text-right text-xs">${date}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Order Status -->
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('orderStatus')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5">
                            <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                                <div class="flex items-center gap-3">
                                    <span class="status-badge ${this.getStatusClass(order.status)}">${this.getStatusText(order.status)}</span>
                                </div>
                                <select id="statusSelect" class="form-input text-sm py-1.5 px-3 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                    <option value="on_hold" ${order.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
                                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="canceled" ${order.status === 'canceled' ? 'selected' : ''}>Canceled</option>
                                    <option value="failed" ${order.status === 'failed' ? 'selected' : ''}>Failed</option>
                                </select>
                            </div>
                            <button onclick="Orders.updateStatus('${order.orderReference || order.id}', '${order.telegram_user_id}')" class="btn btn-primary w-full">
                                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                                ${t('updateStatus')}
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- eSIM Data -->
                <div class="space-y-5">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('esimData')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5 space-y-4">
                            <div>
                                <span class="text-sm text-gray-600 block mb-2">ICCID</span>
                                <div class="flex items-center gap-2">
                                    <code class="flex-1">${iccid}</code>
                                    <button onclick="Orders.copyToClipboard('${iccid}')" class="text-blue-600 hover:text-blue-800 transition-colors" title="${t('copy')}">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-2">Matching ID</span>
                                <div class="flex items-center gap-2">
                                    <code class="flex-1">${matchingId}</code>
                                    <button onclick="Orders.copyToClipboard('${matchingId}')" class="text-blue-600 hover:text-blue-800 transition-colors" title="${t('copy')}">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600 block mb-2">RSP URL</span>
                                <div class="flex items-center gap-2">
                                    <code class="flex-1 break-all">${rspUrl}</code>
                                    <button onclick="Orders.copyToClipboard('${rspUrl}')" class="text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0" title="${t('copy')}">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            ${qrCode ? `
                            <div class="pt-3 border-t border-gray-200">
                                <span class="text-sm text-gray-600 block mb-3">${t('qrCode')}</span>
                                <div class="flex flex-col items-center gap-3">
                                    <img src="${qrCode}" alt="QR Code" class="w-28 h-28 border-2 border-gray-200 rounded-xl object-contain bg-white shadow-sm">
                                    <button onclick="Orders.downloadQR('${qrCode}', '${order.orderReference || order.id || 'order'}')" class="btn btn-secondary text-sm px-4 py-2">
                                        <svg class="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                        </svg>
                                        ${t('downloadQR')}
                                    </button>
                                </div>
                            </div>
                            ` : `<div class="text-sm text-gray-500 text-center py-4">${t('qrCodeNotAvailable')}</div>`}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-3">${t('actions')}</h4>
                        <div class="bg-gray-50 rounded-lg p-5">
                            <button onclick="Orders.resendESIM('${order.orderReference || order.id}', '${order.telegram_user_id}')" class="btn btn-primary w-full">
                                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                                ${t('sendESIMTelegram')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Update order status
    async updateStatus(orderId, userId) {
        const statusSelect = document.getElementById('statusSelect');
        if (!statusSelect) return;
        
        const newStatus = statusSelect.value;
        if (!newStatus) return;
        
        try {
            const fullOrderId = userId && orderId ? `${userId}_${orderId}` : orderId;
            const response = await Auth.authenticatedFetch(`/api/admin/orders/${fullOrderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                this.showSuccess(t('statusUpdated'));
                this.loadOrders(this.currentPage);
                document.getElementById('orderModal').classList.add('hidden');
            } else {
                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                this.showError(data.error || t('errorUpdatingStatus'));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorUpdatingStatus'));
        }
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess(t('copiedToClipboard'));
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showError(t('errorCopying'));
        });
    },
    
    // Render pagination
    renderPagination(total, currentPage) {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) {
            container.innerHTML = `<div class="text-sm text-gray-600">${t('totalOrdersCount')}: ${total}</div>`;
            return;
        }
        
        let html = `<div class="text-sm text-gray-600">${t('totalOrdersCount')}: ${total}</div>`;
        html += '<div class="flex gap-2">';
        
        if (currentPage > 1) {
            html += `<button onclick="Orders.loadOrders(${currentPage - 1})" class="px-3 py-1 border rounded hover:bg-gray-50">${t('back')}</button>`;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button onclick="Orders.loadOrders(${i})" class="px-3 py-1 border rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += '<span class="px-3 py-1">...</span>';
            }
        }
        
        if (currentPage < totalPages) {
            html += `<button onclick="Orders.loadOrders(${currentPage + 1})" class="px-3 py-1 border rounded hover:bg-gray-50">${t('next')}</button>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    // Get status CSS class
    getStatusClass(status) {
        const statusMap = {
            'on_hold': 'status-pending',
            'completed': 'status-completed',
            'canceled': 'status-failed',
            'failed': 'status-failed',
            // Old statuses for backward compatibility
            'pending': 'status-pending',
            'processing': 'status-pending',
            'active': 'status-completed',
            'cancelled': 'status-failed'
        };
        return statusMap[status] || 'status-pending';
    },
    
    // Get status text
    getStatusText(status) {
        const statusMap = {
            'on_hold': 'On Hold',
            'completed': 'Completed',
            'canceled': 'Canceled',
            'failed': 'Failed',
            // Old statuses for backward compatibility
            'pending': 'On Hold',
            'processing': 'On Hold',
            'active': 'Completed',
            'cancelled': 'Canceled'
        };
        return statusMap[status] || status;
    },
    
    // Get payment type text
    getPaymentTypeText(paymentType) {
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        if (!paymentType) return t('notSpecified');
        const paymentMap = {
            'telegram_stars': 'Telegram Stars',
            'crypto': t('cryptocurrencies'),
            'bank_card': t('bankCards')
        };
        return paymentMap[paymentType] || paymentType;
    },
    
    // Resend eSIM to Telegram
    async resendESIM(orderId, userId) {
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        if (!confirm(t('sendESIMConfirm'))) return;
        
        try {
            const fullOrderId = userId && orderId ? `${userId}_${orderId}` : orderId;
            const response = await Auth.authenticatedFetch(`/api/admin/orders/${fullOrderId}/resend`, {
                method: 'POST'
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(t('esimSent'));
            } else {
                this.showError(data.error || t('errorSendingESIM'));
            }
        } catch (error) {
            console.error('Error resending eSIM:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorSendingESIM'));
        }
    },
    
    // Show error message
    showError(message) {
        // Simple alert for now, can be improved with toast notifications
        alert('Error: ' + message);
    },
    
    // Show success message
    showSuccess(message) {
        // Simple alert for now, can be improved with toast notifications
        alert('Success: ' + message);
    },
    
    // Download QR code
    downloadQR(qrCodeUrl, orderId) {
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        try {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `qr-code-${orderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showSuccess(t('qrCodeDownloaded'));
        } catch (error) {
            console.error('Error downloading QR:', error);
            this.showError(t('errorDownloadingQR'));
        }
    },
    
    // Clear user filter
    clearUserFilter() {
        this.currentUserId = '';
        this.currentPage = 1;
        
        // Remove userId from URL
        const url = new URL(window.location);
        url.searchParams.delete('userId');
        window.history.replaceState({}, '', url);
        
        // Remove banner
        const banner = document.getElementById('userFilterBanner');
        if (banner) {
            banner.remove();
        }
        
        // Reload orders without filter
        this.loadOrders(1);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check that Auth is available
    if (typeof Auth === 'undefined') {
        console.error('Auth is not defined. Make sure auth.js is loaded before orders.js');
        return;
    }
    
    try {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const searchParam = urlParams.get('search');
        
        // If userId is in URL, set filter
        if (userId && userId.trim() !== '') {
            Orders.currentUserId = userId.trim();
            console.log('Filtering orders by userId:', userId);
            
            // Показываем баннер с информацией о фильтре
            // Ищем контейнер с фильтрами по наличию searchInput внутри него
            const searchInput = document.getElementById('searchInput');
            if (!searchInput) return;
            
            const filtersContainer = searchInput.closest('.bg-white.rounded-lg.shadow.p-4.mb-4');
            if (filtersContainer) {
                const filterBanner = document.createElement('div');
                filterBanner.className = 'mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between';
                filterBanner.id = 'userFilterBanner';
                filterBanner.innerHTML = `
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                        </svg>
                        <div>
                            <span class="text-sm font-medium text-blue-900">${window.i18n ? window.i18n.t('filterByUserLabel') : 'Filter by user'}: </span>
                            <span class="text-sm text-blue-700">${userId}</span>
                        </div>
                    </div>
                    <button onclick="Orders.clearUserFilter()" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        ${window.i18n ? window.i18n.t('clearFilter') : 'Clear filter'}
                    </button>
                `;
                // Insert banner after filter container as sibling element
                filtersContainer.parentNode.insertBefore(filterBanner, filtersContainer.nextSibling);
            }
        }
        
        // If search is in URL, set it
        if (searchParam) {
            Orders.currentSearch = searchParam;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = searchParam;
            }
        }
        
        Orders.loadOrders();
        
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    Orders.currentSearch = e.target.value;
                    Orders.currentPage = 1;
                    Orders.loadOrders(1);
                }, 500);
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                Orders.currentStatus = e.target.value;
                Orders.currentPage = 1;
                Orders.loadOrders(1);
            });
        }
        
        // Payment type filter
        const paymentFilter = document.getElementById('paymentFilter');
        if (paymentFilter) {
            paymentFilter.addEventListener('change', (e) => {
                Orders.currentPaymentType = e.target.value;
                Orders.currentPage = 1;
                Orders.loadOrders(1);
            });
        }
        
        // Date filters
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (dateFrom) {
            dateFrom.addEventListener('change', (e) => {
                Orders.currentDateFrom = e.target.value;
                Orders.currentPage = 1;
                Orders.loadOrders(1);
            });
        }
        if (dateTo) {
            dateTo.addEventListener('change', (e) => {
                Orders.currentDateTo = e.target.value;
                Orders.currentPage = 1;
                Orders.loadOrders(1);
            });
        }
        
        // Clear filters
        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                Orders.currentStatus = '';
                Orders.currentPaymentType = '';
                Orders.currentSearch = '';
                Orders.currentUserId = '';
                Orders.currentDateFrom = '';
                Orders.currentDateTo = '';
                Orders.currentPage = 1;
                
                if (statusFilter) statusFilter.value = '';
                if (paymentFilter) paymentFilter.value = '';
                if (searchInput) searchInput.value = '';
                if (dateFrom) dateFrom.value = '';
                if (dateTo) dateTo.value = '';
                
                // Remove userId from URL
                const url = new URL(window.location);
                url.searchParams.delete('userId');
                url.searchParams.delete('search');
                window.history.replaceState({}, '', url);
                
                // Remove banner if exists
                const banner = document.getElementById('userFilterBanner');
                if (banner) {
                    banner.remove();
                }
                
                Orders.loadOrders(1);
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                Orders.loadOrders(Orders.currentPage);
            });
        }
        
        // Close modal
        const closeModal = document.getElementById('closeModal');
        const orderModal = document.getElementById('orderModal');
        if (closeModal && orderModal) {
            closeModal.addEventListener('click', () => {
                orderModal.classList.add('hidden');
            });
            orderModal.addEventListener('click', (e) => {
                if (e.target === orderModal) {
                    orderModal.classList.add('hidden');
                }
            });
        }
    } catch (error) {
        console.error('Error initializing orders page:', error);
    }
});

