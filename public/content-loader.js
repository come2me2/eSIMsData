/**
 * Content Loader
 * Dynamically loads content for FAQ, Privacy, Refund, Terms pages
 */

// Map page filenames to API section names
const PAGE_SECTION_MAP = {
    'faq.html': 'faq',
    'privacy-policy.html': 'privacy',
    'refund-policy.html': 'refund',
    'terms-of-use.html': 'terms'
};

/**
 * Load content from API for current page
 */
async function loadPageContent() {
    // Determine current page
    const currentPage = window.location.pathname.split('/').pop();
    const section = PAGE_SECTION_MAP[currentPage];
    
    if (!section) {
        console.error('Unknown page:', currentPage);
        return;
    }
    
    // Show loading state
    const contentContainer = document.querySelector('.faq-content, .policy-content');
    if (!contentContainer) {
        console.error('Content container not found');
        return;
    }
    
    contentContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch(`/api/content/${section}`);
        const data = await response.json();
        
        if (data.success && data.content) {
            contentContainer.innerHTML = data.content;
            console.log(`✅ Content loaded for ${section}`);
        } else {
            throw new Error(data.error || 'Failed to load content');
        }
    } catch (error) {
        console.error('Error loading content:', error);
        contentContainer.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Content</h3>
                <p>Unable to load content. Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Auto-load content on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPageContent);
} else {
    loadPageContent();
}

