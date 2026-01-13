// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // Показываем кнопку "назад" в Telegram
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            window.history.back();
        });
    }
}

// Get order data from URL
const urlParams = new URLSearchParams(window.location.search);
const orderReference = urlParams.get('orderReference') || urlParams.get('id')?.replace('#', '') || '';

// Order data - will be loaded from server
let orderData = {
    id: urlParams.get('id') || '',
    date: urlParams.get('date') || '',
    country: urlParams.get('country') || '',
    code: urlParams.get('code') || '',
    plan: urlParams.get('plan') || '',
    duration: urlParams.get('duration') || '',
    price: urlParams.get('price') || '',
    activationDate: urlParams.get('activationDate') || '',
    expiryDate: urlParams.get('expiryDate') || '',
    iccid: urlParams.get('iccid') || '',
    matchingId: urlParams.get('matchingId') || '',
    rspUrl: urlParams.get('rspUrl') || '',
    qrCode: urlParams.get('qrCode') || ''
};

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Use local SVG flags from flags folder
    // Файлы в верхнем регистре: AF.svg, TH.svg и т.д.
    let code = countryCode.toUpperCase();
    
    // Специальная обработка для файлов с пробелами или специальными символами
    const specialFlagFiles = {
        'CYP': 'CYP;CY .svg',  // Northern Cyprus файл с пробелом
        'US-HI': 'US-HI .svg'  // Hawaii файл с пробелом
    };
    
    // Если есть специальный файл, используем его
    // Кодируем пробелы и специальные символы в URL
    if (specialFlagFiles[code]) {
        const fileName = specialFlagFiles[code];
        const encodedFileName = encodeURIComponent(fileName);
        return `/flags/${encodedFileName}`;
    }
    
    return `/flags/${code}.svg`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Сначала скрываем данные, чтобы не показывать мокап
    hideOrderData();
    
    // Загружаем актуальные данные с сервера
    if (orderReference) {
        await loadOrderFromServer(orderReference);
    } else {
        // Если нет orderReference, используем данные из URL (fallback)
        console.warn('[Order Details] No orderReference, using URL params');
    }
    
    setupOrderDetails();
    setupNavigation();
    
    // Показываем данные после загрузки
    showOrderData();
});

// Hide order data until real data is loaded
function hideOrderData() {
    const orderCard = document.querySelector('.order-details-card');
    if (orderCard) {
        orderCard.style.opacity = '0';
    }
}

// Show order data after loading
function showOrderData() {
    const orderCard = document.querySelector('.order-details-card');
    if (orderCard) {
        orderCard.style.opacity = '1';
        orderCard.style.transition = 'opacity 0.3s ease-in';
    }
}

// Load order from server
async function loadOrderFromServer(orderRef) {
    try {
        // Get user ID from Telegram auth
        const auth = window.telegramAuth;
        let userId = null;
        if (auth && auth.isAuthenticated()) {
            userId = auth.getUserId();
        }
        
        if (!userId) {
            console.warn('[Order Details] No user ID, cannot load order from server');
            return;
        }
        
        console.log('[Order Details] Loading order from server:', orderRef);
        
        // Load all orders for user
        const response = await fetch(`/api/orders?telegram_user_id=${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            console.error('[Order Details] Failed to load orders:', response.status);
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
            // Find order by orderReference
            const fullOrderRef = orderRef.startsWith('#') ? orderRef.substring(1) : orderRef;
            const foundOrder = result.data.find(o => 
                o.orderReference === fullOrderRef || 
                o.orderReference === orderRef ||
                o.orderReference?.endsWith(fullOrderRef) ||
                o.orderReference?.endsWith(orderRef)
            );
            
            if (foundOrder) {
                console.log('[Order Details] Order found:', foundOrder.orderReference);
                
                // Update orderData with real data
                orderData = {
                    id: `#${foundOrder.orderReference?.substring(0, 8) || 'N/A'}`,
                    date: foundOrder.createdAt ? new Date(foundOrder.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                    }) : '',
                    country: foundOrder.country_name || '',
                    code: foundOrder.country_code || '',
                    plan: foundOrder.bundle_name || foundOrder.plan_id || '',
                    duration: '', // Can be extracted from bundle_name if needed
                    price: foundOrder.price ? `${foundOrder.currency || '$'} ${foundOrder.price}` : '',
                    activationDate: foundOrder.createdAt ? new Date(foundOrder.createdAt).toLocaleDateString() : '',
                    expiryDate: '', // Can be calculated from bundle duration
                    iccid: foundOrder.iccid || '',
                    matchingId: foundOrder.matchingId || '',
                    rspUrl: foundOrder.smdpAddress || foundOrder.rspUrl || '',
                    qrCode: foundOrder.qrCode || foundOrder.qr_code || ''
                };
                
                console.log('[Order Details] Order data updated:', {
                    hasIccid: !!orderData.iccid,
                    hasMatchingId: !!orderData.matchingId,
                    hasQrCode: !!orderData.qrCode
                });
            } else {
                console.warn('[Order Details] Order not found in server response');
            }
        }
    } catch (error) {
        console.error('[Order Details] Error loading order from server:', error);
    }
}

// Setup order details
function setupOrderDetails() {
    const orderNumberElement = document.getElementById('orderNumber');
    const orderPlanInfoElement = document.getElementById('orderPlanInfo');
    const iccidElement = document.getElementById('iccid');
    const matchingIdElement = document.getElementById('matchingId');
    const rspUrlElement = document.getElementById('rspUrl');
    const orderPriceElement = document.getElementById('orderPrice');
    const qrCodeElement = document.getElementById('qrCode');
    
    // Update order number
    if (orderNumberElement) {
        orderNumberElement.textContent = orderData.id ? `Order ${orderData.id}` : 'Order #N/A';
    }
    
    // Update plan info
    if (orderPlanInfoElement) {
        const planText = orderData.plan 
            ? `${orderData.plan} ${orderData.duration || ''} ${orderData.country || ''} x1`.trim()
            : 'eSIM Plan';
        orderPlanInfoElement.textContent = planText;
    }
    
    // Update details
    if (iccidElement) iccidElement.textContent = orderData.iccid || 'N/A';
    if (matchingIdElement) matchingIdElement.textContent = orderData.matchingId || 'N/A';
    if (rspUrlElement) rspUrlElement.textContent = orderData.rspUrl || 'N/A';
    if (orderPriceElement) orderPriceElement.textContent = orderData.price || 'N/A';
    
    // Update QR code
    if (qrCodeElement && orderData.qrCode) {
        qrCodeElement.src = orderData.qrCode;
        qrCodeElement.alt = 'eSIM QR Code';
        qrCodeElement.style.display = 'block';
    } else if (qrCodeElement) {
        // If no QR code URL, generate from matchingId and rspUrl
        if (orderData.matchingId && orderData.rspUrl) {
            const qrData = `LPA:1$${orderData.rspUrl}$${orderData.matchingId}`;
            qrCodeElement.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
            qrCodeElement.alt = 'eSIM QR Code';
            qrCodeElement.style.display = 'block';
        } else {
            qrCodeElement.style.display = 'none';
        }
    }
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
    
    // Help button (in bottom nav)
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
    
    // Help button (in content)
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'help.html';
        });
    }
}

