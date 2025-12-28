/**
 * Конфигурация Telegram бота
 * Скопируйте этот файл в bot-config.js и заполните своими данными
 * НЕ коммитьте bot-config.js в git (добавьте в .gitignore)
 */

const botConfig = {
    // Токен бота от @BotFather
    // Получите через: /newbot в @BotFather
    botToken: 'YOUR_BOT_TOKEN_HERE',
    
    // URL вашего Mini App
    // Для локального тестирования используйте ngrok: https://your-ngrok-url.ngrok.io
    // Для продакшн: https://your-domain.com
    webAppUrl: 'https://your-domain.com',
    
    // Название приложения (опционально)
    appName: 'eSimsData',
    
    // Описание приложения (опционально)
    appDescription: 'Global eSIM for your Travel',
    
    // Короткое имя для команды (опционально)
    shortName: 'eSimsData'
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = botConfig;
} else {
    window.botConfig = botConfig;
}



















