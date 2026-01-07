// Shared sidebar component
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const t = (key) => window.i18n ? window.i18n.t(key) : key;
    
    // Create sidebar HTML with language selector
    const sidebarHTML = `
        <div class="p-6">
            <h1 class="text-2xl font-bold">eSIMsData</h1>
            <p class="text-gray-400 text-sm mt-1">Admin Dashboard</p>
        </div>
        
        <nav class="mt-8">
            <a href="index.html" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/admin/' ? 'active-nav' : ''}">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                <span style="text-transform: capitalize;">${t('dashboard')}</span>
            </a>
            <a href="orders.html" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${window.location.pathname.includes('orders.html') ? 'active-nav' : ''}">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <span style="text-transform: capitalize;">${t('orders')}</span>
            </a>
            <a href="users.html" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${window.location.pathname.includes('users.html') ? 'active-nav' : ''}">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <span style="text-transform: capitalize;">${t('users')}</span>
            </a>
            <a href="payments.html" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${window.location.pathname.includes('payments.html') ? 'active-nav' : ''}">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <span style="text-transform: capitalize;">${t('payments')}</span>
            </a>
            <a href="settings.html" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white ${window.location.pathname.includes('settings.html') ? 'active-nav' : ''}">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span style="text-transform: capitalize;">${t('settings')}</span>
            </a>
        </nav>
        
        <div class="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
            <button id="logoutBtn" class="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>${t('logout')}</span>
            </button>
        </div>
    `;
    
    sidebar.innerHTML = sidebarHTML;
    
    // Initialize logout button - используем Auth.logout() если доступен
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Удаляем старые обработчики, если они есть
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.Auth && typeof window.Auth.logout === 'function') {
                window.Auth.logout();
            } else {
                // Fallback если Auth еще не загружен
                localStorage.removeItem('admin_token');
                window.location.href = 'login.html';
            }
        });
    }
}

// Listen for language changes and update sidebar
window.addEventListener('languageChanged', () => {
    initializeSidebar();
});

// Initialize sidebar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
    initializeSidebar();
}

