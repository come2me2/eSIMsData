/**
 * API Endpoint: GET /api/esimgo/bundles?iccid=...
 * Получает информацию о bundle usage для eSIM
 * Сначала проверяет данные из заказа (если они есть из callback'а),
 * затем делает запрос к eSIM Go API
 */

const fs = require('fs').promises;
const path = require('path');
const esimgoClient = require('../_lib/esimgo/client');
const { sendSMSToESIM } = require('./send-sms');

const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

// Тексты SMS сообщений (дублируем из callback.js для использования здесь)
const SMS_MESSAGES = {
    '80': '80% of your data is used.\nOpen esimsdata Telegram Mini App and tap Extend to add more data.',
    '100': 'Your data is used up (100%).\nOpen esimsdata Telegram Mini App and tap Extend to continue.'
};

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
                return { order, userId, usage: order.usage };
            }
        }
    } catch (error) {
        // Игнорируем ошибки чтения файла
    }
    return null;
}

/**
 * Найти заказ по ICCID
 */
async function findOrderByICCID(iccid) {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(data);
        
        for (const userId in allOrders) {
            const userOrders = allOrders[userId] || [];
            const order = userOrders.find(o => o.iccid === iccid);
            if (order) {
                return { order, userId };
            }
        }
    } catch (error) {
        // Игнорируем ошибки чтения файла
    }
    return null;
}

/**
 * Сохранить заказ
 */
async function saveOrder(order, userId) {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(data);
        const userOrders = allOrders[userId] || [];
        
        const orderIndex = userOrders.findIndex(o => 
            o.orderReference === order.orderReference || 
            o.iccid === order.iccid
        );
        
        if (orderIndex !== -1) {
            userOrders[orderIndex] = order;
        } else {
            userOrders.push(order);
        }
        
        allOrders[userId] = userOrders;
        await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving order:', error);
        return false;
    }
}

/**
 * Рассчитать процент использования трафика
 */
function calculateUsagePercent(initialQuantity, remainingQuantity) {
    if (!initialQuantity || initialQuantity === 0) {
        return null;
    }
    
    const usedQuantity = initialQuantity - (remainingQuantity || 0);
    const usagePercent = (usedQuantity / initialQuantity) * 100;
    
    return Math.round(usagePercent * 100) / 100; // Округляем до 2 знаков после запятой
}

/**
 * Проверить, была ли уже отправлена SMS для данного порога
 */
function wasSmsSentForThreshold(order, threshold) {
    if (!order || !order.usage || !order.usage.smsSent) {
        return false;
    }
    
    const thresholdKey = threshold.toString();
    return order.usage.smsSent[thresholdKey]?.sent === true;
}

/**
 * Отметить SMS как отправленную для порога
 */
function markSmsAsSent(order, threshold) {
    if (!order.usage) {
        order.usage = {};
    }
    
    if (!order.usage.smsSent) {
        order.usage.smsSent = {};
    }
    
    const thresholdKey = threshold.toString();
    order.usage.smsSent[thresholdKey] = {
        sent: true,
        sentAt: new Date().toISOString()
    };
}

/**
 * Отправить SMS при достижении порога использования трафика
 */
async function sendUsageSMS(iccid, threshold) {
    const message = SMS_MESSAGES[threshold.toString()];
    
    if (!message) {
        console.warn(`⚠️ No SMS message template for threshold ${threshold}`);
        return false;
    }
    
    try {
        await sendSMSToESIM(iccid, message, 'eSIM');
        console.log(`✅ SMS sent to ICCID ${iccid} at ${threshold}% usage threshold`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send SMS to ICCID ${iccid} at ${threshold}% threshold:`, error.message);
        return false;
    }
}

/**
 * Проверить пороги использования и отправить SMS при необходимости
 * Вызывается при получении данных о bundle через API
 */
async function checkUsageThresholdsAndSendSMS(iccid, initialQuantity, remainingQuantity, unlimited) {
    // Пропускаем, если bundle неограниченный
    if (unlimited === true) {
        console.log('⏭️ Skipping SMS for unlimited bundle:', iccid);
        return;
    }
    
    // Рассчитываем процент использования
    const usagePercent = calculateUsagePercent(initialQuantity, remainingQuantity);
    
    if (usagePercent === null) {
        console.log('⏭️ Cannot calculate usage percent for ICCID:', iccid);
        return;
    }
    
    console.log('📊 Usage percent calculated (from bundles API):', {
        iccid,
        usagePercent: `${usagePercent}%`,
        initialQuantity,
        remainingQuantity
    });
    
    // Находим заказ для проверки статуса отправки SMS
    const orderData = await findOrderByICCID(iccid);
    
    if (!orderData) {
        console.warn('⚠️ Order not found for SMS check:', iccid);
        return;
    }
    
    const { order, userId } = orderData;
    
    // Пороги для проверки
    const thresholds = [80, 100];
    
    for (const threshold of thresholds) {
        // Проверяем, достигнут ли порог
        if (usagePercent >= threshold) {
            // Проверяем, не была ли уже отправлена SMS для этого порога
            if (!wasSmsSentForThreshold(order, threshold)) {
                console.log(`📱 Threshold ${threshold}% reached for ICCID ${iccid}, sending SMS...`);
                
                // Отправляем SMS
                const smsSent = await sendUsageSMS(iccid, threshold);
                
                if (smsSent) {
                    // Отмечаем SMS как отправленную
                    markSmsAsSent(order, threshold);
                    // Сохраняем обновленный заказ
                    await saveOrder(order, userId);
                }
            } else {
                console.log(`⏭️ SMS already sent for threshold ${threshold}% for ICCID ${iccid}`);
            }
        }
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
        const { iccid } = req.query;
        
        if (!iccid) {
            return res.status(400).json({
                success: false,
                error: 'ICCID is required'
            });
        }
        
        console.log('📦 Getting bundles for eSIM:', iccid);
        
        // Сначала проверяем данные из заказа (из callback'а)
        const orderUsageData = await findOrderUsageByICCID(iccid);
        if (orderUsageData && orderUsageData.usage && orderUsageData.usage.remainingQuantity !== undefined) {
            console.log('✅ Using usage data from order (callback data)');
            
            const orderUsage = orderUsageData.usage;
            
            // Конвертируем байты в MB
            const initialQuantityMB = (orderUsage.initialQuantity || 0) / (1024 * 1024);
            const remainingQuantityMB = (orderUsage.remainingQuantity || 0) / (1024 * 1024);
            const usedQuantityMB = initialQuantityMB - remainingQuantityMB;
            
            // Проверяем пороги и отправляем SMS при необходимости (fallback, если callback не пришел)
            await checkUsageThresholdsAndSendSMS(
                iccid,
                orderUsage.initialQuantity,
                orderUsage.remainingQuantity,
                orderUsage.unlimited || false
            );
            
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
            firstBundleStructure: bundlesResponse?.bundles?.[0] ? JSON.stringify(bundlesResponse.bundles[0], null, 2).substring(0, 1000) : 'no bundle',
            fullResponse: JSON.stringify(bundlesResponse, null, 2).substring(0, 2000)
        });
        
        if (!bundlesResponse || !bundlesResponse.bundles || bundlesResponse.bundles.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No bundles found for this eSIM'
            });
        }
        
        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: После Extend нужно суммировать все активные bundles
        // Находим ВСЕ активные bundles и суммируем их трафик
        console.log('🔍 Analyzing all bundles:', bundlesResponse.bundles.map((b, idx) => ({
            index: idx,
            name: b.name,
            bundleState: b.bundleState,
            hasAssignments: !!b.assignments,
            assignmentsCount: b.assignments?.length || 0,
            hasInitialQuantity: b.initialQuantity !== undefined,
            hasRemainingQuantity: b.remainingQuantity !== undefined,
            keys: Object.keys(b)
        })));
        
        // Функция для извлечения assignment из bundle
        const extractAssignments = (bundle) => {
            const assignments = [];
            
            // Вариант 1: bundle.assignments (массив assignments внутри bundle)
            if (bundle.assignments && Array.isArray(bundle.assignments) && bundle.assignments.length > 0) {
                bundle.assignments.forEach(assignment => {
                    const state = (assignment.bundleState || '').toLowerCase();
                    if (state === 'active' || state === 'queued' || state === 'processing' || 
                        assignment.initialQuantity !== undefined || assignment.remainingQuantity !== undefined) {
                        assignments.push(assignment);
                    }
                });
            }
            
            // Вариант 2: bundle сам по себе является assignment (прямая структура)
            if (bundle.bundleState) {
                const state = (bundle.bundleState || '').toLowerCase();
                if (state === 'active' || state === 'queued' || state === 'processing') {
                    assignments.push(bundle);
                }
            }
            
            // Вариант 3: bundle имеет поля assignment напрямую
            if (bundle.initialQuantity !== undefined || bundle.remainingQuantity !== undefined) {
                if (!assignments.find(a => a === bundle)) {
                    assignments.push(bundle);
                }
            }
            
            return assignments;
        };
        
        // Собираем все активные assignments из всех bundles
        const allActiveAssignments = [];
        bundlesResponse.bundles.forEach(bundle => {
            const assignments = extractAssignments(bundle);
            allActiveAssignments.push(...assignments);
        });
        
        if (allActiveAssignments.length === 0) {
            console.log('❌ No active assignments found. Available bundles:', bundlesResponse.bundles.map(b => ({
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
        
        console.log(`✅ Found ${allActiveAssignments.length} active assignment(s) across all bundles`);
        
        // ✅ СУММИРУЕМ все активные bundles для получения общего объема трафика
        let totalInitialQuantityBytes = 0;
        let totalRemainingQuantityBytes = 0;
        let latestAssignmentDate = null;
        let latestBundleName = '';
        let latestBundleState = '';
        
        allActiveAssignments.forEach((assignment, idx) => {
            const initialQty = assignment.initialQuantity || 0;
            const remainingQty = assignment.remainingQuantity || 0;
            
            totalInitialQuantityBytes += initialQty;
            totalRemainingQuantityBytes += remainingQty;
            
            // Находим самую позднюю дату assignment для расчета дней
            const assignmentDate = assignment.assignmentDateTime 
                ? new Date(assignment.assignmentDateTime) 
                : (assignment.assignmentDate ? new Date(assignment.assignmentDate) : null);
            
            if (assignmentDate && (!latestAssignmentDate || assignmentDate > latestAssignmentDate)) {
                latestAssignmentDate = assignmentDate;
                latestBundleName = assignment.name || assignment.bundleName || '';
                latestBundleState = assignment.bundleState || '';
            }
            
            console.log(`📦 Assignment ${idx + 1}:`, {
                name: assignment.name || assignment.bundleName || 'N/A',
                initialQuantity: initialQty,
                remainingQuantity: remainingQty,
                bundleState: assignment.bundleState || 'N/A'
            });
        });
        
        console.log('✅ Total traffic across all active bundles:', {
            totalInitialQuantityBytes: totalInitialQuantityBytes,
            totalRemainingQuantityBytes: totalRemainingQuantityBytes,
            totalUsedBytes: totalInitialQuantityBytes - totalRemainingQuantityBytes,
            assignmentsCount: allActiveAssignments.length
        });
        
        // Используем первый assignment для дополнительных данных (имя, описание и т.д.)
        const primaryAssignment = allActiveAssignments[0];
        
        // Конвертируем байты в MB
        const initialQuantityBytes = totalInitialQuantityBytes;
        const remainingQuantityBytes = totalRemainingQuantityBytes;
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
                bundleName: latestBundleName || primaryAssignment?.name || primaryAssignment?.bundleName || '',
                bundleDescription: primaryAssignment?.description || '',
                bundleState: latestBundleState || primaryAssignment?.bundleState || 'Unknown',
                totalData: Math.round(initialQuantityMB * 100) / 100, // MB, rounded to 2 decimals (сумма всех bundles)
                usedData: Math.round(usedQuantityMB * 100) / 100, // MB, rounded to 2 decimals
                remainingData: Math.round(remainingQuantityMB * 100) / 100, // MB, rounded to 2 decimals (сумма всех bundles)
                bundleDuration: bundleDuration, // days
                daysRemaining: daysRemaining, // days
                assignmentDate: assignmentDate ? assignmentDate.toISOString() : null,
                expiresDate: expiresDate,
                assignmentReference: primaryAssignment?.assignmentReference || primaryAssignment?.reference || null,
                unlimited: primaryAssignment?.unlimited || false,
                bundlesCount: allActiveAssignments.length // ✅ Добавляем количество активных bundles
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
        
        // Проверяем пороги и отправляем SMS при необходимости (fallback, если callback не пришел)
        // Используем уже вычисленные значения в байтах (initialQuantityBytes и remainingQuantityBytes)
        await checkUsageThresholdsAndSendSMS(
            iccid,
            initialQuantityBytes,
            remainingQuantityBytes,
            result.data.unlimited || false
        );
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('❌ Error getting bundle usage:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get bundle usage data'
        });
    }
};
