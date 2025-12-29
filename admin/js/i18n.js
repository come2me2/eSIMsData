// Language translations - English only
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
        totalMarkup: "Total markup",
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
        noPromocodes: "No promo codes",
        serverError: "Server error",
        
        // Actions & Buttons
        details: "Details",
        viewDetails: "View Details",
        
        // Order Modal
        closeModal: "Close",
        
        // Dates
        monthShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        
        // Order Details Modal
        orderInfo: "Order Information",
        orderId: "Order ID",
        orderStatus: "Order Status",
        esimData: "eSIM Data",
        qrCode: "QR Code",
        qrCodeNotAvailable: "QR code not available",
        downloadQR: "Download QR",
        copy: "Copy",
        sendESIMTelegram: "Send eSIM to Telegram",
        totalOrdersCount: "Total Orders",
        back: "Back",
        next: "Next",
        notSpecified: "Not specified",
        errorLoadingOrders: "Error loading orders",
        orderNotFound: "Order not found",
        errorLoadingOrderDetails: "Error loading order details",
        statusUpdated: "Order status updated",
        errorUpdatingStatus: "Error updating status",
        copiedToClipboard: "Copied to clipboard",
        errorCopying: "Error copying",
        sendESIMConfirm: "Send eSIM data to user in Telegram?",
        esimSent: "eSIM sent to user in Telegram",
        errorSendingESIM: "Error sending eSIM",
        qrCodeDownloaded: "QR code downloaded",
        errorDownloadingQR: "Error downloading QR code",
        filterByUserLabel: "Filter by user",
        errorLoadingUsers: "Error loading users",
        userNotFound: "User not found",
        errorLoadingUserDetails: "Error loading user details",
        showAll: "Show all",
        more: "more",
        usersManagement: "View Telegram users and their orders"
    }
};

// Language manager - English only
class I18n {
    constructor() {
        this.currentLang = 'en'; // Always English
        this.translations = translations;
    }
    
    setLanguage(lang) {
        // Language switching disabled - always English
        return;
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
        
        // Update HTML lang attribute to 'en' for English calendar
        document.documentElement.lang = 'en';
        document.documentElement.setAttribute('lang', 'en');
    }
    
    // Helper function to get locale for date formatting (always English)
    getLocale() {
        return 'en-US';
    }

    // Helper function to format date with current locale
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleString(this.getLocale(), { ...defaultOptions, ...options });
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

