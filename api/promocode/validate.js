/**
 * Promocode validation API
 * Endpoint: POST /api/promocode/validate
 * Validates promocode and returns discount information
 */

const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'settings.json');

// Load settings
async function loadSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { promocodes: [] };
        }
        console.error('Error loading settings:', error);
        return { promocodes: [] };
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        const { code, amount } = req.body || {};
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Promocode is required'
            });
        }
        
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }
        
        const settings = await loadSettings();
        const promocodes = settings.promocodes || [];
        
        // Находим промокод
        const promocode = promocodes.find(p => p.code.toUpperCase() === code.toUpperCase());
        
        if (!promocode) {
            return res.status(404).json({
                success: false,
                error: 'Promocode not found'
            });
        }
        
        // Проверяем статус
        if (promocode.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Promocode is inactive'
            });
        }
        
        // Проверяем дату начала
        const now = new Date();
        if (promocode.startDate) {
            const startDate = new Date(promocode.startDate);
            if (now < startDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Promocode is not yet active'
                });
            }
        }
        
        // Проверяем дату окончания
        if (promocode.validUntil) {
            const validUntil = new Date(promocode.validUntil);
            validUntil.setHours(23, 59, 59, 999); // Конец дня
            if (now > validUntil) {
                return res.status(400).json({
                    success: false,
                    error: 'Promocode has expired'
                });
            }
        }
        
        // Проверяем максимальное количество использований
        if (promocode.maxUses && (promocode.usedCount || 0) >= promocode.maxUses) {
            return res.status(400).json({
                success: false,
                error: 'Promocode usage limit reached'
            });
        }
        
        // Вычисляем скидку
        let discountAmount = 0;
        let finalAmount = amount;
        
        if (promocode.type === 'percent') {
            discountAmount = (amount * promocode.discount) / 100;
            finalAmount = amount - discountAmount;
        } else if (promocode.type === 'fixed') {
            discountAmount = Math.min(promocode.discount, amount); // Не больше суммы заказа
            finalAmount = amount - discountAmount;
        }
        
        // Убеждаемся, что финальная сумма не отрицательная
        if (finalAmount < 0) {
            finalAmount = 0;
            discountAmount = amount;
        }
        
        return res.status(200).json({
            success: true,
            promocode: {
                code: promocode.code,
                type: promocode.type,
                discount: promocode.discount
            },
            discount: {
                amount: discountAmount,
                originalAmount: amount,
                finalAmount: finalAmount
            }
        });
        
    } catch (error) {
        console.error('Error validating promocode:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

