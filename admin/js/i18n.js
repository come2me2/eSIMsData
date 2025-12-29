// Language translations
const translations = {
    en: {
        // Common
        dashboard: "Dashboard",
        orders: "Orders",
        users: "Users",
        payments: "Payments",
        settings: "Settings",
        logout: "Logout",
        search: "Search",
        filter: "Filter",
        export: "Export",
        actions: "Actions",
        status: "Status",
        date: "Date",
        total: "Total",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
        view: "View",
        close: "Close",
        
        // Dashboard
        totalOrders: "Total Orders",
        activeUsers: "Active Users",
        totalRevenue: "Total Revenue",
        pendingOrders: "Pending Orders",
        salesLast30Days: "Sales for the last 30 days",
        paymentMethods: "Payment Methods",
        recentOrders: "Recent Orders",
        orderNumber: "Order #",
        customer: "Customer",
        amount: "Amount",
        
        // Orders
        allOrders: "All Orders",
        orderDetails: "Order Details",
        orderReference: "Order Reference",
        telegramUsername: "Telegram Username",
        country: "Country",
        plan: "Plan",
        price: "Price",
        createdAt: "Created",
        updateStatus: "Update Status",
        resendEmail: "Resend Email",
        filterByUser: "Filter by user",
        clearFilter: "Clear filter",
        refresh: "Refresh",
        ordersManagement: "Order management and detailed information",
        searchPlaceholder: "Order ID or Telegram ID",
        all: "All",
        dateFrom: "From",
        dateTo: "To",
        applyFilters: "Apply",
        clearFilters: "Clear",
        exportData: "Export",
        
        // Order Status
        pending: "Pending",
        completed: "Completed",
        cancelled: "Cancelled",
        on_hold: "On Hold",
        
        // Users
        allUsers: "All Users",
        userId: "User ID",
        username: "Username",
        email: "Email",
        phone: "Phone",
        registeredAt: "Registered",
        totalOrders: "Total Orders",
        viewOrders: "View Orders",
        
        // Payments
        allPayments: "All Payments",
        paymentId: "Payment ID",
        paymentMethod: "Payment Method",
        transactionId: "Transaction ID",
        
        // Settings
        siteSettings: "Site Settings",
        faq: "FAQ",
        privacyPolicy: "Privacy Policy",
        refundPolicy: "Refund Policy",
        termsOfService: "Terms of Service",
        enterContent: "Enter content (text only)...",
        plainTextOnly: "Plain text only, no HTML elements. Use **text** for bold.",
        saveChanges: "Save Changes",
        changesSaved: "Changes saved successfully",
        errorSaving: "Error saving changes",
        
        // Language
        language: "Language",
        english: "English",
        russian: "Russian",
        
        // Messages
        noOrders: "No orders",
        noUsers: "No users",
        noPayments: "No payments"
    },
    ru: {
        // Common
        dashboard: "Панель управления",
        orders: "Заказы",
        users: "Пользователи",
        payments: "Платежи",
        settings: "Настройки",
        logout: "Выход",
        search: "Поиск",
        filter: "Фильтр",
        export: "Экспорт",
        actions: "Действия",
        status: "Статус",
        date: "Дата",
        total: "Всего",
        loading: "Загрузка...",
        error: "Ошибка",
        success: "Успешно",
        cancel: "Отмена",
        save: "Сохранить",
        delete: "Удалить",
        edit: "Редактировать",
        view: "Просмотр",
        close: "Закрыть",
        
        // Dashboard
        totalOrders: "Всего заказов",
        activeUsers: "Активных пользователей",
        totalRevenue: "Общий доход",
        pendingOrders: "Ожидающих заказов",
        salesLast30Days: "Продажи за последние 30 дней",
        paymentMethods: "Методы оплаты",
        recentOrders: "Последние заказы",
        orderNumber: "Заказ №",
        customer: "Клиент",
        amount: "Сумма",
        
        // Orders
        allOrders: "Все заказы",
        orderDetails: "Детали заказа",
        orderReference: "Номер заказа",
        telegramUsername: "Telegram Username",
        country: "Страна",
        plan: "Тариф",
        price: "Цена",
        createdAt: "Создан",
        updateStatus: "Обновить статус",
        resendEmail: "Отправить повторно",
        filterByUser: "Фильтр по пользователю",
        clearFilter: "Очистить фильтр",
        refresh: "Обновить",
        ordersManagement: "Управление заказами и просмотр детальной информации",
        searchPlaceholder: "ID заказа или Telegram ID",
        all: "Все",
        dateFrom: "От",
        dateTo: "До",
        applyFilters: "Применить",
        clearFilters: "Очистить",
        exportData: "Экспорт",
        
        // Order Status
        pending: "Ожидание",
        completed: "Завершен",
        cancelled: "Отменен",
        on_hold: "На удержании",
        
        // Users
        allUsers: "Все пользователи",
        userId: "ID пользователя",
        username: "Имя пользователя",
        email: "Email",
        phone: "Телефон",
        registeredAt: "Зарегистрирован",
        totalOrders: "Всего заказов",
        viewOrders: "Просмотр заказов",
        
        // Payments
        allPayments: "Все платежи",
        paymentId: "ID платежа",
        paymentMethod: "Метод оплаты",
        transactionId: "ID транзакции",
        
        // Settings
        siteSettings: "Настройки сайта",
        faq: "FAQ",
        privacyPolicy: "Политика конфиденциальности",
        refundPolicy: "Политика возврата",
        termsOfService: "Условия использования",
        enterContent: "Введите содержимое (только текст)...",
        plainTextOnly: "Только простой текст, без HTML элементов. Используйте **текст** для жирного шрифта.",
        saveChanges: "Сохранить изменения",
        changesSaved: "Изменения сохранены успешно",
        errorSaving: "Ошибка при сохранении",
        
        // Language
        language: "Язык",
        english: "Английский",
        russian: "Русский",
        
        // Messages
        noOrders: "Нет заказов",
        noUsers: "Нет пользователей",
        noPayments: "Нет платежей"
    }
};

// Language manager
class I18n {
    constructor() {
        this.currentLang = this.getStoredLanguage() || 'en'; // Default to English
        this.translations = translations;
    }
    
    getStoredLanguage() {
        return localStorage.getItem('adminLanguage');
    }
    
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.error(`Language ${lang} not found`);
            return;
        }
        
        this.currentLang = lang;
        localStorage.setItem('adminLanguage', lang);
        this.updatePageLanguage();
        
        // Dispatch event for other scripts to listen
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }
    
    t(key) {
        const translation = this.translations[this.currentLang][key];
        if (!translation) {
            console.warn(`Translation key "${key}" not found for language "${this.currentLang}"`);
            return key;
        }
        return translation;
    }
    
    updatePageLanguage() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Check if element has data-i18n-attr to update attribute instead
            const attrName = element.getAttribute('data-i18n-attr');
            if (attrName) {
                element.setAttribute(attrName, translation);
            } else {
                element.textContent = translation;
            }
        });
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
    }
    
    init() {
        this.updatePageLanguage();
        this.initLanguageSelector();
    }
    
    initLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (!selector) return;
        
        selector.value = this.currentLang;
        selector.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
    }
}

// Create global instance
window.i18n = new I18n();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.i18n.init());
} else {
    window.i18n.init();
}

