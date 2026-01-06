/**
 * Telegram WebApp Authentication Utility
 * Утилита для работы с авторизацией пользователей через Telegram
 */

class TelegramAuth {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.initData = null;
        this.isReady = false;
        this.isValidated = false;
        this.validationResult = null;
        this.init();
    }

    /**
     * Инициализация Telegram WebApp
     */
    init() {
        if (!this.tg) {
            console.warn('Telegram WebApp SDK not available. Running outside Telegram?');
            return;
        }

        // Инициализация WebApp
        this.tg.ready();
        this.tg.expand();
        
        // Настройка цветов темы (только если поддерживается в этой версии)
        try {
            if (this.tg.setHeaderColor && this.tg.version && parseFloat(this.tg.version) >= 6.1) {
                this.tg.setHeaderColor('#FFFFFF');
            }
        } catch (e) {
            // Игнорируем, если не поддерживается
        }
        try {
            if (this.tg.setBackgroundColor && this.tg.version && parseFloat(this.tg.version) >= 6.1) {
                this.tg.setBackgroundColor('#F2F2F7');
            }
        } catch (e) {
            // Игнорируем, если не поддерживается
        }
        
        // Получение данных пользователя
        this.user = this.tg.initDataUnsafe?.user || null;
        this.initData = this.tg.initData || null;
        this.isReady = true;

        // Сохранение данных пользователя в localStorage
        if (this.user) {
            this.saveUserToStorage();
        }

        // Логирование для отладки
        if (this.user) {
            console.log('Telegram user authenticated:', this.getUserId());
        } else {
            console.log('Telegram user not authenticated or running outside Telegram');
        }
    }

    /**
     * Проверка, авторизован ли пользователь
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.user && !!this.user.id;
    }

    /**
     * Получить объект пользователя
     * @returns {Object|null}
     */
    getUser() {
        return this.user;
    }

    /**
     * Получить Telegram ID пользователя
     * @returns {number|null}
     */
    getUserId() {
        return this.user?.id || null;
    }

    /**
     * Получить имя пользователя
     * @returns {string}
     */
    getUserName() {
        if (!this.user) return 'Guest';
        
        if (this.user.first_name && this.user.last_name) {
            return `${this.user.first_name} ${this.user.last_name}`.trim();
        }
        
        return this.user.first_name || 
               this.user.username || 
               `User ${this.user.id}`;
    }

    /**
     * Получить только имя (first_name)
     * @returns {string}
     */
    getFirstName() {
        return this.user?.first_name || '';
    }

    /**
     * Получить фамилию (last_name)
     * @returns {string}
     */
    getLastName() {
        return this.user?.last_name || '';
    }

    /**
     * Получить username
     * @returns {string|null}
     */
    getUsername() {
        return this.user?.username || null;
    }

    /**
     * Получить URL фото профиля
     * @returns {string|null}
     */
    getUserPhoto() {
        return this.user?.photo_url || null;
    }

    /**
     * Получить язык пользователя
     * @returns {string}
     */
    getLanguageCode() {
        return this.user?.language_code || 'en';
    }

    /**
     * Получить полный initData для отправки на сервер (для валидации)
     * @returns {string|null}
     */
    getInitData() {
        return this.initData;
    }

    /**
     * Получить все данные initDataUnsafe
     * @returns {Object}
     */
    getInitDataUnsafe() {
        return this.tg?.initDataUnsafe || {};
    }

    /**
     * Получить параметр запуска (start_param)
     * @returns {string|null}
     */
    getStartParam() {
        return this.tg?.initDataUnsafe?.start_param || null;
    }

    /**
     * Получить тип чата
     * @returns {string|null}
     */
    getChatType() {
        return this.tg?.initDataUnsafe?.chat_type || null;
    }

    /**
     * Сохранить данные пользователя в localStorage
     */
    saveUserToStorage() {
        if (this.user) {
            try {
                localStorage.setItem('telegram_user', JSON.stringify({
                    id: this.user.id,
                    first_name: this.user.first_name,
                    last_name: this.user.last_name,
                    username: this.user.username,
                    language_code: this.user.language_code,
                    photo_url: this.user.photo_url,
                    auth_date: this.tg?.initDataUnsafe?.auth_date || Date.now()
                }));
            } catch (e) {
                console.error('Failed to save user to localStorage:', e);
            }
        }
    }

    /**
     * Загрузить данные пользователя из localStorage
     * @returns {Object|null}
     */
    loadUserFromStorage() {
        try {
            const stored = localStorage.getItem('telegram_user');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error('Failed to load user from localStorage:', e);
            return null;
        }
    }

    /**
     * Очистить сохраненные данные пользователя
     */
    clearStoredUser() {
        localStorage.removeItem('telegram_user');
    }

    /**
     * Получить все данные о пользователе в виде объекта
     * @returns {Object}
     */
    getUserData() {
        return {
            id: this.getUserId(),
            name: this.getUserName(),
            first_name: this.getFirstName(),
            last_name: this.getLastName(),
            username: this.getUsername(),
            photo: this.getUserPhoto(),
            language: this.getLanguageCode(),
            is_authenticated: this.isAuthenticated()
        };
    }

    /**
     * Показать главную кнопку Telegram
     * @param {Object} options - Опции кнопки
     */
    showMainButton(options = {}) {
        if (!this.tg) return;
        
        this.tg.MainButton.setText(options.text || 'Continue');
        this.tg.MainButton.show();
        
        if (options.onClick) {
            this.tg.MainButton.onClick(options.onClick);
        }
    }

    /**
     * Скрыть главную кнопку Telegram
     */
    hideMainButton() {
        if (!this.tg) return;
        this.tg.MainButton.hide();
    }

    /**
     * Показать Back кнопку
     */
    showBackButton() {
        if (!this.tg) return;
        this.tg.BackButton.show();
    }

    /**
     * Скрыть Back кнопку
     */
    hideBackButton() {
        if (!this.tg) return;
        this.tg.BackButton.hide();
    }

    /**
     * Установить обработчик Back кнопки
     * @param {Function} callback
     */
    onBackButton(callback) {
        if (!this.tg) return;
        this.tg.BackButton.onClick(callback);
    }

    /**
     * Вибрация (haptic feedback)
     * @param {string} type - 'impact', 'notification', 'selection'
     * @param {string} style - 'light', 'medium', 'heavy', 'rigid', 'soft'
     */
    hapticFeedback(type = 'impact', style = 'light') {
        if (!this.tg?.HapticFeedback) return;
        
        if (type === 'impact') {
            this.tg.HapticFeedback.impactOccurred(style);
        } else if (type === 'notification') {
            this.tg.HapticFeedback.notificationOccurred(style);
        } else if (type === 'selection') {
            this.tg.HapticFeedback.selectionChanged();
        }
    }

    /**
     * Открыть ссылку
     * @param {string} url
     */
    openLink(url) {
        if (!this.tg) {
            window.open(url, '_blank');
            return;
        }
        this.tg.openLink(url);
    }

    /**
     * Открыть Telegram
     * @param {string} username - Username без @
     */
    openTelegramLink(username) {
        this.openLink(`https://t.me/${username}`);
    }

    /**
     * Отправить данные на сервер для валидации (signature или hash)
     * @param {string} apiUrl - URL API endpoint (по умолчанию /api/validate-telegram)
     * @returns {Promise<Object>}
     */
    async validateOnServer(apiUrl = '/api/validate-telegram') {
        if (!this.initData) {
            console.warn('No initData available for validation');
            return { valid: false, error: 'No initData available' };
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: this.initData
                })
            });

            const result = await response.json();
            
            // Сохраняем результат валидации
            this.validationResult = result;
            this.isValidated = result.valid === true;
            
            if (this.isValidated) {
                console.log('✅ Telegram data validated via', result.method);
            } else {
                console.warn('❌ Telegram validation failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Server validation error:', error);
            this.validationResult = { valid: false, error: error.message };
            this.isValidated = false;
            return this.validationResult;
        }
    }

    /**
     * Проверить, прошла ли серверная валидация
     * @returns {boolean}
     */
    isServerValidated() {
        return this.isValidated;
    }

    /**
     * Получить результат последней валидации
     * @returns {Object|null}
     */
    getValidationResult() {
        return this.validationResult;
    }

    /**
     * Валидировать и выполнить действие только если валидация успешна
     * @param {Function} onSuccess - callback при успешной валидации
     * @param {Function} onError - callback при ошибке
     * @returns {Promise<void>}
     */
    async validateAndExecute(onSuccess, onError) {
        const result = await this.validateOnServer();
        
        if (result.valid) {
            if (onSuccess) onSuccess(result);
        } else {
            if (onError) {
                onError(result);
            } else {
                console.error('Validation failed:', result.error);
            }
        }
    }

    /**
     * Создать защищённый запрос с валидацией
     * Используйте для критичных операций (покупка, сохранение данных)
     * @param {string} apiUrl - URL API endpoint
     * @param {Object} data - данные для отправки
     * @returns {Promise<Object>}
     */
    async secureRequest(apiUrl, data = {}) {
        // Сначала валидируем данные
        if (!this.isValidated) {
            const validation = await this.validateOnServer();
            if (!validation.valid) {
                throw new Error('Telegram validation failed: ' + validation.error);
            }
        }

        // Отправляем запрос с initData для повторной проверки на сервере
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': this.initData || ''
            },
            body: JSON.stringify({
                ...data,
                telegram_user_id: this.getUserId(),
                initData: this.initData
            })
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`);
        }

        return await response.json();
    }
}

/**
 * Hard Reload утилита для Telegram Mini App
 * Очищает весь кэш и перезагружает приложение
 * 
 * Использование:
 * - В консоли браузера: hardReload()
 * - В коде: window.hardReload()
 * 
 * @param {Object} options - Опции для hard reload
 * @param {boolean} options.clearLocalStorage - Очистить весь localStorage (по умолчанию false, очищает только кэш)
 * @param {boolean} options.clearDataLoader - Очистить кэш DataLoader (по умолчанию true)
 */
function hardReload(options = {}) {
    const {
        clearLocalStorage = false,
        clearDataLoader = true
    } = options;
    
    console.log('🔄 Hard reload started...');
    
    // Очищаем кэш DataLoader
    if (clearDataLoader && window.DataLoader && typeof window.DataLoader.clearCache === 'function') {
        console.log('🗑️ Clearing DataLoader cache...');
        window.DataLoader.clearCache();
    }
    
    // Очищаем весь localStorage (опционально)
    if (clearLocalStorage) {
        console.log('🗑️ Clearing all localStorage...');
        localStorage.clear();
    }
    
    // Очищаем sessionStorage
    if (sessionStorage) {
        console.log('🗑️ Clearing sessionStorage...');
        sessionStorage.clear();
    }
    
    // Haptic feedback (если доступен)
    const tg = window.Telegram?.WebApp;
    if (tg && tg.HapticFeedback) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
        } catch (e) {
            // Игнорируем ошибки
        }
    }
    
    // Перезагружаем страницу с параметром для обхода кэша
    const url = new URL(window.location.href);
    url.searchParams.set('_reload', Date.now().toString());
    
    console.log('🔄 Reloading page...');
    window.location.href = url.toString();
}

// Экспортируем hardReload глобально
window.hardReload = hardReload;

// Создаем глобальный экземпляр
window.telegramAuth = new TelegramAuth();

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramAuth;
}








// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramAuth;
}






