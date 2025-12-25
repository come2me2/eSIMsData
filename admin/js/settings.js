/**
 * Settings management page
 */

const Settings = {
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
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Ошибка загрузки настроек');
        }
    },
    
    // Render settings
    renderSettings(settings) {
        // Markup
        if (settings.markup) {
            document.getElementById('markupEnabled').checked = settings.markup.enabled || false;
            // Базовая наценка как множитель (например, 1.29 вместо 29%)
            const baseMarkup = settings.markup.base || settings.markup.defaultMultiplier || 1.29;
            document.getElementById('baseMarkup').value = baseMarkup;
            this.renderCountryMarkups(settings.markup.countryMarkups || {});
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
        
        // Promocodes
        if (settings.promocodes) {
            this.renderPromocodes(settings.promocodes);
        }
    },
    
    // Render promocodes table
    renderPromocodes(promocodes) {
        const tbody = document.getElementById('promocodesTable');
        if (!tbody) return;
        
        if (promocodes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">Нет промокодов</td></tr>';
            return;
        }
        
        tbody.innerHTML = promocodes.map(promo => {
            const validUntil = promo.validUntil 
                ? new Date(promo.validUntil).toLocaleDateString('ru-RU')
                : 'Без ограничений';
            const maxUses = promo.maxUses ? `${promo.usedCount || 0} / ${promo.maxUses}` : `${promo.usedCount || 0} / ∞`;
            const discountText = promo.type === 'percent' 
                ? `${promo.discount}%` 
                : `$${promo.discount}`;
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${promo.code}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${discountText}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${promo.type === 'percent' ? 'Процент' : 'Фиксированная'}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${validUntil}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${maxUses}</td>
                    <td class="px-4 py-3 text-sm">
                        <button onclick="Settings.deletePromocode('${promo.code}')" class="text-red-600 hover:text-red-800 font-medium">
                            Удалить
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Render country markups
    renderCountryMarkups(countryMarkups) {
        const container = document.getElementById('countryMarkupsList');
        if (!container) return;
        
        container.innerHTML = Object.entries(countryMarkups).map(([country, percent]) => `
            <div class="flex items-center gap-2 bg-gray-50 p-2 rounded">
                <input type="text" value="${country}" class="form-input flex-1" placeholder="Код страны (US, GB, etc.)" readonly>
                <input type="number" value="${percent}" class="form-input w-24" min="0" max="100" step="0.1" placeholder="%" data-country="${country}">
                <button onclick="Settings.removeCountryMarkup('${country}')" class="text-red-600 hover:text-red-800">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    },
    
    // Add country markup
    addCountryMarkup() {
        const container = document.getElementById('countryMarkupsList');
        if (!container) return;
        
        const countryCode = prompt('Введите код страны (например: US, GB, DE):');
        if (!countryCode) return;
        
        const percent = prompt('Введите наценку в процентах:');
        if (!percent || isNaN(percent)) return;
        
        const markup = parseFloat(percent);
        if (isNaN(markup) || markup < 0 || markup > 100) {
            this.showError('Неверное значение наценки');
            return;
        }
        
        // Добавляем новый элемент
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 bg-gray-50 p-2 rounded';
        div.innerHTML = `
            <input type="text" value="${countryCode.toUpperCase()}" class="form-input flex-1" placeholder="Код страны" readonly>
            <input type="number" value="${markup}" class="form-input w-24" min="0" max="100" step="0.1" placeholder="%" data-country="${countryCode.toUpperCase()}">
            <button onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        container.appendChild(div);
    },
    
    // Remove country markup
    removeCountryMarkup(country) {
        const inputs = document.querySelectorAll(`#countryMarkupsList input[data-country="${country}"]`);
        inputs.forEach(input => {
            const div = input.closest('.flex');
            if (div) div.remove();
        });
    },
    
    // Save markup settings
    async saveMarkup() {
        try {
            const enabled = document.getElementById('markupEnabled').checked;
            const baseMarkup = parseFloat(document.getElementById('baseMarkup').value);
            
            if (isNaN(baseMarkup) || baseMarkup < 1) {
                this.showError('Базовая наценка должна быть не менее 1.0');
                return;
            }
            
            // Собираем наценки по странам (оставляем как проценты для обратной совместимости)
            const countryMarkups = {};
            const countryInputs = document.querySelectorAll('#countryMarkupsList input[data-country]');
            countryInputs.forEach(input => {
                const country = input.getAttribute('data-country');
                const percent = parseFloat(input.value);
                if (country && !isNaN(percent)) {
                    countryMarkups[country] = percent;
                }
            });
            
            const response = await Auth.authenticatedFetch('/api/admin/settings/markup', {
                method: 'PUT',
                body: JSON.stringify({
                    enabled,
                    base: baseMarkup, // Сохраняем как множитель
                    defaultMultiplier: baseMarkup, // Для обратной совместимости
                    countryMarkups
                })
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Наценка сохранена');
                this.loadSettings();
            } else {
                this.showError(data.error || 'Ошибка сохранения наценки');
            }
        } catch (error) {
            console.error('Error saving markup:', error);
            this.showError('Ошибка сохранения наценки');
        }
    },
    
    // Save payment methods
    async savePaymentMethods() {
        try {
            // Получаем наценки для каждого способа оплаты
            const markupTelegramStars = parseFloat(document.getElementById('markupTelegramStars').value);
            const markupCrypto = parseFloat(document.getElementById('markupCrypto').value);
            const markupBankCard = parseFloat(document.getElementById('markupBankCard').value);
            
            // Валидация
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
                    markupMultiplier: markupTelegramStars // Для обратной совместимости
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
    
    // Show promocode modal
    showPromocodeModal() {
        document.getElementById('promocodeModal').classList.remove('hidden');
        document.getElementById('promocodeForm').reset();
    },
    
    // Close promocode modal
    closePromocodeModal() {
        document.getElementById('promocodeModal').classList.add('hidden');
    },
    
    // Create promocode
    async createPromocode(e) {
        e.preventDefault();
        
        try {
            const code = document.getElementById('promocodeCode').value;
            const discount = parseFloat(document.getElementById('promocodeDiscount').value);
            const type = document.getElementById('promocodeType').value;
            const validUntil = document.getElementById('promocodeValidUntil').value || null;
            const maxUses = document.getElementById('promocodeMaxUses').value 
                ? parseInt(document.getElementById('promocodeMaxUses').value) 
                : null;
            
            const response = await Auth.authenticatedFetch('/api/admin/settings/promocodes', {
                method: 'POST',
                body: JSON.stringify({
                    code,
                    discount,
                    type,
                    validUntil,
                    maxUses
                })
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Промокод создан');
                this.closePromocodeModal();
                this.loadSettings();
            } else {
                this.showError(data.error || 'Ошибка создания промокода');
            }
        } catch (error) {
            console.error('Error creating promocode:', error);
            this.showError('Ошибка создания промокода');
        }
    },
    
    // Delete promocode
    async deletePromocode(code) {
        if (!confirm(`Удалить промокод ${code}?`)) return;
        
        try {
            const response = await Auth.authenticatedFetch(`/api/admin/settings/promocodes/${code}`, {
                method: 'DELETE'
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Промокод удален');
                this.loadSettings();
            } else {
                this.showError(data.error || 'Ошибка удаления промокода');
            }
        } catch (error) {
            console.error('Error deleting promocode:', error);
            this.showError('Ошибка удаления промокода');
        }
    },
    
    showError(message) {
        alert('Ошибка: ' + message);
    },
    
    showSuccess(message) {
        alert('Успешно: ' + message);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что Auth доступен
    if (typeof Auth === 'undefined') {
        console.error('Auth is not defined. Make sure auth.js is loaded before settings.js');
        return;
    }
    
    try {
        Settings.loadSettings();
        
        const promocodeForm = document.getElementById('promocodeForm');
        if (promocodeForm) {
            promocodeForm.addEventListener('submit', (e) => Settings.createPromocode(e));
        }
        
        const promocodeModal = document.getElementById('promocodeModal');
        if (promocodeModal) {
            promocodeModal.addEventListener('click', (e) => {
                if (e.target === promocodeModal) {
                    Settings.closePromocodeModal();
                }
            });
        }
    } catch (error) {
        console.error('Error initializing settings page:', error);
    }
});

