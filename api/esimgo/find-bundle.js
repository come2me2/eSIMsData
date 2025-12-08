/**
 * eSIM Go API - Поиск bundle по параметрам
 * Endpoint: GET /api/esimgo/find-bundle
 * 
 * Параметры:
 * - country: код страны (ISO)
 * - dataAmount: количество данных в MB
 * - duration: длительность в днях
 * - unlimited: true/false (опционально)
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
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { country, dataAmount, duration, unlimited } = req.query;
        
        if (!country || !dataAmount || !duration) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: country, dataAmount, duration'
            });
        }
        
        // Получаем каталог для страны
        const catalogue = await esimgoClient.getCatalogue(country.toUpperCase(), {
            perPage: 1000
        });
        
        // Извлекаем bundles из ответа
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue.bundles || catalogue.data || []);
        
        // Преобразуем параметры для поиска
        const dataAmountMB = parseInt(dataAmount);
        const durationDays = parseInt(duration);
        const isUnlimited = unlimited === 'true' || unlimited === true;
        
        // Ищем подходящий bundle
        let foundBundle = null;
        
        if (isUnlimited) {
            // Для unlimited ищем по duration и unlimited: true
            foundBundle = bundles.find(b => 
                b.unlimited === true &&
                b.duration === durationDays &&
                b.countries && b.countries.some(c => c.iso === country.toUpperCase())
            );
        } else {
            // Для фиксированных планов ищем по dataAmount и duration
            foundBundle = bundles.find(b => 
                b.dataAmount === dataAmountMB &&
                b.duration === durationDays &&
                b.unlimited === false &&
                b.countries && b.countries.some(c => c.iso === country.toUpperCase())
            );
        }
        
        if (!foundBundle) {
            // Если точного совпадения нет, ищем ближайший
            const countryBundles = bundles.filter(b => 
                b.countries && b.countries.some(c => c.iso === country.toUpperCase())
            );
            
            if (isUnlimited) {
                foundBundle = countryBundles
                    .filter(b => b.unlimited === true && b.duration === durationDays)
                    .sort((a, b) => (a.price || 0) - (b.price || 0))[0];
            } else {
                foundBundle = countryBundles
                    .filter(b => 
                        b.unlimited === false && 
                        b.dataAmount >= dataAmountMB && 
                        b.duration === durationDays
                    )
                    .sort((a, b) => a.dataAmount - b.dataAmount)[0];
            }
        }
        
        if (!foundBundle) {
            return res.status(404).json({
                success: false,
                error: 'Bundle not found',
                searchParams: {
                    country,
                    dataAmount: dataAmountMB,
                    duration: durationDays,
                    unlimited: isUnlimited
                },
                availableBundles: bundles.length
            });
        }
        
        return res.status(200).json({
            success: true,
            data: {
                bundleName: foundBundle.name,
                bundle: foundBundle,
                match: {
                    exact: foundBundle.dataAmount === dataAmountMB && 
                           foundBundle.duration === durationDays &&
                           foundBundle.unlimited === isUnlimited
                }
            }
        });
        
    } catch (error) {
        console.error('Find bundle error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to find bundle'
        });
    }
};

