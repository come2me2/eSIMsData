/**
 * eSIM Go API - Получение тарифов (bundles) по стране
 * Endpoint: GET /api/esimgo/bundles?country=TH
 * 
 * Возвращает список доступных тарифов для указанной страны
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
        const { country } = req.query;
        
        if (!country) {
            return res.status(400).json({
                success: false,
                error: 'country parameter is required (ISO 3166-1 alpha-2 code)'
            });
        }
        
        // Получаем каталог для конкретной страны
        const catalogue = await esimgoClient.getCatalogue(country.toUpperCase());
        
        if (!catalogue || !catalogue.data) {
            return res.status(200).json({
                success: true,
                data: [],
                country: country.toUpperCase()
            });
        }

        // Обрабатываем bundles в удобный формат
        const bundles = catalogue.data.map(bundle => ({
            id: bundle.id || bundle.bundle_id,
            name: bundle.name || `${bundle.data_amount || 'N/A'} ${bundle.data_unit || 'GB'}`,
            data: bundle.data_amount ? `${bundle.data_amount} ${bundle.data_unit || 'GB'}` : 'N/A',
            dataAmount: bundle.data_amount,
            dataUnit: bundle.data_unit || 'GB',
            duration: bundle.validity ? `${bundle.validity} ${bundle.validity_unit || 'Days'}` : 'N/A',
            validity: bundle.validity,
            validityUnit: bundle.validity_unit || 'Days',
            price: bundle.price ? {
                amount: bundle.price.amount || bundle.price,
                currency: bundle.price.currency || 'USD',
                formatted: bundle.price.currency 
                    ? `${bundle.price.currency} ${bundle.price.amount || bundle.price}`
                    : `$${bundle.price.amount || bundle.price}`
            } : null,
            country: bundle.country?.toUpperCase(),
            countryName: bundle.country_name,
            originalData: bundle // Для справки
        }));
        
        // Сортируем по объёму данных
        bundles.sort((a, b) => {
            const aAmount = a.dataAmount || 0;
            const bAmount = b.dataAmount || 0;
            return aAmount - bAmount;
        });
        
        console.log('Bundles fetched:', {
            country: country.toUpperCase(),
            count: bundles.length
        });
        
        return res.status(200).json({
            success: true,
            data: bundles,
            country: country.toUpperCase(),
            meta: {
                total: bundles.length
            }
        });
        
    } catch (error) {
        console.error('Bundles API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch bundles'
        });
    }
};

