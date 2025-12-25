/**
 * Public Settings API - для получения настроек наценок (без авторизации)
 * Endpoint: GET /api/settings/public
 */

const fs = require('fs').promises;
const path = require('path');

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
                    base: 1.29,
                    defaultMultiplier: 1.29
                },
                paymentMethods: {
                    telegramStars: { 
                        enabled: true,
                        markup: 1.05,
                        markupMultiplier: 1.05
                    },
                    crypto: { 
                        enabled: true,
                        markup: 1.0,
                        markupMultiplier: 1.0
                    },
                    bankCard: { 
                        enabled: true,
                        markup: 1.1,
                        markupMultiplier: 1.1
                    }
                }
            };
        }
        console.error('Error loading settings:', error);
        throw error;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        const settings = await loadSettings();
        
        // Возвращаем только настройки наценок (публичные данные)
        return res.status(200).json({
            success: true,
            markup: settings.markup || {
                enabled: true,
                base: 1.29,
                defaultMultiplier: 1.29
            },
            paymentMethods: settings.paymentMethods || {
                telegramStars: { enabled: true, markup: 1.05, markupMultiplier: 1.05 },
                crypto: { enabled: true, markup: 1.0, markupMultiplier: 1.0 },
                bankCard: { enabled: true, markup: 1.1, markupMultiplier: 1.1 }
            }
        });
    } catch (error) {
        console.error('Error in public settings API:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to load settings'
        });
    }
};

