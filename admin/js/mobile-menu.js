/**
 * Mobile Menu Handler
 * Manages mobile sidebar menu toggle functionality
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
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                // Only close if we're in mobile view
                if (window.innerWidth <= 1024) {
                    setTimeout(closeMenu, 100);
                }
            });
        });

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

