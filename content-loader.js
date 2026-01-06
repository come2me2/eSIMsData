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
 * Format text content with simple markdown-like syntax
 * Supports: **bold text** for bold
 */
function formatTextContent(text) {
    // Escape HTML to prevent XSS
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // Escape the text first
    let formatted = escapeHtml(text);
    
    // Convert **text** to <strong>text</strong>
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert __text__ to <strong>text</strong>
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    return formatted;
}

/**
 * Format FAQ content as question-answer pairs
 */
function formatFAQContent(text) {
    // Remove the "FAQ" title if it's at the beginning
    let content = text.trim();
    if (content.startsWith('FAQ\n') || content.startsWith('FAQ\r\n')) {
        content = content.substring(content.indexOf('\n') + 1).trim();
    }
    
    // Split by double newlines to get question-answer pairs
    const sections = content.split(/\n\s*\n/);
    const faqItems = [];
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        const lines = section.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) continue;
        
        const firstLine = lines[0];
        const restLines = lines.slice(1);
        
        // Check if this section has both question and answer
        if (restLines.length > 0) {
            // This section has both question and answer
            const question = formatTextContent(firstLine);
            const answer = restLines.join('\n').trim();
            faqItems.push({
                question: question,
                answer: formatTextContent(answer)
            });
        } else {
            // This might be just a question, check next section for answer
            if (i + 1 < sections.length) {
                const nextSection = sections[i + 1].trim();
                const nextLines = nextSection.split('\n').map(l => l.trim()).filter(l => l);
                
                // If next section doesn't start with a question-like line, it's probably the answer
                if (nextLines.length > 0 && !nextLines[0].endsWith('?')) {
                    faqItems.push({
                        question: formatTextContent(firstLine),
                        answer: formatTextContent(nextSection)
                    });
                    i++; // Skip next section as we've used it
                } else {
                    // Treat as standalone question (might be incomplete data)
                    faqItems.push({
                        question: formatTextContent(firstLine),
                        answer: ''
                    });
                }
            } else {
                // Last section, treat as question
                faqItems.push({
                    question: formatTextContent(firstLine),
                    answer: ''
                });
            }
        }
    }
    
    // If we couldn't parse as Q&A, format as plain text with line breaks
    if (faqItems.length === 0) {
        return formatTextContent(text).replace(/\n/g, '<br>');
    }
    
    // Build HTML structure
    let html = '<div class="faq-list">';
    faqItems.forEach(item => {
        if (item.answer) {
            html += `
                <div class="faq-item">
                    <h3 class="faq-question">${item.question}</h3>
                    <p class="faq-answer">${item.answer}</p>
                </div>
            `;
        } else {
            // Question without answer - still show it
            html += `
                <div class="faq-item">
                    <h3 class="faq-question">${item.question}</h3>
                </div>
            `;
        }
    });
    html += '</div>';
    
    return html;
}

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
    
    // Save existing title if it exists (for FAQ)
    const existingTitle = contentContainer.querySelector('.faq-title');
    const titleHTML = existingTitle ? existingTitle.outerHTML : '';
    
    contentContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch(`/api/content/${section}`);
        const data = await response.json();
        
        if (data.success && data.content) {
            let formattedContent;
            
            if (section === 'faq') {
                // Format FAQ with title and structured Q&A
                formattedContent = titleHTML + formatFAQContent(data.content);
            } else {
                // Format other content as plain text
                formattedContent = formatTextContent(data.content).replace(/\n/g, '<br>');
            }
            
            // Wrap text content in a div to preserve line breaks
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'text-content-wrapper';
            contentWrapper.innerHTML = formattedContent;
            contentContainer.innerHTML = '';
            contentContainer.appendChild(contentWrapper);
            console.log(`✅ Content loaded for ${section}`);
        } else {
            throw new Error(data.error || 'Failed to load content');
        }
    } catch (error) {
        console.error('Error loading content:', error);
        contentContainer.innerHTML = `
            ${titleHTML}
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

