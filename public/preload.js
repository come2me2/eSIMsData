// Preload optimization for faster screen transitions
(function() {
    'use strict';
    
    // Cache for frequently accessed data
    const cache = {
        data: new Map(),
        get: function(key) {
            return this.data.get(key);
        },
        set: function(key, value) {
            this.data.set(key, value);
        },
        clear: function() {
            this.data.clear();
        }
    };
    
    // Preload critical pages
    const criticalPages = [
        'account.html',
        'my-esims.html',
        'current-esim.html',
        'checkout.html',
        'help.html'
    ];
    
    // Prefetch pages when idle
    function prefetchPages() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                criticalPages.forEach(page => {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = page;
                    document.head.appendChild(link);
                });
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                criticalPages.forEach(page => {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = page;
                    document.head.appendChild(link);
                });
            }, 1000);
        }
    }
    
    // Optimized navigation with prefetch
    function optimizedNavigate(url) {
        // Prefetch the target page
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
        
        // Navigate
        window.location.href = url;
    }
    
    // Debounce function for search
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Expose to global scope
    window.appCache = cache;
    window.optimizedNavigate = optimizedNavigate;
    window.debounce = debounce;
    
    // Start prefetching when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', prefetchPages);
    } else {
        prefetchPages();
    }
})();

