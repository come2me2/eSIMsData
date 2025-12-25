/**
 * Admin Panel Settings API
 * Endpoint: GET /api/admin/settings - получить настройки
 * Endpoint: PUT /api/admin/settings - обновить настройки
 * 
 * Управление:
 * - Наценка к товарам (markup)
 * - Способы оплаты (payment methods)
 * - Промокоды (promocodes)
 */

const fs = require('fs').promises;
const path = require('path');
const auth = require('./auth');

const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-settings.json');

// Загрузить настройки
async function loadSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Возвращаем настройки по умолчанию
            return {
                markup: {
                    enabled: true,
                    defaultPercent: 20, // 20% наценка по умолчанию
                    countryMarkups: {} // { "US": 15, "GB": 25 }
                },
                paymentMethods: {
                    telegramStars: { enabled: true },
                    crypto: { enabled: true },
                    bankCard: { enabled: true }
                },
                promocodes: [] // [{ code: "PROMO10", discount: 10, type: "percent", validUntil: "2024-12-31" }]
            };
        }
        console.error('Error loading settings:', error);
        throw error;
    }
}

// Сохранить настройки
async function saveSettings(settings) {
    const dataDir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Проверка аутентификации
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    
    const token = authHeader.substring(7);
    const payload = auth.verifyToken(token);
    
    if (!payload) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
    
    try {
        const urlParts = req.path.split('/').filter(Boolean);
        const section = urlParts[urlParts.length - 1]; // markup, paymentMethods, promocodes
        
        // GET /api/admin/settings - получить все настройки
        if (req.method === 'GET' && !section) {
            const settings = await loadSettings();
            return res.status(200).json({
                success: true,
                settings
            });
        }
        
        // GET /api/admin/settings/:section - получить конкретную секцию
        if (req.method === 'GET' && section) {
            const settings = await loadSettings();
            if (settings[section] !== undefined) {
                return res.status(200).json({
                    success: true,
                    [section]: settings[section]
                });
            }
            return res.status(404).json({
                success: false,
                error: 'Section not found'
            });
        }
        
        // PUT /api/admin/settings - обновить настройки
        if (req.method === 'PUT' && !section) {
            const updates = req.body || {};
            const settings = await loadSettings();
            
            // Обновляем только переданные поля
            Object.assign(settings, updates);
            
            await saveSettings(settings);
            
            return res.status(200).json({
                success: true,
                settings
            });
        }
        
        // PUT /api/admin/settings/:section - обновить конкретную секцию
        if (req.method === 'PUT' && section) {
            const updates = req.body || {};
            const settings = await loadSettings();
            
            if (settings[section] === undefined) {
                return res.status(404).json({
                    success: false,
                    error: 'Section not found'
                });
            }
            
            Object.assign(settings[section], updates);
            await saveSettings(settings);
            
            return res.status(200).json({
                success: true,
                [section]: settings[section]
            });
        }
        
        // POST /api/admin/settings/promocodes - создать промокод
        if (req.method === 'POST' && section === 'promocodes') {
            const { code, discount, type, validUntil, maxUses, usedCount = 0 } = req.body || {};
            
            if (!code || !discount || !type) {
                return res.status(400).json({
                    success: false,
                    error: 'Code, discount, and type are required'
                });
            }
            
            const settings = await loadSettings();
            
            // Проверяем, что промокод не существует
            if (settings.promocodes.find(p => p.code === code)) {
                return res.status(400).json({
                    success: false,
                    error: 'Promocode already exists'
                });
            }
            
            const promocode = {
                code,
                discount: parseFloat(discount),
                type, // "percent" or "fixed"
                validUntil: validUntil || null,
                maxUses: maxUses || null,
                usedCount: usedCount || 0,
                createdAt: new Date().toISOString()
            };
            
            settings.promocodes.push(promocode);
            await saveSettings(settings);
            
            return res.status(200).json({
                success: true,
                promocode
            });
        }
        
        // DELETE /api/admin/settings/promocodes/:code - удалить промокод
        if (req.method === 'DELETE' && section === 'promocodes') {
            const code = urlParts[urlParts.length - 1];
            const settings = await loadSettings();
            
            const index = settings.promocodes.findIndex(p => p.code === code);
            if (index === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Promocode not found'
                });
            }
            
            settings.promocodes.splice(index, 1);
            await saveSettings(settings);
            
            return res.status(200).json({
                success: true
            });
        }
        
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
        
    } catch (error) {
        console.error('Error in admin settings API:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};


