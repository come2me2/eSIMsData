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
            // Update toggle state (enable/disable input field)
            this.updateBaseMarkupToggle();
        }
        
        // Payment methods with markups
        if (settings.paymentMethods) {
            // Telegram Stars
            document.getElementById('paymentTelegramStars').checked = settings.paymentMethods.telegramStars?.enabled || false;
            document.getElementById('markupTelegramStars').value = settings.paymentMethods.telegramStars?.markup || settings.paymentMethods.telegramStars?.markupMultiplier || 1.05;
            this.updatePaymentCardUI('TelegramStars', settings.paymentMethods.telegramStars?.enabled || false);
            
            // Crypto
            document.getElementById('paymentCrypto').checked = settings.paymentMethods.crypto?.enabled || false;
            document.getElementById('markupCrypto').value = settings.paymentMethods.crypto?.markup || settings.paymentMethods.crypto?.markupMultiplier || 1.0;
            this.updatePaymentCardUI('Crypto', settings.paymentMethods.crypto?.enabled || false);
            
            // Bank Card
            document.getElementById('paymentBankCard').checked = settings.paymentMethods.bankCard?.enabled || false;
            document.getElementById('markupBankCard').value = settings.paymentMethods.bankCard?.markup || settings.paymentMethods.bankCard?.markupMultiplier || 1.1;
            this.updatePaymentCardUI('BankCard', settings.paymentMethods.bankCard?.enabled || false);
        }
        
        // Добавляем обработчики для автоматического пересчета общей наценки
        document.getElementById('baseMarkup').addEventListener('input', () => this.updateTotalMarkups());
        document.getElementById('markupTelegramStars').addEventListener('input', () => this.updateTotalMarkups());
        document.getElementById('markupCrypto').addEventListener('input', () => this.updateTotalMarkups());
        document.getElementById('markupBankCard').addEventListener('input', () => this.updateTotalMarkups());
    },
    
    // Toggle payment method and update UI
    togglePaymentMethod(methodName) {
        const checkbox = document.getElementById(`payment${methodName}`);
        const isEnabled = checkbox.checked;
        this.updatePaymentCardUI(methodName, isEnabled);
    },
    
    // Update payment card UI based on enabled state
    updatePaymentCardUI(methodName, isEnabled) {
        const card = document.getElementById(`paymentCard${methodName}`);
        const status = document.getElementById(`status${methodName}`);
        const markupFields = document.getElementById(`markupFields${methodName}`);
        
        if (!card || !status || !markupFields) return;
        
        if (isEnabled) {
            card.classList.remove('opacity-60', 'bg-gray-50');
            card.classList.add('border-blue-200', 'bg-blue-50');
            status.textContent = '✓ Активен';
            status.classList.remove('text-red-600');
            status.classList.add('text-green-600');
            markupFields.style.display = 'block';
        } else {
            card.classList.remove('border-blue-200', 'bg-blue-50');
            card.classList.add('opacity-60', 'bg-gray-50');
            status.textContent = '✗ Деактивирован';
            status.classList.remove('text-green-600');
            status.classList.add('text-red-600');
            markupFields.style.display = 'none';
        }
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
    
    // Update base markup toggle (called when toggle is changed)
    updateBaseMarkupToggle() {
        const enabled = document.getElementById('markupEnabled').checked;
        const baseMarkupField = document.getElementById('baseMarkup');
        
        // Visual feedback - можно добавить стилизацию
        if (enabled) {
            baseMarkupField.disabled = false;
            baseMarkupField.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            baseMarkupField.disabled = true;
            baseMarkupField.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        // Обновляем общие наценки, если они зависят от базовой
        this.updateTotalMarkups();
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



