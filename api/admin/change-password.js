/**
 * Admin Password Change API
 * Endpoint: POST /api/admin/change-password
 * Changes admin password
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const auth = require('./auth');

const CREDENTIALS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-credentials.json');

// Default credentials (same as in auth.js)
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
            // File doesn't exist, create it with default credentials
            console.log('[change-password] Credentials file not found, creating with default credentials');
            const hashedPassword = await bcrypt.hash(DEFAULT_CREDENTIALS.password, 10);
            const defaultCreds = {
                username: DEFAULT_CREDENTIALS.username,
                password: hashedPassword,
                createdAt: new Date().toISOString()
            };
            await saveCredentials(defaultCreds);
            return defaultCreds;
        }
        console.error('Error loading credentials:', error);
        return null;
    }
}

// Save admin credentials
async function saveCredentials(credentials) {
    try {
        const dataDir = path.dirname(CREDENTIALS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving credentials:', error);
        return false;
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
    
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized - Missing or invalid Authorization header'
        });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = auth.verifyToken(token);
    if (!payload) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
    
    try {
        const { currentPassword, newPassword } = req.body || {};
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }
        
        // Load current credentials
        const credentials = await loadCredentials();
        if (!credentials) {
            return res.status(500).json({
                success: false,
                error: 'Failed to load credentials'
            });
        }
        
        // Verify current password
        // Check if password is hashed (starts with $2a$ or $2b$)
        let isValidPassword = false;
        if (credentials.password && (credentials.password.startsWith('$2a$') || credentials.password.startsWith('$2b$'))) {
            // Password is hashed, use bcrypt.compare
            isValidPassword = await bcrypt.compare(currentPassword, credentials.password);
        } else {
            // Password is plain text (fallback for migration from default credentials)
            isValidPassword = currentPassword === credentials.password || currentPassword === DEFAULT_CREDENTIALS.password;
        }
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update credentials
        credentials.password = hashedPassword;
        credentials.username = credentials.username || DEFAULT_CREDENTIALS.username;
        credentials.updatedAt = new Date().toISOString();
        if (!credentials.createdAt) {
            credentials.createdAt = new Date().toISOString();
        }
        
        const saved = await saveCredentials(credentials);
        if (!saved) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save new password'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

