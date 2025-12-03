/**
 * eSIM Go API - Получение деталей установки eSIM (QR код, SMDP+ адрес)
 * Endpoint: GET /api/esimgo/assignments
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/eSIMs
 */

const esimgoClient = require('./client');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { reference, additionalFields } = req.query;
        
        if (!reference) {
            return res.status(400).json({
                success: false,
                error: 'reference parameter is required (Order Reference or Apply Reference)'
            });
        }
        
        console.log('Getting eSIM assignments:', { reference, additionalFields });
        
        // Получаем детали установки eSIM
        const assignments = await esimgoClient.getESIMAssignments(reference, additionalFields);
        
        console.log('Assignments received:', {
            hasIccid: !!assignments.iccid,
            hasMatchingId: !!assignments.matchingId,
            hasSmdpAddress: !!assignments.smdpAddress,
            profileStatus: assignments.profileStatus
        });
        
        return res.status(200).json({
            success: true,
            data: assignments
        });
        
    } catch (error) {
        console.error('Assignments API error:', {
            message: error.message,
            stack: error.stack,
            reference: req.query.reference
        });
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get eSIM assignments',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

