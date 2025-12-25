/**
 * Orders management page
 */

const Orders = {
    currentPage: 1,
    pageSize: 20,
    currentStatus: '',
    
    // Load orders
    async loadOrders(page = 1, status = '') {
        try {
            const offset = (page - 1) * this.pageSize;
            let url = `/api/admin/orders?limit=${this.pageSize}&offset=${offset}&sort=createdAt&order=desc`;
            if (status) {
                url += `&status=${status}`;
            }
            
            const response = await Auth.authenticatedFetch(url);
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.renderOrders(data.orders || []);
                this.renderPagination(data.total || 0, page);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Ошибка загрузки заказов');
        }
    },
    
    // Render orders table
    renderOrders(orders) {
        const tbody = document.getElementById('ordersTable');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Нет заказов</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(order => {
            const statusClass = this.getStatusClass(order.status);
            const date = new Date(order.createdAt || order.date || 0).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const orderId = order.orderReference || order.id || 'N/A';
            const userId = order.telegram_user_id || 'N/A';
            const username = order.telegram_username ? `@${order.telegram_username}` : userId;
            
            return `
                <tr class="table-row hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${orderId}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.country_name || order.country_code || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${order.price || '0.00'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="status-badge ${statusClass}">${this.getStatusText(order.status)}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick="Orders.showOrderDetails('${orderId}', '${userId}')" class="text-blue-600 hover:text-blue-800 font-medium">
                            Детали
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Show order details modal
    async showOrderDetails(orderId, userId) {
        try {
            const fullOrderId = userId && orderId ? `${userId}_${orderId}` : orderId;
            const response = await Auth.authenticatedFetch(`/api/admin/orders/${fullOrderId}`);
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success && data.order) {
                this.renderOrderDetails(data.order);
                document.getElementById('orderModal').classList.remove('hidden');
            } else {
                this.showError('Заказ не найден');
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showError('Ошибка загрузки деталей заказа');
        }
    },
    
    // Render order details
    renderOrderDetails(order) {
        const container = document.getElementById('orderDetails');
        if (!container) return;
        
        const date = new Date(order.createdAt || order.date || 0).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // eSIM данные - проверяем все возможные источники
        const iccid = order.iccid || order.assignments?.iccid || order.esimData?.iccid || 'Не указан';
        const matchingId = order.matchingId || order.assignments?.matchingId || order.esimData?.matchingId || 'Не указан';
        const rspUrl = order.rspUrl || order.smdpAddress || order.assignments?.smdpAddress || order.esimData?.smdpAddress || 'Не указан';
        const qrCode = order.qrCode || order.assignments?.qrCode || order.esimData?.qrCode || order.qr_code || null;
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Основная информация -->
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-2">Основная информация</h4>
                        <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <span class="text-sm text-gray-600">ID заказа:</span>
                                <span class="ml-2 font-medium">#${order.orderReference || order.id || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Пользователь:</span>
                                <span class="ml-2 font-medium">${order.telegram_username ? `@${order.telegram_username}` : order.telegram_user_id || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Страна:</span>
                                <span class="ml-2 font-medium">${order.country_name || order.country_code || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">План:</span>
                                <span class="ml-2 font-medium">${order.plan_name || order.plan_id || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Сумма:</span>
                                <span class="ml-2 font-semibold text-lg">$${order.price || '0.00'}</span>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Дата создания:</span>
                                <span class="ml-2 font-medium">${date}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Статус -->
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-2">Статус заказа</h4>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <span class="status-badge ${this.getStatusClass(order.status)}">${this.getStatusText(order.status)}</span>
                                <select id="statusSelect" class="form-input w-auto">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ожидает</option>
                                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Обработка</option>
                                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершен</option>
                                    <option value="active" ${order.status === 'active' ? 'selected' : ''}>Активен</option>
                                    <option value="failed" ${order.status === 'failed' ? 'selected' : ''}>Ошибка</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                                </select>
                            </div>
                            <button onclick="Orders.updateStatus('${order.orderReference || order.id}', '${order.telegram_user_id}')" class="btn btn-primary w-full">
                                Обновить статус
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- eSIM данные -->
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase mb-2">eSIM данные</h4>
                        <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <span class="text-sm text-gray-600">ICCID:</span>
                                <div class="mt-1 flex items-center gap-2">
                                    <code class="bg-white px-3 py-1 rounded border text-sm font-mono">${iccid}</code>
                                    <button onclick="Orders.copyToClipboard('${iccid}')" class="text-blue-600 hover:text-blue-800">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">Matching ID:</span>
                                <div class="mt-1 flex items-center gap-2">
                                    <code class="bg-white px-3 py-1 rounded border text-sm font-mono">${matchingId}</code>
                                    <button onclick="Orders.copyToClipboard('${matchingId}')" class="text-blue-600 hover:text-blue-800">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span class="text-sm text-gray-600">RSP URL:</span>
                                <div class="mt-1 flex items-center gap-2">
                                    <code class="bg-white px-3 py-1 rounded border text-sm font-mono">${rspUrl}</code>
                                    <button onclick="Orders.copyToClipboard('${rspUrl}')" class="text-blue-600 hover:text-blue-800">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            ${qrCode ? `
                            <div>
                                <span class="text-sm text-gray-600">QR код:</span>
                                <div class="mt-2 flex flex-col items-center gap-2">
                                    <img src="${qrCode}" alt="QR Code" class="w-48 h-48 border rounded-lg object-contain bg-white">
                                    <button onclick="Orders.downloadQR('${qrCode}', '${order.orderReference || order.id || 'order'}')" class="btn btn-secondary text-sm">
                                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                        </svg>
                                        Скачать QR
                                    </button>
                                </div>
                            </div>
                            ` : '<div class="text-sm text-gray-500">QR код не доступен</div>'}
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
                this.showSuccess('Статус заказа обновлен');
                this.loadOrders(this.currentPage, this.currentStatus);
                document.getElementById('orderModal').classList.add('hidden');
            } else {
                this.showError(data.error || 'Ошибка обновления статуса');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Ошибка обновления статуса');
        }
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess('Скопировано в буфер обмена');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showError('Ошибка копирования');
        });
    },
    
    // Render pagination
    renderPagination(total, currentPage) {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) {
            container.innerHTML = `<div class="text-sm text-gray-600">Всего заказов: ${total}</div>`;
            return;
        }
        
        let html = `<div class="text-sm text-gray-600">Всего заказов: ${total}</div>`;
        html += '<div class="flex gap-2">';
        
        if (currentPage > 1) {
            html += `<button onclick="Orders.loadOrders(${currentPage - 1}, '${this.currentStatus}')" class="px-3 py-1 border rounded hover:bg-gray-50">Назад</button>`;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button onclick="Orders.loadOrders(${i}, '${this.currentStatus}')" class="px-3 py-1 border rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += '<span class="px-3 py-1">...</span>';
            }
        }
        
        if (currentPage < totalPages) {
            html += `<button onclick="Orders.loadOrders(${currentPage + 1}, '${this.currentStatus}')" class="px-3 py-1 border rounded hover:bg-gray-50">Вперед</button>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
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
    },
    
    // Show error message
    showError(message) {
        // Simple alert for now, can be improved with toast notifications
        alert('Ошибка: ' + message);
    },
    
    // Show success message
    showSuccess(message) {
        // Simple alert for now, can be improved with toast notifications
        alert('Успешно: ' + message);
    },
    
    // Download QR code
    downloadQR(qrCodeUrl, orderId) {
        try {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `qr-code-${orderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showSuccess('QR код скачан');
        } catch (error) {
            console.error('Error downloading QR:', error);
            this.showError('Ошибка скачивания QR кода');
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что Auth доступен
    if (typeof Auth === 'undefined') {
        console.error('Auth is not defined. Make sure auth.js is loaded before orders.js');
        return;
    }
    
    try {
        Orders.loadOrders();
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                Orders.currentStatus = e.target.value;
                Orders.currentPage = 1;
                Orders.loadOrders(1, e.target.value);
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                Orders.loadOrders(Orders.currentPage, Orders.currentStatus);
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

