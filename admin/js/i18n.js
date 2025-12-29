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
        paymentsManagement: "Manage markups for payment methods and promo codes",
        baseMarkup: "Base Markup",
        enableMarkup: "Enable Markup",
        baseMarkupMultiplier: "Base Markup (multiplier)",
        baseMarkupExample: "(e.g., 1.29 = +29%)",
        baseMarkupApplies: "Base markup applies to all products",
        saveBaseMarkup: "Save Base Markup",
        paymentMethodsMarkups: "Payment Methods and Markups",
        activateDeactivateInfo: "Activate or deactivate payment methods. Inactive methods will not be displayed to users.",
        additionalMarkup: "Additional Markup (multiplier)",
        additionalMarkupExample: "(e.g., 1.05 = +5%)",
        totalMarkupFormula: "Total markup = Base × Payment method markup",
        cryptocurrencies: "Cryptocurrencies",
        bankCards: "Bank Cards",
        importantNote: "Important:",
        deactivatedNotShown: "Deactivated payment methods will not be shown to users on the checkout page.",
        savePaymentChanges: "Save Changes",
        promocodes: "Promo Codes",
        addPromocode: "Add Promo Code",
        code: "Code",
        discount: "Discount",
        type: "Type",
        startDate: "Start",
        endDate: "End",
        usageCount: "Usage",
        promocodeCode: "Promo Code",
        discountValue: "Discount",
        discountType: "Discount Type",
        percent: "Percent (%)",
        fixed: "Fixed Amount ($)",
        startDateFull: "Start Date",
        endDateOptional: "End Date (optional)",
        maxUsage: "Max Usage (optional)",
        active: "Active",
        inactive: "Inactive",
        createPromocode: "Create Promo Code",
        id: "ID",
        user: "User",
        payment: "Payment",
        firstOrder: "First Order",
        lastOrder: "Last Order",
        totalSpent: "Total Spent",
        userDetails: "User Details",
        
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
        settingsManagement: "Manage system parameters and content",
        changePassword: "Change Administrator Password",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmPassword: "Confirm New Password",
        minCharacters: "Minimum 6 characters",
        changePasswordBtn: "Change Password",
        contentManagement: "Content Management",
        faqDescription: "FAQ (Frequently Asked Questions)",
        privacyDescription: "Privacy Policy",
        refundDescription: "Refund Policy",
        termsDescription: "Terms of Service",
        enterFAQ: "Enter FAQ content (text only)...",
        enterPrivacy: "Enter privacy policy (text only)...",
        enterRefund: "Enter refund policy (text only)...",
        enterTerms: "Enter terms of service (text only)...",
        
        // Language
        language: "Language",
        english: "English",
        russian: "Russian",
        
        // Messages
        noOrders: "No orders",
        noUsers: "No users",
        noPayments: "No payments",
        serverError: "Server error",
        
        // Actions & Buttons
        details: "Details",
        viewDetails: "View Details",
        
        // Order Modal
        closeModal: "Close",
        
        // Dates
        monthShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
        paymentsManagement: "Управление наценками для способов оплаты и промокодами",
        baseMarkup: "Базовая наценка",
        enableMarkup: "Включить наценку",
        baseMarkupMultiplier: "Базовая наценка (множитель)",
        baseMarkupExample: "(например: 1.29 = +29%)",
        baseMarkupApplies: "Базовая наценка применяется ко всем товарам",
        saveBaseMarkup: "Сохранить базовую наценку",
        paymentMethodsMarkups: "Способы оплаты и наценки",
        activateDeactivateInfo: "Активируйте или деактивируйте способы оплаты. Неактивные способы не будут отображаться пользователям.",
        additionalMarkup: "Дополнительная наценка (множитель)",
        additionalMarkupExample: "(например: 1.05 = +5%)",
        totalMarkupFormula: "Общая наценка = Базовая × Наценка способа оплаты",
        cryptocurrencies: "Криптовалюты",
        bankCards: "Банковские карты",
        importantNote: "Важно:",
        deactivatedNotShown: "Деактивированные способы оплаты не будут показываться пользователям на странице checkout.",
        savePaymentChanges: "Сохранить изменения",
        promocodes: "Промокоды",
        addPromocode: "Добавить промокод",
        code: "Код",
        discount: "Скидка",
        type: "Тип",
        startDate: "Начало",
        endDate: "Окончание",
        usageCount: "Использований",
        promocodeCode: "Код промокода",
        discountValue: "Скидка",
        discountType: "Тип скидки",
        percent: "Процент (%)",
        fixed: "Фиксированная сумма ($)",
        startDateFull: "Дата начала действия",
        endDateOptional: "Дата окончания действия (необязательно)",
        maxUsage: "Максимум использований (необязательно)",
        active: "Активен",
        inactive: "Неактивен",
        createPromocode: "Создать промокод",
        id: "ID",
        user: "Пользователь",
        payment: "Оплата",
        firstOrder: "Первый заказ",
        lastOrder: "Последний заказ",
        totalSpent: "Потрачено",
        userDetails: "Детали пользователя",
        
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
        settingsManagement: "Управление параметрами системы и контентом",
        changePassword: "Смена пароля администратора",
        currentPassword: "Текущий пароль",
        newPassword: "Новый пароль",
        confirmPassword: "Подтвердите новый пароль",
        minCharacters: "Минимум 6 символов",
        changePasswordBtn: "Сменить пароль",
        contentManagement: "Управление контентом",
        faqDescription: "FAQ (Часто задаваемые вопросы)",
        privacyDescription: "Privacy Policy (Политика конфиденциальности)",
        refundDescription: "Refund Policy (Политика возврата)",
        termsDescription: "Terms of Service (Условия использования)",
        enterFAQ: "Введите содержимое FAQ (только текст)...",
        enterPrivacy: "Введите политику конфиденциальности (только текст)...",
        enterRefund: "Введите политику возврата (только текст)...",
        enterTerms: "Введите условия использования (только текст)...",
        
        // Language
        language: "Язык",
        english: "Английский",
        russian: "Русский",
        
        // Messages
        noOrders: "Нет заказов",
        noUsers: "Нет пользователей",
        noPayments: "Нет платежей",
        serverError: "Ошибка сервера",
        
        // Actions & Buttons
        details: "Детали",
        viewDetails: "Просмотр деталей",
        
        // Order Modal
        closeModal: "Закрыть",
        
        // Dates
        monthShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    }
};

// Helper function to get locale for date formatting
I18n.prototype.getLocale = function() {
    return this.currentLang === 'ru' ? 'ru-RU' : 'en-US';
};

// Helper function to format date with current locale
I18n.prototype.formatDate = function(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleString(this.getLocale(), { ...defaultOptions, ...options });
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
        // Note: languageSelector is now initialized by sidebar.js
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

