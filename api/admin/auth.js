/**
 * Admin Panel Authentication API
 * Endpoint: POST /api/admin/auth/login
 */

// Простая аутентификация (в продакшене использовать JWT + bcrypt)
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Простой JWT токен (в продакшене использовать библиотеку jsonwebtoken)
function generateToken() {
    const payload = {
        username: ADMIN_CREDENTIALS.username,
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
            
            // Проверяем credentials
            if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                const token = generateToken();
                
                return res.status(200).json({
                    success: true,
                    token,
                    username: ADMIN_CREDENTIALS.username
                });
            } else {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
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

