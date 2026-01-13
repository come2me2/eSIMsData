/**
 * API Endpoint: GET /api/esimgo/bundles?iccid=...
 * Получает информацию о bundle usage для eSIM
 * Сначала проверяет данные из заказа (если они есть из callback'а),
 * затем делает запрос к eSIM Go API
 */

const fs = require('fs').promises;
const path = require('path');
const esimgoClient = require('../_lib/esimgo/client');

const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

/**
 * Найти заказ по ICCID и получить данные использования
 */
async function findOrderUsageByICCID(iccid) {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(data);
        
        for (const userId in allOrders) {
            const userOrders = allOrders[userId] || [];
            const order = userOrders.find(o => o.iccid === iccid);
            if (order && order.usage) {
                return order.usage;
            }
        }
    } catch (error) {
        // Игнорируем ошибки чтения файла
    }
    return null;
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
        const { iccid } = req.query;
        
        if (!iccid) {
            return res.status(400).json({
                success: false,
                error: 'ICCID is required'
            });
        }
        
        console.log('📦 Getting bundles for eSIM:', iccid);
        
        // Сначала проверяем данные из заказа (из callback'а)
        const orderUsage = await findOrderUsageByICCID(iccid);
        if (orderUsage && orderUsage.remainingQuantity !== undefined) {
            console.log('✅ Using usage data from order (callback data)');
            
            // Конвертируем байты в MB
            const initialQuantityMB = (orderUsage.initialQuantity || 0) / (1024 * 1024);
            const remainingQuantityMB = (orderUsage.remainingQuantity || 0) / (1024 * 1024);
            const usedQuantityMB = initialQuantityMB - remainingQuantityMB;
            
            // Вычисляем дни
            let bundleDuration = 7; // Default
            if (orderUsage.bundle) {
                const durationMatch = orderUsage.bundle.match(/(\d+)D/i);
                if (durationMatch) {
                    bundleDuration = parseInt(durationMatch[1]);
                }
            }
            
            let daysRemaining = bundleDuration;
            let expiresDate = null;
            
            if (orderUsage.endTime) {
                expiresDate = orderUsage.endTime;
                const expirationDate = new Date(orderUsage.endTime);
                const now = new Date();
                const diffTime = expirationDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysRemaining = Math.max(0, diffDays);
            }
            
            return res.status(200).json({
                success: true,
                data: {
                    bundleName: orderUsage.bundle || '',
                    bundleDescription: '',
                    bundleState: 'Active',
                    totalData: Math.round(initialQuantityMB * 100) / 100,
                    usedData: Math.round(usedQuantityMB * 100) / 100,
                    remainingData: Math.round(remainingQuantityMB * 100) / 100,
                    bundleDuration: bundleDuration,
                    daysRemaining: daysRemaining,
                    assignmentDate: orderUsage.startTime || null,
                    expiresDate: expiresDate,
                    assignmentReference: null,
                    unlimited: false,
                    source: 'callback' // Указываем источник данных
                }
            });
        }
        
        // Если данных из заказа нет, делаем запрос к eSIM Go API
        console.log('📡 Fetching bundle data from eSIM Go API...');
        
        // Получаем список bundles для eSIM
        const bundlesResponse = await esimgoClient.getESIMBundles(iccid);
        
        console.log('📦 Bundles response:', {
            hasBundles: !!bundlesResponse?.bundles,
            bundlesCount: bundlesResponse?.bundles?.length || 0,
            responseKeys: bundlesResponse ? Object.keys(bundlesResponse) : [],
            firstBundleKeys: bundlesResponse?.bundles?.[0] ? Object.keys(bundlesResponse.bundles[0]) : [],
            firstBundleStructure: bundlesResponse?.bundles?.[0] ? JSON.stringify(bundlesResponse.bundles[0], null, 2).substring(0, 500) : 'no bundle'
        });
        
        if (!bundlesResponse || !bundlesResponse.bundles || bundlesResponse.bundles.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No bundles found for this eSIM'
            });
        }
        
        // Находим активный bundle (Active или Queued)
        // Проверяем разные возможные структуры ответа
        const activeBundle = bundlesResponse.bundles.find(bundle => {
            // Вариант 1: bundle.assignments (массив assignments внутри bundle)
            if (bundle.assignments && Array.isArray(bundle.assignments) && bundle.assignments.length > 0) {
                const activeAssignment = bundle.assignments.find(assignment => 
                    assignment.bundleState === 'Active' || 
                    assignment.bundleState === 'Queued' ||
                    assignment.bundleState === 'Processing'
                );
                if (activeAssignment) {
                    console.log('✅ Found active assignment in bundle.assignments');
                    return true;
                }
            }
            
            // Вариант 2: bundle сам по себе является assignment (прямая структура)
            if (bundle.bundleState && (
                bundle.bundleState === 'Active' || 
                bundle.bundleState === 'Queued' ||
                bundle.bundleState === 'Processing'
            )) {
                console.log('✅ Found active bundle with direct bundleState');
                return true;
            }
            
            // Вариант 3: bundle имеет поля assignment напрямую
            if (bundle.initialQuantity !== undefined || bundle.remainingQuantity !== undefined) {
                console.log('✅ Found bundle with direct assignment fields');
                return true;
            }
            
            return false;
        });
        
        if (!activeBundle) {
            console.log('❌ No active bundle found. Available bundles:', bundlesResponse.bundles.map(b => ({
                name: b.name,
                hasAssignments: !!b.assignments,
                assignmentsCount: b.assignments?.length || 0,
                bundleState: b.bundleState,
                hasInitialQuantity: b.initialQuantity !== undefined,
                hasRemainingQuantity: b.remainingQuantity !== undefined
            })));
            return res.status(404).json({
                success: false,
                error: 'No active bundle found for this eSIM'
            });
        }
        
        // Извлекаем данные assignment в зависимости от структуры
        let activeAssignment = null;
        
        // Вариант 1: bundle.assignments (массив assignments внутри bundle)
        if (activeBundle.assignments && Array.isArray(activeBundle.assignments) && activeBundle.assignments.length > 0) {
            activeAssignment = activeBundle.assignments
                .filter(assignment => 
                    assignment.bundleState === 'Active' || 
                    assignment.bundleState === 'Queued' ||
                    assignment.bundleState === 'Processing'
                )
                .sort((a, b) => {
                    const priority = { 'Active': 1, 'Queued': 2, 'Processing': 3 };
                    return (priority[a.bundleState] || 99) - (priority[b.bundleState] || 99);
                })[0];
            
            if (activeAssignment) {
                console.log('✅ Using assignment from bundle.assignments array');
            }
        }
        
        // Вариант 2: bundle сам по себе является assignment (прямая структура)
        if (!activeAssignment && (activeBundle.bundleState === 'Active' || 
            activeBundle.bundleState === 'Queued' ||
            activeBundle.bundleState === 'Processing')) {
            activeAssignment = activeBundle;
            console.log('✅ Using bundle as direct assignment');
        }
        
        // Вариант 3: bundle имеет поля assignment напрямую (без bundleState, но с данными)
        if (!activeAssignment && (activeBundle.initialQuantity !== undefined || activeBundle.remainingQuantity !== undefined)) {
            activeAssignment = activeBundle;
            console.log('✅ Using bundle with direct assignment fields');
        }
        
        if (!activeAssignment) {
            console.log('❌ No active assignment found in bundle:', {
                bundleName: activeBundle.name,
                bundleKeys: Object.keys(activeBundle),
                hasAssignments: !!activeBundle.assignments,
                assignmentsCount: activeBundle.assignments?.length || 0
            });
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
            : (activeAssignment.assignmentDate ? new Date(activeAssignment.assignmentDate) : null);
        
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
                bundleName: activeBundle.name || activeAssignment.name || '',
                bundleDescription: activeBundle.description || activeAssignment.description || '',
                bundleState: activeAssignment.bundleState || 'Unknown',
                totalData: Math.round(initialQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                usedData: Math.round(usedQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                remainingData: Math.round(remainingQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                bundleDuration: bundleDuration, // days
                daysRemaining: daysRemaining, // days
                assignmentDate: assignmentDate ? assignmentDate.toISOString() : null,
                expiresDate: expiresDate,
                assignmentReference: activeAssignment.assignmentReference || activeAssignment.reference || null,
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
