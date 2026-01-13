// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // Disable automatic scroll to top
    tg.enableClosingConfirmation();
    
    // Показываем кнопку "назад" в Telegram
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            // Скрываем BackButton перед переходом, чтобы на account.html она не была видна
            try {
                if (typeof tg.BackButton.offClick === 'function') {
                    tg.BackButton.offClick();
                }
                tg.BackButton.hide();
                // Дополнительная задержка для гарантии скрытия
                setTimeout(() => {
                    tg.BackButton.hide();
                }, 0);
            } catch (e) {}
            // Используем replace вместо href для предотвращения bfcache
            window.location.replace('account.html');
        });
    }
}

// Глобальная переменная для хранения заказов
let esimsData = [];

// Загрузить заказы из localStorage
function loadOrdersFromLocalStorage() {
    try {
        const stored = localStorage.getItem('esim_orders');
        if (stored) {
            const orders = JSON.parse(stored);
            return orders.map(order => {
                // Преобразуем статус on_hold в onhold для совместимости с UI
                let displayStatus = order.status || 'completed';
                if (displayStatus === 'on_hold') {
                    displayStatus = 'onhold';
                }
                
                return {
                    id: `#${order.orderReference?.substring(0, 8) || 'N/A'}`,
                    date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                    }) : 'N/A',
                    status: displayStatus,
                    hasDetails: !!(order.iccid && order.matchingId),
                    country: order.country_name || '',
                    code: order.country_code || '',
                    plan: order.plan_id || '',
                    duration: '', // Можно добавить из плана
                    price: order.price ? `${order.currency || '$'} ${order.price}` : '',
                    activationDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
                    expiryDate: '', // Можно добавить из плана
                    iccid: order.iccid || '',
                    matchingId: order.matchingId || '',
                    rspUrl: order.smdpAddress || '',
                    qrCode: order.qrCode || order.qr_code || '',
                    orderReference: order.orderReference || '',
                    bundle_name: order.bundle_name || ''
                };
            });
        }
    } catch (error) {
        console.error('Error loading orders from localStorage:', error);
    }
    return [];
}

// Загрузить заказы с сервера
async function loadOrdersFromServer(userId) {
    try {
        // Убеждаемся, что userId строка (как хранится в базе)
        const userIdStr = String(userId);
        const apiUrl = `/api/orders?telegram_user_id=${userIdStr}`;
        console.log('[My eSIMs] Fetching orders from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-cache' // Отключаем кеширование для получения актуальных данных
        });
        
        console.log('[My eSIMs] API response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[My eSIMs] API error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[My eSIMs] API response:', {
            success: result.success,
            hasData: !!result.data,
            dataLength: result.data ? result.data.length : 0,
            dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
            error: result.error
        });
        
        if (result.success && result.data && Array.isArray(result.data)) {
            console.log(`[My eSIMs] ✅ Loaded ${result.data.length} orders from server for user ${userIdStr}`);
            
            // Логируем первые несколько заказов для отладки
            if (result.data.length > 0) {
                console.log('[My eSIMs] Sample orders:', result.data.slice(0, 2).map(o => ({
                    orderReference: o.orderReference,
                    status: o.status,
                    hasIccid: !!o.iccid,
                    hasMatchingId: !!o.matchingId
                })));
            }
            
            // Сохраняем в localStorage для офлайн доступа
            const ordersToStore = result.data.map(order => ({
                orderReference: order.orderReference,
                iccid: order.iccid,
                matchingId: order.matchingId,
                smdpAddress: order.smdpAddress || order.rspUrl,
                qrCode: order.qrCode || order.qr_code,
                country_code: order.country_code,
                country_name: order.country_name,
                plan_id: order.plan_id,
                plan_type: order.plan_type,
                bundle_name: order.bundle_name,
                price: order.price,
                currency: order.currency,
                status: order.status,
                createdAt: order.createdAt || order.date
            }));
            localStorage.setItem('esim_orders', JSON.stringify(ordersToStore));
            console.log('[My eSIMs] Saved', ordersToStore.length, 'orders to localStorage');
            
            // Преобразуем в формат для отображения
            const formattedOrders = result.data.map(order => {
                // Преобразуем статус on_hold в onhold для совместимости с UI
                let displayStatus = order.status || 'completed';
                if (displayStatus === 'on_hold') {
                    displayStatus = 'onhold';
                }
                
                return {
                    id: `#${order.orderReference?.substring(0, 8) || 'N/A'}`,
                    date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                    }) : 'N/A',
                    status: displayStatus,
                    hasDetails: !!(order.iccid && order.matchingId),
                    country: order.country_name || '',
                    code: order.country_code || '',
                    plan: order.plan_id || '',
                    duration: '', // Можно добавить из плана
                    price: order.price ? `${order.currency || '$'} ${order.price}` : '',
                    activationDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
                    expiryDate: '', // Можно добавить из плана
                    iccid: order.iccid || '',
                    matchingId: order.matchingId || '',
                    rspUrl: order.smdpAddress || order.rspUrl || '',
                    qrCode: order.qrCode || order.qr_code || '',
                    orderReference: order.orderReference || '',
                    bundle_name: order.bundle_name || ''
                };
            });
            
            console.log('[My eSIMs] Formatted orders for display:', formattedOrders.length);
            return formattedOrders;
        } else {
            console.warn('[My eSIMs] No orders found or invalid response format:', {
                success: result.success,
                hasData: !!result.data,
                dataType: typeof result.data,
                isArray: Array.isArray(result.data),
                error: result.error,
                fullResponse: result
            });
        }
    } catch (error) {
        console.error('[My eSIMs] Error loading orders from server:', error);
        console.error('[My eSIMs] Error stack:', error.stack);
    }
    return [];
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[My eSIMs] Initializing...');
    
    // Telegram Auth - получение Telegram ID пользователя
    const auth = window.telegramAuth;
    let userId = null;
    
    if (auth && auth.isAuthenticated()) {
        userId = auth.getUserId();
        console.log('[My eSIMs] Loading for user:', userId);
        console.log('[My eSIMs] Auth object:', { 
            isAuthenticated: auth.isAuthenticated(), 
            userId: userId,
            username: auth.getUsername ? auth.getUsername() : 'N/A'
        });
        
        // Сохранить userId для использования при загрузке заказов
        window.currentUserId = userId;
        
        // Сначала загружаем из localStorage (быстро)
        const localOrders = loadOrdersFromLocalStorage();
        console.log('[My eSIMs] Loaded from localStorage:', localOrders.length, 'orders');
        esimsData = localOrders;
        renderESimsList();
        
        // Затем загружаем с сервера (синхронизация)
        console.log('[My eSIMs] Loading orders from server...');
        const serverOrders = await loadOrdersFromServer(userId);
        console.log('[My eSIMs] Loaded from server:', serverOrders.length, 'orders');
        
        if (serverOrders.length > 0) {
            esimsData = serverOrders;
            console.log('[My eSIMs] Using server orders, rendering list...');
            renderESimsList();
        } else if (localOrders.length > 0) {
            // Если сервер вернул пустой массив, но есть локальные данные, используем их
            console.log('[My eSIMs] Server returned empty, using local orders');
            esimsData = localOrders;
            renderESimsList();
        } else {
            console.log('[My eSIMs] No orders found (neither server nor local)');
            renderESimsList();
        }
    } else {
        console.log('[My eSIMs] User not authenticated, loading from localStorage only');
        // Если нет авторизации, загружаем только из localStorage
        esimsData = loadOrdersFromLocalStorage();
        console.log('[My eSIMs] Loaded from localStorage (no auth):', esimsData.length, 'orders');
        renderESimsList();
    }
    
    setupNavigation();
    setupScrollPreservation();
});

// Setup scroll position preservation
function setupScrollPreservation() {
    const mainContent = document.querySelector('.my-esims-content');
    if (!mainContent) return;
    
    let scrollPosition = 0;
    let isUserScrolling = false;
    let scrollTimeout;
    let isRestoringScroll = false;
    
    // Save scroll position when user scrolls
    mainContent.addEventListener('scroll', () => {
        if (!isRestoringScroll) {
            isUserScrolling = true;
            scrollPosition = mainContent.scrollTop;
        }
        
        // Clear timeout
        clearTimeout(scrollTimeout);
        
        // Set flag to false after scrolling stops
        scrollTimeout = setTimeout(() => {
            isUserScrolling = false;
        }, 150);
    });
    
    // Prevent automatic scroll to top on window focus or other events
    window.addEventListener('focus', (e) => {
        if (scrollPosition > 0 && !isUserScrolling) {
            isRestoringScroll = true;
            requestAnimationFrame(() => {
                mainContent.scrollTop = scrollPosition;
                isRestoringScroll = false;
            });
        }
    });
    
    // Prevent automatic scroll to top on resize
    window.addEventListener('resize', () => {
        if (scrollPosition > 0 && !isUserScrolling) {
            isRestoringScroll = true;
            requestAnimationFrame(() => {
                mainContent.scrollTop = scrollPosition;
                isRestoringScroll = false;
            });
        }
    });
    
    // Prevent automatic scroll to top
    const observer = new MutationObserver(() => {
        if (!isUserScrolling && scrollPosition > 0 && !isRestoringScroll) {
            // Restore scroll position after DOM changes
            isRestoringScroll = true;
            requestAnimationFrame(() => {
                mainContent.scrollTop = scrollPosition;
                isRestoringScroll = false;
            });
        }
    });
    
    // Observe changes in the content
    observer.observe(mainContent, {
        childList: true,
        subtree: true
    });
    
    // Prevent default scroll behavior on touch events that might reset scroll
    mainContent.addEventListener('touchstart', (e) => {
        scrollPosition = mainContent.scrollTop;
    }, { passive: true });
    
    mainContent.addEventListener('touchmove', (e) => {
        scrollPosition = mainContent.scrollTop;
    }, { passive: true });
    
    // Prevent scroll reset on click events (but don't block navigation)
    document.addEventListener('click', (e) => {
        // Only save scroll position if clicking on esim-item (not navigation)
        if (e.target.closest('.esim-item') && !e.target.closest('.nav-item')) {
            // Save current scroll position before any potential navigation
            scrollPosition = mainContent.scrollTop;
        }
    }, true);
}

// Render eSIMs list
function renderESimsList() {
    console.log('[My eSIMs] Rendering list with', esimsData.length, 'orders');
    
    const esimsList = document.getElementById('esimsList');
    const emptyState = document.getElementById('emptyState');
    if (!esimsList || !emptyState) {
        console.error('[My eSIMs] DOM elements not found!');
        return;
    }
    
    // Check if there are no orders
    if (esimsData.length === 0) {
        console.log('[My eSIMs] No orders to display, showing empty state');
        esimsList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    // Show list and hide empty state
    console.log('[My eSIMs] Rendering', esimsData.length, 'orders');
    esimsList.style.display = 'flex';
    emptyState.style.display = 'none';
    esimsList.innerHTML = '';
    
    esimsData.forEach((esim, index) => {
        console.log(`[My eSIMs] Rendering order ${index + 1}:`, {
            id: esim.id,
            status: esim.status,
            hasDetails: esim.hasDetails,
            orderReference: esim.orderReference
        });
        const esimItem = document.createElement('div');
        esimItem.className = 'esim-item';
        
        const statusConfig = getStatusConfig(esim.status);
        
        let badgesHTML = `
            <span class="esim-status-badge ${statusConfig.class}">${statusConfig.label}</span>
        `;
        
        if (esim.hasDetails) {
            badgesHTML += `
                <span class="esim-details-badge">Details</span>
            `;
        }
        
        esimItem.innerHTML = `
            <div class="esim-left">
                ${badgesHTML}
            </div>
            <div class="esim-right">
                <div class="esim-id">${esim.id}</div>
                <div class="esim-date">${esim.date}</div>
            </div>
        `;
        
        // Add click handler for completed status
        if (esim.status === 'completed') {
            esimItem.style.cursor = 'pointer';
            esimItem.addEventListener('click', (e) => {
                // Don't navigate if clicking on Details badge (it will have its own handler)
                if (!e.target.classList.contains('esim-details-badge')) {
                    navigateToOrderDetails(esim);
                }
            });
            
            // Add click handler for Details badge
            setTimeout(() => {
                const detailsBadge = esimItem.querySelector('.esim-details-badge');
                if (detailsBadge) {
                    detailsBadge.style.cursor = 'pointer';
                    detailsBadge.addEventListener('click', (e) => {
                        e.stopPropagation();
                        navigateToOrderDetails(esim);
                    });
                }
            }, 0);
        }
        
        esimsList.appendChild(esimItem);
    });
}

// Get status configuration
function getStatusConfig(status) {
    const configs = {
        'completed': {
            label: 'Completed',
            class: 'status-completed'
        },
        'canceled': {
            label: 'Canceled',
            class: 'status-canceled'
        },
        'on_hold': {
            label: 'On hold',
            class: 'status-onhold'
        },
        'onhold': {
            label: 'On hold',
            class: 'status-onhold'
        },
        'failed': {
            label: 'Failed',
            class: 'status-canceled'
        }
    };
    
    return configs[status] || configs.onhold;
}

// Navigate to order details
function navigateToOrderDetails(esim) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    // Extract full orderReference from id (format: #aa73ec03) or use orderReference directly
    let orderRef = esim.orderReference || '';
    if (!orderRef && esim.id) {
        // Try to extract from id format #aa73ec03
        const idMatch = esim.id.match(/#([a-f0-9-]+)/i);
        if (idMatch) {
            orderRef = idMatch[1];
        }
    }
    
    // If we still don't have orderReference, try to find it from localStorage
    if (!orderRef) {
        try {
            const stored = localStorage.getItem('esim_orders');
            if (stored) {
                const orders = JSON.parse(stored);
                const foundOrder = orders.find(o => 
                    o.orderReference && (
                        o.orderReference.startsWith(esim.id?.replace('#', '') || '') ||
                        `#${o.orderReference?.substring(0, 8)}` === esim.id
                    )
                );
                if (foundOrder) {
                    orderRef = foundOrder.orderReference;
                }
            }
        } catch (error) {
            console.warn('[My eSIMs] Error loading orderReference from localStorage:', error);
        }
    }
    
    const params = new URLSearchParams({
        orderReference: orderRef || esim.orderReference || '',
        id: esim.id || '',
        date: esim.date || '',
        country: esim.country || '',
        code: esim.code || '',
        plan: esim.plan || esim.bundle_name || '',
        duration: esim.duration || '',
        price: esim.price || '',
        activationDate: esim.activationDate || '',
        expiryDate: esim.expiryDate || '',
        iccid: esim.iccid || '',
        matchingId: esim.matchingId || '',
        rspUrl: esim.rspUrl || esim.smdpAddress || ''
    });
    
    console.log('[My eSIMs] Navigating to order details:', {
        orderReference: orderRef,
        id: esim.id
    });
    
    window.location.href = `order-details.html?${params.toString()}`;
}

// Setup bottom navigation
function setupNavigation() {
    // Account button
    const accountNavBtn = document.getElementById('accountNavBtn');
    if (accountNavBtn) {
        accountNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
            navigate('account.html');
        });
    }
    
    // Buy eSIM button
    const buyESimNavBtn = document.getElementById('buyESimNavBtn');
    if (buyESimNavBtn) {
        buyESimNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
            navigate('index.html');
        });
    }
    
    // Help button
    const helpNavBtn = document.getElementById('helpNavBtn');
    if (helpNavBtn) {
        helpNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
            navigate('help.html');
        });
    }
}


