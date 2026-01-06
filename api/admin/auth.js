/**
 * Admin Panel Authentication API
 * Endpoint: POST /api/admin/auth/login
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const CREDENTIALS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-credentials.json');

// Default credentials (same as in change-password.js)
const DEFAULT_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Load admin credentials
async function loadCredentials() {
    try {
        // Check if file exists
        await fs.access(CREDENTIALS_FILE);
        const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return default credentials
            return {
                username: DEFAULT_CREDENTIALS.username,
                password: DEFAULT_CREDENTIALS.password, // Plain text for default
                createdAt: new Date().toISOString()
            };
        }
        console.error('Error loading credentials:', error);
        return null;
    }
}

// Простой JWT токен (в продакшене использовать библиотеку jsonwebtoken)
function generateToken(username) {
    const payload = {
        username: username || DEFAULT_CREDENTIALS.username,
        timestamp: Date.now(),
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
    };
    
    // Простая базовая кодировка (в продакшене использовать настоящий JWT)
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        
        // Проверяем срок действия
        if (payload.exp && payload.exp < Date.now()) {
            return null;
        }
        
        return payload;
    } catch (error) {
        return null;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Проверяем путь (может быть /login или /api/admin/auth/login)
    const isLoginPath = req.path === '/login' || req.path.endsWith('/login') || req.url.includes('/login');
    
    if (req.method === 'POST' && isLoginPath) {
        try {
            const { username, password } = req.body || {};
            
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username and password are required'
                });
            }
            
            // Load credentials from file
            const credentials = await loadCredentials();
            if (!credentials) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to load credentials'
                });
            }
            
            // Check username
            if (username !== credentials.username && username !== DEFAULT_CREDENTIALS.username) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Verify password
            // Check if password is hashed (starts with $2a$ or $2b$)
            let isValidPassword = false;
            if (credentials.password && (credentials.password.startsWith('$2a$') || credentials.password.startsWith('$2b$'))) {
                // Password is hashed, use bcrypt.compare
                isValidPassword = await bcrypt.compare(password, credentials.password);
            } else {
                // Password is plain text (fallback for default credentials or migration)
                isValidPassword = password === credentials.password || password === DEFAULT_CREDENTIALS.password;
            }
            
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Generate token
            const currentUsername = credentials.username || DEFAULT_CREDENTIALS.username;
            const token = generateToken(currentUsername);
            
            return res.status(200).json({
                success: true,
                token,
                username: currentUsername
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    
    // Middleware для проверки токена
    if (req.method === 'GET' || req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }
        
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        
        if (!payload) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
        // Добавляем информацию о пользователе в request
        req.admin = payload;
    }
    
    // Если это не login endpoint, возвращаем 404
    return res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
};

// Экспортируем функцию проверки токена для использования в других модулях
module.exports.verifyToken = verifyToken;



