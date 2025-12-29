/**
 * Admin Content Management API
 * Endpoint: GET/POST /api/admin/content/:section
 * Manages content for FAQ, Privacy, Refund, Terms sections
 */

const fs = require('fs').promises;
const path = require('path');
const auth = require('./auth');
const DEFAULT_CONTENT = require('../_lib/default-content');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'data', 'content');

// Allowed content sections
const ALLOWED_SECTIONS = ['faq', 'privacy', 'refund', 'terms'];

// Ensure content directory exists
async function ensureContentDir() {
    try {
        await fs.mkdir(CONTENT_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating content directory:', error);
    }
}

// Load content for a section
async function loadContent(section) {
    try {
        const filePath = path.join(CONTENT_DIR, `${section}.txt`);
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return default content
            return DEFAULT_CONTENT[section] || '';
        }
        console.error(`Error loading ${section} content:`, error);
        throw error;
    }
}

// Save content for a section
async function saveContent(section, content) {
    try {
        await ensureContentDir();
        const filePath = path.join(CONTENT_DIR, `${section}.txt`);
        await fs.writeFile(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving ${section} content:`, error);
        throw error;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Verify authentication
    const authResult = auth.verifyToken(req);
    if (!authResult.valid) {
        return res.status(401).json({
            success: false,
            error: authResult.error || 'Unauthorized'
        });
    }
    
    // Extract section from URL path
    // URL format: /api/admin/content/:section
    const urlParts = req.path.split('/').filter(Boolean);
    const section = urlParts[urlParts.length - 1]; // Last part is the section
    
    if (!section || !ALLOWED_SECTIONS.includes(section)) {
        return res.status(400).json({
            success: false,
            error: `Invalid section. Allowed sections: ${ALLOWED_SECTIONS.join(', ')}`
        });
    }
    
    try {
        if (req.method === 'GET') {
            // Get content
            const content = await loadContent(section);
            return res.status(200).json({
                success: true,
                section,
                content
            });
        } else if (req.method === 'POST') {
            // Save content
            const { content } = req.body || {};
            
            if (content === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'Content is required'
                });
            }
            
            await saveContent(section, content);
            
            return res.status(200).json({
                success: true,
                section,
                message: 'Content saved successfully'
            });
        } else {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed'
            });
        }
    } catch (error) {
        console.error(`Error handling ${section} content:`, error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

