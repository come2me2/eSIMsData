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
    
    // Сначала скрываем данные о трафике, чтобы не показывать мокап
    hideESimData();
    
    // Всегда настраиваем базовые данные (план, заказ, дата начала)
    setupESimDetails();
    
    setupExtendButton();
    setupNavigation();
    
    // Загружаем реальные данные о расходе трафика из API
    if (esimData && esimData.iccid) {
        await loadBundleUsageData(esimData.iccid);
        
        // Автоматическое обновление данных о трафике каждые 30 секунд
        const autoRefreshInterval = setInterval(async () => {
            if (esimData && esimData.iccid) {
                console.log('🔄 Auto-refreshing bundle usage data...');
                await loadBundleUsageData(esimData.iccid);
            } else {
                clearInterval(autoRefreshInterval);
            }
        }, 30000); // 30 секунд
        
        // Очищаем интервал при уходе со страницы
        window.addEventListener('beforeunload', () => {
            clearInterval(autoRefreshInterval);
        });
    } else {
        // Если нет ICCID, показываем базовые данные (без данных о трафике)
        showESimData();
    }
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

// Hide eSIM data until real data is loaded
function hideESimData() {
    const usageTextElement = document.getElementById('usageText');
    const usageProgressElement = document.getElementById('usageProgress');
    const expirationTextElement = document.getElementById('expirationText');
    const expirationProgressElement = document.getElementById('expirationProgress');
    const expiresDateElement = document.getElementById('expiresDate');
    
    // Скрываем элементы с данными о трафике
    if (usageTextElement) usageTextElement.style.opacity = '0';
    if (usageProgressElement) usageProgressElement.style.opacity = '0';
    if (expirationTextElement) expirationTextElement.style.opacity = '0';
    if (expirationProgressElement) expirationProgressElement.style.opacity = '0';
    if (expiresDateElement) expiresDateElement.style.opacity = '0';
}

// Show eSIM data after loading
function showESimData() {
    const usageTextElement = document.getElementById('usageText');
    const usageProgressElement = document.getElementById('usageProgress');
    const expirationTextElement = document.getElementById('expirationText');
    const expirationProgressElement = document.getElementById('expirationProgress');
    const expiresDateElement = document.getElementById('expiresDate');
    
    // Показываем элементы с данными о трафике
    if (usageTextElement) {
        usageTextElement.style.opacity = '1';
        usageTextElement.style.transition = 'opacity 0.3s ease-in';
    }
    if (usageProgressElement) {
        usageProgressElement.style.opacity = '1';
        usageProgressElement.style.transition = 'opacity 0.3s ease-in';
    }
    if (expirationTextElement) {
        expirationTextElement.style.opacity = '1';
        expirationTextElement.style.transition = 'opacity 0.3s ease-in';
    }
    if (expirationProgressElement) {
        expirationProgressElement.style.opacity = '1';
        expirationProgressElement.style.transition = 'opacity 0.3s ease-in';
    }
    if (expiresDateElement) {
        expiresDateElement.style.opacity = '1';
        expiresDateElement.style.transition = 'opacity 0.3s ease-in';
    }
    
    console.log('✅ showESimData() called - elements should be visible now');
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
    
    // Order
    const orderInfoElement = document.getElementById('orderInfo');
    if (orderInfoElement) {
        orderInfoElement.textContent = `Order: ${esimData.orderId}`;
    }
    
    // ICCID
    const iccidInfoElement = document.getElementById('iccidInfo');
    if (iccidInfoElement) {
        iccidInfoElement.textContent = `ICCID: ${esimData.iccid}`;
    }
    
    // Start date
    const startDateElement = document.getElementById('startDate');
    if (startDateElement) {
        startDateElement.textContent = `Started: ${esimData.startDate}`;
    }
    
    // Usage text (компактный формат в одну строку)
    const usageTextElement = document.getElementById('usageText');
    if (usageTextElement) {
        const usedData = esimData.usedData || 0;
        const totalData = esimData.totalData || 1024;
        const remainingData = esimData.remainingData || (totalData - usedData);
        const usagePercent = totalData > 0 ? ((usedData / totalData) * 100).toFixed(1) : 0;
        
        // Красивый формат: "0.00MB / 1024.00MB (0.0%) • 1024.00MB remaining"
        usageTextElement.textContent = `${usedData.toFixed(2)}MB / ${totalData.toFixed(2)}MB (${usagePercent}%) • ${remainingData.toFixed(2)}MB remaining`;
    }
    
    // Usage progress bar (устанавливаем ширину, даже если элемент скрыт)
    const usageProgressElement = document.getElementById('usageProgress');
    if (usageProgressElement && esimData.totalData > 0) {
        const usagePercent = Math.min(100, Math.max(0, (esimData.usedData / esimData.totalData) * 100));
        usageProgressElement.style.width = `${usagePercent}%`;
    }
    
    // Expiration text (устанавливаем текст, даже если элемент скрыт)
    const expirationTextElement = document.getElementById('expirationText');
    if (expirationTextElement) {
        const bundleDuration = esimData.bundleDuration || 7;
        const daysRemaining = esimData.daysRemaining !== undefined ? esimData.daysRemaining : bundleDuration;
        expirationTextElement.textContent = `${bundleDuration} day bundle expires in ${daysRemaining} days`;
    }
    
    // Expiration progress bar (устанавливаем ширину, даже если элемент скрыт)
    const expirationProgressElement = document.getElementById('expirationProgress');
    if (expirationProgressElement && esimData.bundleDuration > 0) {
        const daysRemaining = esimData.daysRemaining !== undefined ? esimData.daysRemaining : esimData.bundleDuration;
        const expirationPercent = Math.min(100, Math.max(0, ((esimData.bundleDuration - daysRemaining) / esimData.bundleDuration) * 100));
        expirationProgressElement.style.width = `${expirationPercent}%`;
    }
    
    // Expires date (устанавливаем текст, даже если элемент скрыт)
    const expiresDateElement = document.getElementById('expiresDate');
    if (expiresDateElement) {
        if (esimData.expiresDate && esimData.expiresDate !== 'N/A') {
            expiresDateElement.textContent = `Expires on ${esimData.expiresDate}`;
        } else {
            expiresDateElement.textContent = 'Expires date not available';
        }
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
            let esimType = esimData.type || currentESimOrder.type || null;
            const iccid = esimData.iccid || currentESimOrder.iccid || '';
            
            // Если тип не определен, пытаемся определить по country_code или country_name
            if (!esimType) {
                if (countryCode === 'GLOBAL' || countryName?.toLowerCase() === 'global') {
                    esimType = 'global';
                } else if (countryCode && ['AFRICA', 'ASIA', 'EUROPE', 'LATAM', 'NA', 'BALKANAS', 'CIS', 'OCEANIA', 'REGION'].includes(countryCode.toUpperCase())) {
                    esimType = 'region';
                } else if (countryName && ['Africa', 'Asia', 'Europe', 'Latin America', 'North America', 'Balkanas', 'Central Eurasia', 'Oceania'].includes(countryName)) {
                    esimType = 'region';
                } else if (countryCode && countryCode.length === 2) {
                    // Двухбуквенный код страны (ISO 3166-1 alpha-2) - это local/country
                    esimType = 'country';
                } else if (countryCode || countryName) {
                    // Если есть хотя бы country_code или country_name, считаем это country
                    esimType = 'country';
                }
            }
            
            console.log('Extending eSIM:', { countryCode, countryName, esimType, iccid, orderType: currentESimOrder?.type });
            
            if (!iccid) {
                console.error('No ICCID available for extend');
                if (tg && tg.showAlert) {
                    tg.showAlert('No active eSIM found. Please purchase an eSIM first.');
                }
                return;
            }
            
            // Navigate based on eSIM type with extend parameters
            if (esimType === 'global' || countryCode === 'GLOBAL' || countryCode === 'GLOBAL' || countryName?.toLowerCase() === 'global') {
                // Navigate to global plans with extend parameters
                const params = new URLSearchParams({
                    extend: 'true',
                    iccid: iccid
                });
                window.location.href = `global-plans.html?${params.toString()}`;
            } else if (esimType === 'region' || countryCode === 'REGION' || 
                       (countryCode && ['AFRICA', 'ASIA', 'EUROPE', 'LATAM', 'NA', 'BALKANAS', 'CIS', 'OCEANIA'].includes(countryCode.toUpperCase())) ||
                       (countryName && ['Africa', 'Asia', 'Europe', 'Latin America', 'North America', 'Balkanas', 'Central Eurasia', 'Oceania'].includes(countryName))) {
                // Navigate to region plans with extend parameters
                const regionName = countryName || 'Unknown Region';
                const params = new URLSearchParams({
                    region: regionName,
                    extend: 'true',
                    iccid: iccid
                });
                window.location.href = `region-plans.html?${params.toString()}`;
            } else if (countryCode || countryName) {
                // Navigate to country plans with extend parameters
                // Если countryName отсутствует, используем countryCode как fallback
                const params = new URLSearchParams({
                    country: countryName || countryCode,
                    code: countryCode || countryName,
                    extend: 'true',
                    iccid: iccid
                });
                window.location.href = `plans.html?${params.toString()}`;
            } else {
                // Fallback: navigate to main page
                console.warn('Could not determine eSIM type, redirecting to main page', {
                    countryCode,
                    countryName,
                    esimType,
                    order: currentESimOrder
                });
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

// Load bundle usage data from API
async function loadBundleUsageData(iccid) {
    if (!iccid) {
        console.warn('⚠️ No ICCID provided for bundle usage data');
        return;
    }
    
    try {
        console.log('📦 Loading bundle usage data for ICCID:', iccid);
        
        const response = await fetch(`/api/esimgo/bundles?iccid=${encodeURIComponent(iccid)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('⚠️ Failed to load bundle usage data:', response.status, errorData.error || 'Unknown error');
            // При ошибке показываем базовые данные
            showESimData();
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const bundleData = result.data;
            
            console.log('✅ Bundle usage data loaded:', bundleData);
            
            // Update esimData with real data
            esimData.totalData = bundleData.totalData || esimData.totalData;
            esimData.usedData = bundleData.usedData || 0;
            esimData.remainingData = bundleData.remainingData || esimData.totalData;
            esimData.bundleDuration = bundleData.bundleDuration || esimData.bundleDuration;
            esimData.daysRemaining = bundleData.daysRemaining || esimData.daysRemaining;
            esimData.expiresDate = bundleData.expiresDate 
                ? new Date(bundleData.expiresDate).toLocaleString() 
                : esimData.expiresDate;
            
            // Update UI with real data
            updateESimDataFromAPI({
                usedData: esimData.usedData,
                totalData: esimData.totalData,
                remainingData: esimData.remainingData,
                daysRemaining: esimData.daysRemaining,
                bundleDuration: esimData.bundleDuration,
                expiresDate: esimData.expiresDate
            });
            
            // Показываем данные после обновления
            showESimData();
        } else {
            console.warn('⚠️ No bundle data in response:', result);
            // Если нет данных из API, показываем базовые данные (с дефолтными значениями)
            showESimData();
        }
    } catch (error) {
        console.error('❌ Error loading bundle usage data:', error);
        // При ошибке показываем базовые данные (с дефолтными значениями)
        showESimData();
    }
}

// Function to update data from API (will be called when API is ready)
function updateESimDataFromAPI(data) {
    if (!esimData) return;
    
    // Update esimData with API response
    if (data.usedData !== undefined) {
        esimData.usedData = data.usedData;
    }
    if (data.totalData !== undefined) {
        esimData.totalData = data.totalData;
    }
    if (data.remainingData !== undefined) {
        esimData.remainingData = data.remainingData;
    } else if (data.usedData !== undefined && data.totalData !== undefined) {
        esimData.remainingData = data.totalData - data.usedData;
    }
    
    // Update UI (компактный формат в одну строку)
    const usageTextElement = document.getElementById('usageText');
    if (usageTextElement) {
        const usedData = esimData.usedData || 0;
        const totalData = esimData.totalData || 1024;
        const remainingData = esimData.remainingData || (totalData - usedData);
        const usagePercent = totalData > 0 ? ((usedData / totalData) * 100).toFixed(1) : 0;
        
        // Красивый формат: "0.00MB / 1024.00MB (0.0%) • 1024.00MB remaining"
        usageTextElement.textContent = `${usedData.toFixed(2)}MB / ${totalData.toFixed(2)}MB (${usagePercent}%) • ${remainingData.toFixed(2)}MB remaining`;
    }
    
    const usageProgressElement = document.getElementById('usageProgress');
    if (usageProgressElement && esimData.totalData > 0) {
        const usagePercent = Math.min(100, Math.max(0, (esimData.usedData / esimData.totalData) * 100));
        usageProgressElement.style.width = `${usagePercent}%`;
    }
    
    if (data.daysRemaining !== undefined) {
        esimData.daysRemaining = data.daysRemaining;
        
        const expirationTextElement = document.getElementById('expirationText');
        if (expirationTextElement) {
            expirationTextElement.textContent = `${esimData.bundleDuration} day bundle expires in ${esimData.daysRemaining} days`;
        }
        
        const expirationProgressElement = document.getElementById('expirationProgress');
        if (expirationProgressElement && esimData.bundleDuration > 0) {
            const expirationPercent = Math.min(100, Math.max(0, ((esimData.bundleDuration - esimData.daysRemaining) / esimData.bundleDuration) * 100));
            expirationProgressElement.style.width = `${expirationPercent}%`;
        }
    }
    
    if (data.expiresDate !== undefined) {
        const expiresDateElement = document.getElementById('expiresDate');
        if (expiresDateElement) {
            expiresDateElement.textContent = `Expires on ${data.expiresDate}`;
        }
    }
}

