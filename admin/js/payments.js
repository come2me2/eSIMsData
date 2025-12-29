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
                // Initialize toggle switches after rendering
                setTimeout(() => {
                    initToggleSwitches();
                }, 100);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorSaving'));
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
        
        // Promocodes
        console.log('[Payments] Loading promocodes:', settings.promocodes);
        if (settings.promocodes) {
            this.renderPromocodes(settings.promocodes);
        } else {
            this.renderPromocodes([]);
        }
        
        // Add handlers for automatic total markup recalculation
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
        
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        if (isEnabled) {
            card.classList.remove('opacity-60', 'bg-gray-50');
            card.classList.add('border-blue-200', 'bg-blue-50');
            status.textContent = '✓ ' + t('active');
            status.classList.remove('text-red-600');
            status.classList.add('text-green-600');
            markupFields.style.display = 'block';
        } else {
            card.classList.remove('border-blue-200', 'bg-blue-50');
            card.classList.add('opacity-60', 'bg-gray-50');
            status.textContent = '✗ ' + t('inactive');
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
        
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        document.getElementById('totalMarkupTelegramStars').textContent = 
            `${t('totalMarkup')}: ${totalTelegramStars.toFixed(4)} (${percentTelegramStars > 0 ? '+' : ''}${percentTelegramStars}%)`;
        document.getElementById('totalMarkupCrypto').textContent = 
            `${t('totalMarkup')}: ${totalCrypto.toFixed(4)} (${percentCrypto > 0 ? '+' : ''}${percentCrypto}%)`;
        document.getElementById('totalMarkupBankCard').textContent = 
            `${t('totalMarkup')}: ${totalBankCard.toFixed(4)} (${percentBankCard > 0 ? '+' : ''}${percentBankCard}%)`;
    },
    
    // Save base markup
    async saveBaseMarkup() {
        try {
            const enabled = document.getElementById('markupEnabled').checked;
            const baseMarkup = parseFloat(document.getElementById('baseMarkup').value);
            
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            if (isNaN(baseMarkup) || baseMarkup < 1) {
                this.showError('Base markup must be at least 1.0');
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
                this.showSuccess(t('changesSaved'));
                this.loadSettings();
            } else {
                this.showError(data.error || t('errorSaving'));
            }
        } catch (error) {
            console.error('Error saving base markup:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorSaving'));
        }
    },
    
    // Update base markup toggle (called when toggle is changed)
    updateBaseMarkupToggle() {
        const enabled = document.getElementById('markupEnabled').checked;
        const baseMarkupField = document.getElementById('baseMarkup');
        
        // Visual feedback - can add styling
        if (enabled) {
            baseMarkupField.disabled = false;
            baseMarkupField.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            baseMarkupField.disabled = true;
            baseMarkupField.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        // Update total markups if they depend on base markup
        this.updateTotalMarkups();
    },
    
    // Save payment methods
    async savePaymentMethods() {
        try {
            const markupTelegramStars = parseFloat(document.getElementById('markupTelegramStars').value);
            const markupCrypto = parseFloat(document.getElementById('markupCrypto').value);
            const markupBankCard = parseFloat(document.getElementById('markupBankCard').value);
            
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            if (isNaN(markupTelegramStars) || markupTelegramStars < 1) {
                this.showError('Telegram Stars markup must be at least 1.0');
                return;
            }
            if (isNaN(markupCrypto) || markupCrypto < 1) {
                this.showError('Cryptocurrencies markup must be at least 1.0');
                return;
            }
            if (isNaN(markupBankCard) || markupBankCard < 1) {
                this.showError('Bank Cards markup must be at least 1.0');
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
            
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            if (data.success) {
                this.showSuccess(t('changesSaved'));
                this.loadSettings();
            } else {
                this.showError(data.error || t('errorSaving'));
            }
        } catch (error) {
            console.error('Error saving payment methods:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorSaving'));
        }
    },
    
    // Render promocodes table
    renderPromocodes(promocodes) {
        const tbody = document.getElementById('promocodesTable');
        if (!tbody) {
            console.error('[Payments] promocodesTable element not found');
            return;
        }
        
        console.log('[Payments] Rendering promocodes:', promocodes);
        
        if (!promocodes || promocodes.length === 0) {
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">${t('noPromocodes')}</td></tr>`;
            return;
        }
        
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        tbody.innerHTML = promocodes.map(promo => {
            const locale = 'en-US';
            const startDate = promo.startDate 
                ? new Date(promo.startDate).toLocaleDateString(locale)
                : 'Immediately';
            const validUntil = promo.validUntil 
                ? new Date(promo.validUntil).toLocaleDateString(locale)
                : 'No limit';
            const maxUses = promo.maxUses ? `${promo.usedCount || 0} / ${promo.maxUses}` : `${promo.usedCount || 0} / ∞`;
            const discountText = promo.type === 'percent' 
                ? `${promo.discount}%` 
                : `$${promo.discount}`;
            const status = promo.status === 'active' ? t('active') : t('inactive');
            const statusColor = promo.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800';
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${promo.code}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${discountText}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${promo.type === 'percent' ? t('percent') : t('fixed')}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${startDate}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${validUntil}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${maxUses}</td>
                    <td class="px-4 py-3 text-sm">
                        <span class="px-2 py-1 text-xs font-medium rounded ${statusColor}">${status}</span>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <button onclick="Payments.editPromocode('${promo.code}')" class="text-blue-600 hover:text-blue-800 font-medium mr-3">
                            ${t('edit')}
                        </button>
                        <button onclick="Payments.deletePromocode('${promo.code}')" class="text-red-600 hover:text-red-800 font-medium">
                            ${t('delete')}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Show promocode modal
    showPromocodeModal(promocode = null) {
        const modal = document.getElementById('promocodeModal');
        const form = document.getElementById('promocodeForm');
        const editMode = document.getElementById('promocodeEditMode');
        const editCode = document.getElementById('promocodeEditCode');
        const submitBtn = document.getElementById('promocodeSubmitBtn');
        const title = modal.querySelector('h3');
        
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        if (promocode) {
            // Edit mode
            editMode.value = 'true';
            editCode.value = promocode.code;
            title.textContent = t('edit') + ' ' + t('promocodes').toLowerCase();
            submitBtn.textContent = t('saveChanges');
            
            document.getElementById('promocodeCode').value = promocode.code;
            document.getElementById('promocodeCode').disabled = true; // Code cannot be changed
            document.getElementById('promocodeDiscount').value = promocode.discount;
            document.getElementById('promocodeType').value = promocode.type;
            // Format dates for date inputs (YYYY-MM-DD format)
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                return date.toISOString().split('T')[0];
            };
            document.getElementById('promocodeStartDate').value = formatDateForInput(promocode.startDate);
            document.getElementById('promocodeValidUntil').value = formatDateForInput(promocode.validUntil);
            document.getElementById('promocodeMaxUses').value = promocode.maxUses || '';
            document.getElementById('promocodeStatus').value = promocode.status || 'active';
        } else {
            // Create mode
            editMode.value = 'false';
            editCode.value = '';
            title.textContent = t('addPromocode');
            submitBtn.textContent = t('createPromocode');
            form.reset();
            document.getElementById('promocodeCode').disabled = false;
        }
        
        modal.classList.remove('hidden');
    },
    
    // Close promocode modal
    closePromocodeModal() {
        const modal = document.getElementById('promocodeModal');
        const form = document.getElementById('promocodeForm');
        
        modal.classList.add('hidden');
        
        // Clear form
        form.reset();
        document.getElementById('promocodeCode').disabled = false;
        document.getElementById('promocodeEditMode').value = 'false';
        document.getElementById('promocodeEditCode').value = '';
    },
    
    // Create or update promocode
    async createPromocode(e) {
        e.preventDefault();
        
        try {
            const editMode = document.getElementById('promocodeEditMode').value === 'true';
            const code = document.getElementById('promocodeCode').value;
            const discount = parseFloat(document.getElementById('promocodeDiscount').value);
            const type = document.getElementById('promocodeType').value;
            const startDate = document.getElementById('promocodeStartDate').value || null;
            const validUntil = document.getElementById('promocodeValidUntil').value || null;
            const maxUses = document.getElementById('promocodeMaxUses').value 
                ? parseInt(document.getElementById('promocodeMaxUses').value) 
                : null;
            const status = document.getElementById('promocodeStatus').value;
            
            const promocodeData = {
                code,
                discount,
                type,
                startDate,
                validUntil,
                maxUses,
                status
            };
            
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            let response;
            if (editMode) {
                // Editing
                const editCodeValue = document.getElementById('promocodeEditCode').value;
                response = await Auth.authenticatedFetch(`/api/admin/settings/promocodes/${editCodeValue}`, {
                    method: 'PUT',
                    body: JSON.stringify(promocodeData)
                });
            } else {
                // Creating
                response = await Auth.authenticatedFetch('/api/admin/settings/promocodes', {
                    method: 'POST',
                    body: JSON.stringify(promocodeData)
                });
            }
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.closePromocodeModal();
                await this.loadSettings();
                this.showSuccess(t('changesSaved'));
            } else {
                this.showError(data.error || t('errorSaving'));
            }
        } catch (error) {
            console.error('Error saving promocode:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError(t('errorSaving'));
        }
    },
    
    // Edit promocode
    async editPromocode(code) {
        try {
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            const settings = this.currentSettings;
            if (!settings || !settings.promocodes) {
                this.showError('Settings not loaded');
                return;
            }
            
            const promocode = settings.promocodes.find(p => p.code === code);
            if (!promocode) {
                this.showError('Promocode not found');
                return;
            }
            
            this.showPromocodeModal(promocode);
        } catch (error) {
            console.error('Error loading promocode for edit:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError('Error loading promocode');
        }
    },
    
    // Delete promocode
    async deletePromocode(code) {
        const t = (key) => window.i18n ? window.i18n.t(key) : key;
        if (!confirm(`Delete promocode ${code}?`)) return;
        
        try {
            const response = await Auth.authenticatedFetch(`/api/admin/settings/promocodes/${code}`, {
                method: 'DELETE'
            });
            
            if (!response) return;
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Promocode deleted');
                this.loadSettings();
            } else {
                this.showError(data.error || 'Error deleting promocode');
            }
        } catch (error) {
            console.error('Error deleting promocode:', error);
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            this.showError('Error deleting promocode');
        }
    },
    
    // Show success message
    showSuccess(message) {
        // Simple implementation via alert, can be improved
        alert('✓ ' + message);
    },
    
    // Show error message
    showError(message) {
        alert('✗ ' + message);
    }
};

// Initialize toggle switches to ensure proper styling
function initToggleSwitches() {
    const toggles = document.querySelectorAll('input[type="checkbox"].peer, input[type="checkbox"][id^="payment"], input[type="checkbox"][id="markupEnabled"]');
    
    function updateToggleStyle(toggle) {
        const toggleDiv = toggle.nextElementSibling;
        if (toggleDiv && toggleDiv.classList.contains('rounded-full')) {
            // Add unique class to toggleDiv for selectors
            if (!toggleDiv.classList.contains('toggle-switch-' + toggle.id)) {
                toggleDiv.classList.add('toggle-switch-' + toggle.id);
            }
            
            if (toggle.checked) {
                toggleDiv.style.setProperty('background-color', '#16a34a', 'important'); // green-600
                // Add class for moving right
                toggleDiv.classList.add('toggle-checked');
                // Calculate correct offset based on screen size
                const width = toggleDiv.offsetWidth || 44; // default w-11 = 44px for desktop
                let translateX;
                if (width <= 36) {
                    translateX = 18; // for small screens (36px width)
                } else if (width <= 40) {
                    translateX = 20; // for medium screens (40px width)
                } else {
                    translateX = 20; // for large screens/desktop (44px width = w-11)
                }
                toggleDiv.style.setProperty('--toggle-translate', `${translateX}px`);
                toggleDiv.setAttribute('data-checked', 'true');
                toggleDiv.setAttribute('data-translate-x', `${translateX}`);
                
                // Apply style directly by adding styles to element
                // Create or update style element for ::after
                let styleId = 'toggle-style-' + toggle.id;
                let styleElement = document.getElementById(styleId);
                if (!styleElement) {
                    styleElement = document.createElement('style');
                    styleElement.id = styleId;
                    document.head.appendChild(styleElement);
                }
                // Use unique class for selector
                // Apply for all screen sizes, including desktop
                styleElement.textContent = `
                    .toggle-switch-${toggle.id}.toggle-checked::after,
                    input#${toggle.id}:checked ~ .toggle-switch-${toggle.id}::after,
                    #paymentCardTelegramStars input#${toggle.id}:checked ~ div.rounded-full::after,
                    #paymentCardCrypto input#${toggle.id}:checked ~ div.rounded-full::after,
                    #paymentCardBankCard input#${toggle.id}:checked ~ div.rounded-full::after,
                    body label.relative input#${toggle.id}:checked ~ div.rounded-full::after,
                    body input#${toggle.id}.peer:checked ~ div.rounded-full::after {
                        transform: translateX(${translateX}px) !important;
                        -webkit-transform: translateX(${translateX}px) !important;
                        -moz-transform: translateX(${translateX}px) !important;
                        -ms-transform: translateX(${translateX}px) !important;
                        -o-transform: translateX(${translateX}px) !important;
                        border-color: white !important;
                    }
                    
                    /* Desktop - explicit rules */
                    @media (min-width: 1025px) {
                        .toggle-switch-${toggle.id}.toggle-checked::after,
                        input#${toggle.id}:checked ~ .toggle-switch-${toggle.id}::after {
                            transform: translateX(${translateX}px) !important;
                            -webkit-transform: translateX(${translateX}px) !important;
                        }
                    }
                `;
            } else {
                toggleDiv.style.setProperty('background-color', '#e5e7eb', 'important'); // gray-200
                toggleDiv.classList.remove('toggle-checked');
                toggleDiv.style.setProperty('--toggle-translate', '0px');
                toggleDiv.setAttribute('data-checked', 'false');
                toggleDiv.removeAttribute('data-translate-x');
                
                // Remove dynamic style element
                let styleId = 'toggle-style-' + toggle.id;
                let styleElement = document.getElementById(styleId);
                if (styleElement) {
                    styleElement.remove();
                }
            }
        }
    }
    
    toggles.forEach(toggle => {
        // Update on change
        toggle.addEventListener('change', function() {
            updateToggleStyle(this);
        });
        
        // Set initial state
        updateToggleStyle(toggle);
        
        // Also watch for programmatic changes
        const observer = new MutationObserver(() => {
            updateToggleStyle(toggle);
        });
        observer.observe(toggle, { attributes: true, attributeFilter: ['checked'] });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Payments.loadSettings();
    
    // Initialize toggle switches after settings are loaded
    setTimeout(() => {
        initToggleSwitches();
    }, 500);
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Auth.logout();
        });
    }
    
    // Promocode form submit handler
    const promocodeForm = document.getElementById('promocodeForm');
    if (promocodeForm) {
        promocodeForm.addEventListener('submit', (e) => Payments.createPromocode(e));
    }
    
    // Close modal on overlay click
    const promocodeModal = document.getElementById('promocodeModal');
    if (promocodeModal) {
        promocodeModal.addEventListener('click', (e) => {
            if (e.target === promocodeModal) {
                Payments.closePromocodeModal();
            }
        });
    }
});



