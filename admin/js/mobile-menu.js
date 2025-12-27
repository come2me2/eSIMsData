/**
 * Mobile Menu Handler
 * Manages mobile sidebar menu toggle functionality
 * 
 * Features:
 * - Auto-hide menu when navigation link is clicked on mobile
 * - Auto-hide on logout button click
 * - Smooth animations with cubic-bezier easing
 * - Responsive behavior based on screen size
 * - Keyboard support (ESC to close)
 * - Touch-friendly with visual feedback
 */

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (!mobileMenuBtn || !sidebar || !sidebarOverlay) {
            console.warn('Mobile menu elements not found');
            return;
        }

        // Ensure correct initial state based on screen size
        checkScreenSize();

        // Toggle menu on button click
        mobileMenuBtn.addEventListener('click', function() {
            toggleMenu();
        });

        // Close menu on overlay click
        sidebarOverlay.addEventListener('click', function() {
            closeMenu();
        });

        // Close menu when clicking on a navigation link (only on mobile)
        const navLinks = sidebar.querySelectorAll('nav a');
        console.log('[MobileMenu] Found', navLinks.length, 'navigation links');
        
        navLinks.forEach(function(link, index) {
            link.addEventListener('click', function(e) {
                // Only close if we're in mobile view
                if (window.innerWidth <= 1024) {
                    console.log('[MobileMenu] Nav link clicked (index:', index, '), closing menu');
                    // Close immediately for better UX
                    closeMenu();
                }
            }, true); // Use capture phase to ensure it fires first
        });

        // Close menu when clicking on logout button (only on mobile)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                if (window.innerWidth <= 1024) {
                    console.log('[MobileMenu] Logout button clicked, closing menu');
                    closeMenu();
                }
            }, true); // Use capture phase
        }

        // Close menu on escape key (only on mobile)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('open') && window.innerWidth <= 1024) {
                closeMenu();
            }
        });

        // Handle window resize - ensure proper state
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(checkScreenSize, 250);
        });

        console.log('[MobileMenu] Initialization complete. Screen width:', window.innerWidth);
    }

    function checkScreenSize() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (window.innerWidth > 1024) {
            // Desktop: ensure menu is visible and overlay is hidden
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('show');
            document.body.style.overflow = '';
        } else {
            // Mobile: ensure menu is closed by default
            closeMenu();
        }
    }

    function toggleMenu() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (sidebar.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    }

    function closeMenu() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        console.log('[MobileMenu] Closing menu');
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }

    // Expose functions globally if needed
    window.MobileMenu = {
        toggle: toggleMenu,
        open: openMenu,
        close: closeMenu,
        checkScreenSize: checkScreenSize
    };
})();

