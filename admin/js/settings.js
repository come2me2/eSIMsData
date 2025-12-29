/**
 * Settings management page
 * This page handles only country markups. Payment methods and promocodes have been moved to payments.html
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
    } catch (error) {
        console.error('Error initializing settings page:', error);
    }
});
