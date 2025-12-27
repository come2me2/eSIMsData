/**
 * Payments management page
 */

const Payments = {
    currentSettings: null,
    
    // Load settings
    async loadSettings() {
        try {
            const response = await Auth.authenticatedFetch('/api/admin/settings');
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.currentSettings = data.settings;
                this.renderSettings(data.settings);
                this.updateTotalMarkups();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Ошибка загрузки настроек');
        }
    },
    
    // Render settings
    renderSettings(settings) {
        // Base markup
        if (settings.markup) {
            document.getElementById('markupEnabled').checked = settings.markup.enabled || false;
            const baseMarkup = settings.markup.base || settings.markup.defaultMultiplier || 1.29;
            document.getElementById('baseMarkup').value = baseMarkup;
        }
        
        // Payment methods with markups
        if (settings.paymentMethods) {
            // Telegram Stars
            document.getElementById('paymentTelegramStars').checked = settings.paymentMethods.telegramStars?.enabled || false;
            document.getElementById('markupTelegramStars').value = settings.paymentMethods.telegramStars?.markup || settings.paymentMethods.telegramStars?.markupMultiplier || 1.05;
            
            // Crypto
            document.getElementById('paymentCrypto').checked = settings.paymentMethods.crypto?.enabled || false;
            document.getElementById('markupCrypto').value = settings.paymentMethods.crypto?.markup || settings.paymentMethods.crypto?.markupMultiplier || 1.0;
            
            // Bank Card
            document.getElementById('paymentBankCard').checked = settings.paymentMethods.bankCard?.enabled || false;
            document.getElementById('markupBankCard').value = settings.paymentMethods.bankCard?.markup || settings.paymentMethods.bankCard?.markupMultiplier || 1.1;
        }
        
        // Добавляем обработчики для автоматического пересчета общей наценки
        document.getElementById('baseMarkup').addEventListener('input', () => this.updateTotalMarkups());
        document.getElementById('markupTelegramStars').addEventListener('input', () => this.updateTotalMarkups());
        document.getElementById('markupCrypto').addEventListener('input', () => this.updateTotalMarkups());
        document.getElementById('markupBankCard').addEventListener('input', () => this.updateTotalMarkups());
    },
    
    // Update total markups display
    updateTotalMarkups() {
        const baseMarkup = parseFloat(document.getElementById('baseMarkup').value) || 1.29;
        const markupTelegramStars = parseFloat(document.getElementById('markupTelegramStars').value) || 1.05;
        const markupCrypto = parseFloat(document.getElementById('markupCrypto').value) || 1.0;
        const markupBankCard = parseFloat(document.getElementById('markupBankCard').value) || 1.1;
        
        const totalTelegramStars = baseMarkup * markupTelegramStars;
        const totalCrypto = baseMarkup * markupCrypto;
        const totalBankCard = baseMarkup * markupBankCard;
        
        const percentTelegramStars = ((totalTelegramStars - 1) * 100).toFixed(2);
        const percentCrypto = ((totalCrypto - 1) * 100).toFixed(2);
        const percentBankCard = ((totalBankCard - 1) * 100).toFixed(2);
        
        document.getElementById('totalMarkupTelegramStars').textContent = 
            `Общая наценка: ${totalTelegramStars.toFixed(4)} (${percentTelegramStars > 0 ? '+' : ''}${percentTelegramStars}%)`;
        document.getElementById('totalMarkupCrypto').textContent = 
            `Общая наценка: ${totalCrypto.toFixed(4)} (${percentCrypto > 0 ? '+' : ''}${percentCrypto}%)`;
        document.getElementById('totalMarkupBankCard').textContent = 
            `Общая наценка: ${totalBankCard.toFixed(4)} (${percentBankCard > 0 ? '+' : ''}${percentBankCard}%)`;
    },
    
    // Save base markup
    async saveBaseMarkup() {
        try {
            const enabled = document.getElementById('markupEnabled').checked;
            const baseMarkup = parseFloat(document.getElementById('baseMarkup').value);
            
            if (isNaN(baseMarkup) || baseMarkup < 1) {
                this.showError('Базовая наценка должна быть не менее 1.0');
                return;
            }
            
            const response = await Auth.authenticatedFetch('/api/admin/settings/markup', {
                method: 'PUT',
                body: JSON.stringify({
                    enabled,
                    base: baseMarkup,
                    defaultMultiplier: baseMarkup
                })
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Базовая наценка сохранена');
                this.loadSettings();
            } else {
                this.showError(data.error || 'Ошибка сохранения базовой наценки');
            }
        } catch (error) {
            console.error('Error saving base markup:', error);
            this.showError('Ошибка сохранения базовой наценки');
        }
    },
    
    // Save payment methods
    async savePaymentMethods() {
        try {
            const markupTelegramStars = parseFloat(document.getElementById('markupTelegramStars').value);
            const markupCrypto = parseFloat(document.getElementById('markupCrypto').value);
            const markupBankCard = parseFloat(document.getElementById('markupBankCard').value);
            
            if (isNaN(markupTelegramStars) || markupTelegramStars < 1) {
                this.showError('Наценка для Telegram Stars должна быть не менее 1.0');
                return;
            }
            if (isNaN(markupCrypto) || markupCrypto < 1) {
                this.showError('Наценка для Криптовалют должна быть не менее 1.0');
                return;
            }
            if (isNaN(markupBankCard) || markupBankCard < 1) {
                this.showError('Наценка для Банковских карт должна быть не менее 1.0');
                return;
            }
            
            const paymentMethods = {
                telegramStars: { 
                    enabled: document.getElementById('paymentTelegramStars').checked,
                    markup: markupTelegramStars,
                    markupMultiplier: markupTelegramStars
                },
                crypto: { 
                    enabled: document.getElementById('paymentCrypto').checked,
                    markup: markupCrypto,
                    markupMultiplier: markupCrypto
                },
                bankCard: { 
                    enabled: document.getElementById('paymentBankCard').checked,
                    markup: markupBankCard,
                    markupMultiplier: markupBankCard
                }
            };
            
            const response = await Auth.authenticatedFetch('/api/admin/settings/paymentMethods', {
                method: 'PUT',
                body: JSON.stringify(paymentMethods)
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Способы оплаты и наценки сохранены');
                this.loadSettings();
            } else {
                this.showError(data.error || 'Ошибка сохранения способов оплаты');
            }
        } catch (error) {
            console.error('Error saving payment methods:', error);
            this.showError('Ошибка сохранения способов оплаты');
        }
    },
    
    // Show success message
    showSuccess(message) {
        // Простая реализация через alert, можно улучшить
        alert('✓ ' + message);
    },
    
    // Show error message
    showError(message) {
        alert('✗ ' + message);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Payments.loadSettings();
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Auth.logout();
        });
    }
});



