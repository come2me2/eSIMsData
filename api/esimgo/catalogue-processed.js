/**
 * eSIM Go API - Получение обработанного каталога
 * Endpoint: GET /api/esimgo/catalogue-processed
 * 
 * Возвращает структурированные данные:
 * - Список стран с доступными тарифами
 * - Группировка по регионам
 * - Обработанные тарифы с ценами
 */

const esimgoClient = require('./client');

/**
 * Группировка стран по регионам
 */
const regionMapping = {
    'Africa': ['ZA', 'EG', 'KE', 'NG', 'MA', 'TZ', 'GH', 'ET', 'UG', 'DZ', 'SD', 'AO', 'MZ', 'CM', 'CI', 'SN', 'ML', 'BF', 'MW', 'ZM', 'ZW', 'TN', 'MG', 'RW', 'BJ'],
    'Asia': ['CN', 'IN', 'JP', 'KR', 'TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'BD', 'PK', 'LK', 'KH', 'MM', 'LA', 'MN', 'NP', 'BT', 'MV', 'BN', 'TL', 'AF', 'IQ', 'IR', 'SA', 'AE', 'IL', 'JO', 'LB'],
    'Europe': ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'GR', 'PT', 'IE', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'IS', 'AL', 'BA', 'RS', 'ME', 'MK'],
    'Latin America': ['BR', 'MX', 'AR', 'CO', 'CL', 'PE', 'EC', 'VE', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'JM'],
    'North America': ['US', 'CA', 'MX', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'TT', 'BS'],
    'Balkanas': ['AL', 'BA', 'BG', 'HR', 'GR', 'ME', 'MK', 'RS'],
    'Central Eurasia': ['KZ', 'KG', 'TJ', 'TM', 'UZ', 'AF', 'AM', 'AZ', 'GE', 'MN', 'RU', 'UA'],
    'Oceania': ['AU', 'NZ', 'FJ', 'PG', 'WS', 'TO', 'VU', 'SB', 'NC', 'PF']
};

/**
 * Обработка каталога eSIM Go в структурированный формат
 */
function processCatalogue(catalogueData) {
    // Структура ответа от /esims: { esims: [], pageCount, pageSize, rows }
    if (!catalogueData || !catalogueData.esims) {
        return {
            countries: [],
            regions: {},
            bundles: [],
            esims: []
        };
    }

    // eSIMs из ответа могут содержать информацию о доступных тарифах
    const esims = catalogueData.esims || [];
    const countriesMap = new Map();
    const regionsMap = new Map();

    // Обрабатываем каждый eSIM
    // Структура eSIM может содержать: iccid, country, countryCode, и т.д.
    esims.forEach(esim => {
        // Получаем код страны из eSIM (может быть в разных полях)
        const countryCode = (esim.countryCode || esim.country_code || esim.country)?.toUpperCase();
        if (!countryCode) return;

        // Находим регион для страны
        let region = null;
        for (const [regName, countries] of Object.entries(regionMapping)) {
            if (countries.includes(countryCode)) {
                region = regName;
                break;
            }
        }

        // Если регион не найден, добавляем в "Other"
        if (!region) {
            region = 'Other';
        }

        // Создаём или обновляем запись страны
        if (!countriesMap.has(countryCode)) {
            countriesMap.set(countryCode, {
                code: countryCode,
                name: esim.countryName || esim.country_name || esim.country || countryCode,
                region: region,
                esims: [],
                bundles: [] // Bundles будут получены отдельно для каждого eSIM
            });
        }

        const country = countriesMap.get(countryCode);
        
        // Добавляем eSIM к стране
        country.esims.push({
            iccid: esim.iccid,
            name: esim.name || esim.productName || 'eSIM',
            originalData: esim // Сохраняем оригинальные данные для справки
        });

        // Группируем по регионам
        if (!regionsMap.has(region)) {
            regionsMap.set(region, {
                name: region,
                countries: []
            });
        }
    });

    // Преобразуем Map в массивы
    const countries = Array.from(countriesMap.values());
    
    // Группируем страны по регионам
    const regions = {};
    countries.forEach(country => {
        if (!regions[country.region]) {
            regions[country.region] = {
                name: country.region,
                countries: []
            };
        }
        regions[country.region].countries.push(country);
    });

    return {
        countries,
        regions,
        esims: esims,
        totalCountries: countries.length,
        totalESIMs: esims.length,
        pagination: {
            pageCount: catalogueData.pageCount,
            pageSize: catalogueData.pageSize,
            rows: catalogueData.rows
        }
    };
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
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { country, region, format } = req.query;
        
        // Получаем каталог из eSIM Go
        const catalogue = await esimgoClient.getCatalogue(country || null);
        
        // Обрабатываем данные
        const processed = processCatalogue(catalogue);
        
        // Если запрошен конкретный формат
        if (format === 'countries') {
            return res.status(200).json({
                success: true,
                data: processed.countries
            });
        }
        
        if (format === 'regions') {
            return res.status(200).json({
                success: true,
                data: processed.regions
            });
        }
        
        if (region && processed.regions[region]) {
            return res.status(200).json({
                success: true,
                data: processed.regions[region]
            });
        }
        
        // Возвращаем полные обработанные данные
        return res.status(200).json({
            success: true,
            data: processed,
            meta: {
                totalCountries: processed.totalCountries,
                totalBundles: processed.totalBundles,
                regions: Object.keys(processed.regions)
            }
        });
        
    } catch (error) {
        console.error('Catalogue processed API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch and process catalogue'
        });
    }
};

