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

// Current eSIM data
let esimData = null;
let currentESimOrder = null; // Store the order data for extend functionality

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentESim();
    setupESimDetails();
    setupExtendButton();
    setupNavigation();
});

// Load current active eSIM from orders
async function loadCurrentESim() {
    try {
        // Try to get user ID from Telegram auth
        const auth = window.telegramAuth;
        let userId = null;
        if (auth && auth.isAuthenticated()) {
            userId = auth.getUserId();
        }
        
        // Try to load from server first
        if (userId) {
            try {
                const response = await fetch(`/api/orders?telegram_user_id=${userId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.orders && data.orders.length > 0) {
                        // Find active eSIM (has iccid and status is completed)
                        const activeOrder = data.orders.find(order => 
                            order.iccid && 
                            (order.status === 'completed' || order.status === 'on_hold')
                        );
                        
                        if (activeOrder) {
                            currentESimOrder = activeOrder;
                            esimData = convertOrderToESimData(activeOrder);
                            return;
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to load orders from server:', error);
            }
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('esim_orders');
            if (stored) {
                const orders = JSON.parse(stored);
                // Find active eSIM (has iccid)
                const activeOrder = orders.find(order => order.iccid);
                
                if (activeOrder) {
                    currentESimOrder = activeOrder;
                    esimData = convertOrderToESimData(activeOrder);
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to load orders from localStorage:', error);
        }
        
        // If no active eSIM found, esimData remains null
        console.log('No active eSIM found');
    } catch (error) {
        console.error('Error loading current eSIM:', error);
    }
}

// Convert order data to eSIM display data
function convertOrderToESimData(order) {
    // Extract plan info from bundle_name or plan_id
    const bundleName = order.bundle_name || order.plan_id || 'eSIM Plan';
    
    // Try to extract data amount and duration from bundle_name
    // Format examples: "1GB_7Days", "2GB_30Days", etc.
    let dataAmount = '';
    let duration = '';
    if (bundleName) {
        const match = bundleName.match(/(\d+(?:\.\d+)?)\s*(GB|MB|gb|mb).*?(\d+)\s*(Days|days|Day|day)/i);
        if (match) {
            dataAmount = `${match[1]}${match[2].toUpperCase()}`;
            duration = `${match[3]} Days`;
        }
    }
    
    const planName = dataAmount && duration 
        ? `eSIM ${dataAmount} ${duration} ${order.country_name || ''}`.trim()
        : bundleName;
    
    return {
        plan: planName,
        orderId: order.orderReference || order.id || 'N/A',
        iccid: order.iccid || '',
        startDate: order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A',
        totalData: 1024, // Will be updated from API if available
        usedData: 0, // Will be updated from API if available
        remainingData: 1024, // Will be updated from API if available
        bundleDuration: 7, // Will be updated from API if available
        daysRemaining: 7, // Will be updated from API if available
        expiresDate: 'N/A', // Will be updated from API if available
        country_code: order.country_code || '',
        country_name: order.country_name || '',
        type: order.type || 'country' // country, region, or global
    };
}

// Setup eSIM details
function setupESimDetails() {
    const esimCard = document.getElementById('esimCard');
    const extendBtn = document.getElementById('extendBtn');
    const emptyState = document.getElementById('emptyState');
    
    // Check if there's active eSIM data
    if (!esimData) {
        // Show empty state
        if (esimCard) esimCard.style.display = 'none';
        if (extendBtn) extendBtn.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    // Show eSIM card and hide empty state
    if (esimCard) esimCard.style.display = 'flex';
    if (extendBtn) extendBtn.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Plan
    const planElement = document.getElementById('esimPlan');
    if (planElement) {
        planElement.textContent = esimData.plan;
    }
    
    // Order and ICCID
    const orderInfoElement = document.getElementById('orderInfo');
    if (orderInfoElement) {
        orderInfoElement.textContent = `Order: ${esimData.orderId}. iccid: ${esimData.iccid}`;
    }
    
    // Start date
    const startDateElement = document.getElementById('startDate');
    if (startDateElement) {
        startDateElement.textContent = `Started: ${esimData.startDate}`;
    }
    
    // Usage text
    const usageTextElement = document.getElementById('usageText');
    if (usageTextElement) {
        usageTextElement.textContent = `${esimData.usedData}MB of ${esimData.totalData}MB used`;
    }
    
    // Remaining text
    const remainingTextElement = document.getElementById('remainingText');
    if (remainingTextElement) {
        remainingTextElement.textContent = `${esimData.remainingData}MB remaining`;
    }
    
    // Usage progress bar
    const usageProgressElement = document.getElementById('usageProgress');
    if (usageProgressElement) {
        const usagePercent = (esimData.usedData / esimData.totalData) * 100;
        usageProgressElement.style.width = `${usagePercent}%`;
    }
    
    // Expiration text
    const expirationTextElement = document.getElementById('expirationText');
    if (expirationTextElement) {
        expirationTextElement.textContent = `${esimData.bundleDuration} day bundle expires in ${esimData.daysRemaining} days`;
    }
    
    // Expiration progress bar
    const expirationProgressElement = document.getElementById('expirationProgress');
    if (expirationProgressElement) {
        const expirationPercent = ((esimData.bundleDuration - esimData.daysRemaining) / esimData.bundleDuration) * 100;
        expirationProgressElement.style.width = `${expirationPercent}%`;
    }
    
    // Expires date
    const expiresDateElement = document.getElementById('expiresDate');
    if (expiresDateElement) {
        expiresDateElement.textContent = `Expires on ${esimData.expiresDate}`;
    }
}

// Setup extend button
function setupExtendButton() {
    const extendBtn = document.getElementById('extendBtn');
    if (extendBtn) {
        extendBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('medium');
            }
            
            // Navigate to plans page for current eSIM
            if (!esimData || !currentESimOrder) {
                console.error('No eSIM data available for extend');
                if (tg && tg.showAlert) {
                    tg.showAlert('No active eSIM found. Please purchase an eSIM first.');
                }
                return;
            }
            
            const countryCode = esimData.country_code || currentESimOrder.country_code || '';
            const countryName = esimData.country_name || currentESimOrder.country_name || '';
            const esimType = esimData.type || currentESimOrder.type || 'country';
            
            console.log('Extending eSIM:', { countryCode, countryName, esimType });
            
            // Navigate based on eSIM type
            if (esimType === 'global' || countryCode === 'GLOBAL') {
                // Navigate to global plans
                window.location.href = 'global-plans.html';
            } else if (esimType === 'region' || countryCode === 'REGION') {
                // Navigate to region plans
                const regionName = countryName || 'Unknown Region';
                const params = new URLSearchParams({ region: regionName });
                window.location.href = `region-plans.html?${params.toString()}`;
            } else if (countryCode && countryName) {
                // Navigate to country plans
                const params = new URLSearchParams({
                    country: countryName,
                    code: countryCode
                });
                window.location.href = `plans.html?${params.toString()}`;
            } else {
                // Fallback: navigate to main page
                console.warn('Could not determine eSIM type, redirecting to main page');
                if (tg && tg.showAlert) {
                    tg.showAlert('Unable to determine eSIM location. Redirecting to main page.');
                }
                window.location.href = 'index.html';
            }
        });
    }
}

// Setup bottom navigation
function setupNavigation() {
    // Account button
    const accountNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(item => 
        item.querySelector('.nav-label')?.textContent === 'Account'
    );
    if (accountNavBtn) {
        accountNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'account.html';
        });
    }
    
    // Buy eSIM button
    const buyESimNavBtn = document.getElementById('buyESimNavBtn');
    if (buyESimNavBtn) {
        buyESimNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'index.html';
        });
    }
    
    // Help button
    const helpNavBtn = document.getElementById('helpNavBtn');
    if (helpNavBtn) {
        helpNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'help.html';
        });
    }
}

// Function to update data from API (will be called when API is ready)
function updateESimDataFromAPI(data) {
    // Update esimData with API response
    if (data.usedData !== undefined) {
        esimData.usedData = data.usedData;
        esimData.remainingData = esimData.totalData - esimData.usedData;
        
        // Update UI
        const usageTextElement = document.getElementById('usageText');
        if (usageTextElement) {
            usageTextElement.textContent = `${esimData.usedData}MB of ${esimData.totalData}MB used`;
        }
        
        const remainingTextElement = document.getElementById('remainingText');
        if (remainingTextElement) {
            remainingTextElement.textContent = `${esimData.remainingData}MB remaining`;
        }
        
        const usageProgressElement = document.getElementById('usageProgress');
        if (usageProgressElement) {
            const usagePercent = (esimData.usedData / esimData.totalData) * 100;
            usageProgressElement.style.width = `${usagePercent}%`;
        }
    }
    
    if (data.daysRemaining !== undefined) {
        esimData.daysRemaining = data.daysRemaining;
        
        const expirationTextElement = document.getElementById('expirationText');
        if (expirationTextElement) {
            expirationTextElement.textContent = `${esimData.bundleDuration} day bundle expires in ${esimData.daysRemaining} days`;
        }
        
        const expirationProgressElement = document.getElementById('expirationProgress');
        if (expirationProgressElement) {
            const expirationPercent = ((esimData.bundleDuration - esimData.daysRemaining) / esimData.bundleDuration) * 100;
            expirationProgressElement.style.width = `${expirationPercent}%`;
        }
    }
}

