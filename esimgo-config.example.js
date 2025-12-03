/**
 * Конфигурация eSIM Go API
 * Скопируйте этот файл в esimgo-config.js и заполните своими данными
 * НЕ коммитьте esimgo-config.js в git (добавьте в .gitignore)
 * 
 * Для продакшн используйте переменные окружения Vercel:
 * - ESIMGO_API_KEY
 * - ESIMGO_API_SECRET
 * - ESIMGO_API_URL
 * - ESIMGO_WEBHOOK_SECRET
 */

const esimgoConfig = {
    // API ключ от eSIM Go
    apiKey: process.env.ESIMGO_API_KEY || 'YOUR_API_KEY_HERE',
    
    // API секрет (если требуется)
    apiSecret: process.env.ESIMGO_API_SECRET || 'YOUR_API_SECRET_HERE',
    
    // Base URL API
    // Prod: https://api.esim-go.com/v2
    // Документация: https://docs.esim-go.com/api/v2_0/
    apiUrl: process.env.ESIMGO_API_URL || 'https://api.esim-go.com/v2',
    
    // Секрет для валидации webhooks
    webhookSecret: process.env.ESIMGO_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET_HERE',
    
    // Таймаут запросов (мс)
    timeout: 30000,
    
    // Retry настройки
    retry: {
        attempts: 3,
        delay: 1000
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = esimgoConfig;
} else {
    window.esimgoConfig = esimgoConfig;
}

