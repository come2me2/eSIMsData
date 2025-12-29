/**
 * Admin Settings Management
 * Handles password changes and content management
 */

const Settings = {
    currentTab: 'faq',
    
    /**
     * Initialize settings page
     */
    async init() {
        console.log('Settings page initialized');
        
        // Load all content on page load
        await this.loadContent('faq');
        await this.loadContent('privacy');
        await this.loadContent('refund');
        await this.loadContent('terms');
        
        // Setup password change form
        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => this.changePassword(e));
        }
    },
    
    /**
     * Switch between content tabs
     */
    switchTab(tabName) {
        // Hide all content panels
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.remove('active-tab');
        });
        
        // Show selected panel
        const panel = document.getElementById(`content-${tabName}`);
        if (panel) {
            panel.classList.remove('hidden');
        }
        
        // Activate selected tab
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) {
            tab.classList.add('active-tab');
        }
        
        this.currentTab = tabName;
    },
    
    /**
     * Change admin password
     */
    async changePassword(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords
        if (newPassword !== confirmPassword) {
            alert('New password and confirmation do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            alert('Password must contain at least 6 characters');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ Password changed successfully');
                document.getElementById('changePasswordForm').reset();
            } else {
                alert('❌ Error: ' + (data.error || 'Failed to change password'));
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('❌ Error changing password');
        }
    },
    
    /**
     * Load content for a specific section
     */
    async loadContent(section) {
        try {
            const response = await fetch(`/api/admin/content/${section}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`
                }
            });
            
            const data = await response.json();
            console.log(`[Settings] Loaded ${section}:`, { success: data.success, contentLength: data.content?.length || 0 });
            
            if (data.success && data.content !== undefined) {
                const editor = document.getElementById(`editor-${section}`);
                if (editor) {
                    editor.value = data.content;
                    console.log(`[Settings] Set content for ${section}, length: ${data.content.length}`);
                }
            } else {
                console.error(`[Settings] Failed to load ${section}:`, data.error);
            }
        } catch (error) {
            console.error(`Error loading ${section} content:`, error);
        }
    },
    
    /**
     * Save content for a specific section
     */
    async saveContent(section) {
        const editor = document.getElementById(`editor-${section}`);
        if (!editor) {
            console.error(`Editor for ${section} not found`);
            return;
        }
        
        const content = editor.value;
        
        try {
            const response = await fetch(`/api/admin/content/${section}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({ content })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success message
                this.showNotification('✅ Content saved successfully', 'success');
            } else {
                alert('❌ Error: ' + (data.error || 'Failed to save content'));
            }
        } catch (error) {
            console.error(`Error saving ${section} content:`, error);
            alert('❌ Error saving content');
        }
    },
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Auth === 'undefined') {
        console.error('Auth is not defined. Make sure auth.js is loaded before settings.js');
        return;
    }
    
    try {
        Settings.init();
    } catch (error) {
        console.error('Error initializing settings page:', error);
    }
});
