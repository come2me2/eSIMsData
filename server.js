/**
 * Express Server for eSIMsData API
 * Развертывание на VPS Contabo
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Статические файлы из public директории
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    etag: true,
    lastModified: true
}));

// API Routes - eSIM Go endpoints
const apiRoutes = {
    '/api/esimgo/countries': require('./api/esimgo/countries'),
    '/api/esimgo/plans': require('./api/esimgo/plans'),
    '/api/esimgo/region-plans': require('./api/esimgo/region-plans'),
    '/api/esimgo/catalogue': require('./api/_lib/esimgo/catalogue'),
    '/api/esimgo/catalogue-processed': require('./api/esimgo/catalogue-processed'),
    '/api/esimgo/find-bundle': require('./api/esimgo/find-bundle'),
    '/api/esimgo/order': require('./api/esimgo/order'),
    '/api/esimgo/status': require('./api/esimgo/status'),
    '/api/esimgo/assignments': require('./api/esimgo/assignments'),
    '/api/esimgo/test-africa': require('./api/_lib/esimgo/test-africa'),
    '/api/esimgo/test-cyprus': require('./api/_lib/esimgo/test-cyprus'),
    '/api/validate-telegram': require('./api/validate-telegram'),
    '/api/webhook': require('./api/webhook')
};

// Регистрация API routes
Object.entries(apiRoutes).forEach(([route, handler]) => {
    // Поддержка всех методов для каждого endpoint
    app.all(route, async (req, res) => {
        try {
            await handler(req, res);
        } catch (error) {
            console.error(`Error in ${route}:`, error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: error.message || 'Internal server error'
                });
            }
        }
    });
    console.log(`✓ Registered route: ${route}`);
});

// Fallback для всех остальных маршрутов - отдаем index.html (SPA)
app.get('*', (req, res) => {
    // Если это API запрос, вернуть 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }
    // Иначе отдать index.html для SPA
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔑 ESIMGO_API_KEY: ${process.env.ESIMGO_API_KEY ? '✓ Set' : '✗ Not set'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n📋 Available API endpoints:`);
    Object.keys(apiRoutes).forEach(route => {
        console.log(`   ${route}`);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

