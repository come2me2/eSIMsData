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
            window.history.back();
        });
    }
}

// Sample eSIM data
// Set to empty array [] to show "No Orders" state
const esimsData = [
    {
        id: '#99999',
        date: '2023-10-01',
        status: 'completed',
        hasDetails: true,
        country: 'Germany',
        code: 'DE',
        plan: '1GB',
        duration: '7 Days',
        price: '$ 9.99',
        activationDate: '2023-10-01',
        expiryDate: '2023-10-08',
        iccid: '8943108161005541531',
        matchingId: 'JQ-1UAFOB-1B3U4SN',
        rspUrl: 'rsp.truphone.com'
    },
    {
        id: '#99999',
        date: '2023-10-01',
        status: 'canceled',
        hasDetails: false
    },
    {
        id: '#99999',
        date: '2023-10-01',
        status: 'onhold',
        hasDetails: false
    },
    {
        id: '#99999',
        date: '2023-10-01',
        status: 'onhold',
        hasDetails: false
    },
    {
        id: '#99999',
        date: '2023-10-01',
        status: 'onhold',
        hasDetails: false
    }
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Telegram Auth - получение Telegram ID пользователя
    const auth = window.telegramAuth;
    if (auth && auth.isAuthenticated()) {
        const userId = auth.getUserId();
        console.log('My eSIMs - Loading for user:', userId);
        
        // Сохранить userId для использования при загрузке заказов
        window.currentUserId = userId;
        
        // Когда будет сервер, можно загрузить заказы пользователя:
        // loadUserESims(userId);
    }
    
    renderESimsList();
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
    const esimsList = document.getElementById('esimsList');
    const emptyState = document.getElementById('emptyState');
    if (!esimsList || !emptyState) return;
    
    // Check if there are no orders
    if (esimsData.length === 0) {
        esimsList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    // Show list and hide empty state
    esimsList.style.display = 'flex';
    emptyState.style.display = 'none';
    esimsList.innerHTML = '';
    
    esimsData.forEach(esim => {
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
        'onhold': {
            label: 'On hold',
            class: 'status-onhold'
        }
    };
    
    return configs[status] || configs.onhold;
}

// Navigate to order details
function navigateToOrderDetails(esim) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    const params = new URLSearchParams({
        id: esim.id,
        date: esim.date,
        country: esim.country || '',
        code: esim.code || '',
        plan: esim.plan || '',
        duration: esim.duration || '',
        price: esim.price || '',
        activationDate: esim.activationDate || '',
        expiryDate: esim.expiryDate || '',
        iccid: esim.iccid || '',
        matchingId: esim.matchingId || '',
        rspUrl: esim.rspUrl || ''
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


