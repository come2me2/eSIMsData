/**
 * API Endpoint: GET /api/esimgo/bundles?iccid=...
 * Получает информацию о bundle usage для eSIM
 */

const esimgoClient = require('../_lib/esimgo/client');

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
        const { iccid } = req.query;
        
        if (!iccid) {
            return res.status(400).json({
                success: false,
                error: 'ICCID is required'
            });
        }
        
        console.log('📦 Getting bundles for eSIM:', iccid);
        
        // Получаем список bundles для eSIM
        const bundlesResponse = await esimgoClient.getESIMBundles(iccid);
        
        console.log('📦 Bundles response:', {
            hasBundles: !!bundlesResponse?.bundles,
            bundlesCount: bundlesResponse?.bundles?.length || 0
        });
        
        if (!bundlesResponse || !bundlesResponse.bundles || bundlesResponse.bundles.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No bundles found for this eSIM'
            });
        }
        
        // Находим активный bundle (Active или Queued)
        const activeBundle = bundlesResponse.bundles.find(bundle => {
            if (!bundle.assignments || bundle.assignments.length === 0) {
                return false;
            }
            
            // Находим активное assignment
            const activeAssignment = bundle.assignments.find(assignment => 
                assignment.bundleState === 'Active' || 
                assignment.bundleState === 'Queued' ||
                assignment.bundleState === 'Processing'
            );
            
            return !!activeAssignment;
        });
        
        if (!activeBundle || !activeBundle.assignments || activeBundle.assignments.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active bundle found for this eSIM'
            });
        }
        
        // Находим активное assignment (приоритет: Active > Queued > Processing)
        const activeAssignment = activeBundle.assignments
            .filter(assignment => 
                assignment.bundleState === 'Active' || 
                assignment.bundleState === 'Queued' ||
                assignment.bundleState === 'Processing'
            )
            .sort((a, b) => {
                const priority = { 'Active': 1, 'Queued': 2, 'Processing': 3 };
                return (priority[a.bundleState] || 99) - (priority[b.bundleState] || 99);
            })[0];
        
        if (!activeAssignment) {
            return res.status(404).json({
                success: false,
                error: 'No active assignment found'
            });
        }
        
        // Конвертируем байты в MB
        const initialQuantityBytes = activeAssignment.initialQuantity || 0;
        const remainingQuantityBytes = activeAssignment.remainingQuantity || 0;
        const usedQuantityBytes = initialQuantityBytes - remainingQuantityBytes;
        
        const initialQuantityMB = initialQuantityBytes / (1024 * 1024);
        const remainingQuantityMB = remainingQuantityBytes / (1024 * 1024);
        const usedQuantityMB = usedQuantityBytes / (1024 * 1024);
        
        // Вычисляем дни
        const assignmentDate = activeAssignment.assignmentDateTime 
            ? new Date(activeAssignment.assignmentDateTime) 
            : null;
        
        // Пытаемся извлечь длительность из bundle name (например, "esim_1GB_7D_GB_V2" -> 7 дней)
        let bundleDuration = 7; // Default
        if (activeBundle.name) {
            const durationMatch = activeBundle.name.match(/(\d+)D/i);
            if (durationMatch) {
                bundleDuration = parseInt(durationMatch[1]);
            }
        }
        
        // Вычисляем оставшиеся дни
        let daysRemaining = bundleDuration;
        let expiresDate = null;
        
        if (assignmentDate) {
            const expirationDate = new Date(assignmentDate);
            expirationDate.setDate(expirationDate.getDate() + bundleDuration);
            expiresDate = expirationDate.toISOString();
            
            const now = new Date();
            const diffTime = expirationDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, diffDays);
        }
        
        const result = {
            success: true,
            data: {
                bundleName: activeBundle.name || '',
                bundleDescription: activeBundle.description || '',
                bundleState: activeAssignment.bundleState || 'Unknown',
                totalData: Math.round(initialQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                usedData: Math.round(usedQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                remainingData: Math.round(remainingQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                bundleDuration: bundleDuration, // days
                daysRemaining: daysRemaining, // days
                assignmentDate: assignmentDate ? assignmentDate.toISOString() : null,
                expiresDate: expiresDate,
                assignmentReference: activeAssignment.assignmentReference || null,
                unlimited: activeAssignment.unlimited || false
            }
        };
        
        console.log('✅ Bundle usage data:', {
            bundleName: result.data.bundleName,
            totalData: result.data.totalData,
            usedData: result.data.usedData,
            remainingData: result.data.remainingData,
            bundleState: result.data.bundleState,
            daysRemaining: result.data.daysRemaining
        });
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('❌ Error getting bundle usage:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get bundle usage data'
        });
    }
};
