/**
 * Public Content API
 * Endpoint: GET /api/content/:section
 * Returns content for FAQ, Privacy, Refund, Terms sections (publicly accessible)
 */

const fs = require('fs').promises;
const path = require('path');
const DEFAULT_CONTENT = require('../_lib/default-content');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'data', 'content');

// Allowed content sections
const ALLOWED_SECTIONS = ['faq', 'privacy', 'refund', 'terms'];

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
    
    // Extract section from URL path
    // URL format: /api/content/:section
    const urlParts = req.path.split('/').filter(Boolean);
    const section = urlParts[urlParts.length - 1]; // Last part is the section
    
    if (!section || !ALLOWED_SECTIONS.includes(section)) {
        return res.status(400).json({
            success: false,
            error: `Invalid section. Allowed sections: ${ALLOWED_SECTIONS.join(', ')}`
        });
    }
    
    try {
        const content = await loadContent(section);
        return res.status(200).json({
            success: true,
            section,
            content
        });
    } catch (error) {
        console.error(`Error handling ${section} content:`, error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
