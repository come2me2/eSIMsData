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
        
        // Настройка цветов темы
        this.tg.setHeaderColor('#FFFFFF');
        this.tg.setBackgroundColor('#F2F2F7');
        
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
     * Отправить данные на сервер для валидации
     * @param {string} apiUrl - URL API endpoint
     * @returns {Promise<Object>}
     */
    async validateOnServer(apiUrl) {
        if (!this.initData) {
            throw new Error('No initData available');
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: this.initData,
                    user: this.getUserData()
                })
            });

            if (!response.ok) {
                throw new Error(`Server validation failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Server validation error:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр
window.telegramAuth = new TelegramAuth();

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramAuth;
}





