/**
 * eSIM Go API - Получение обработанного каталога
 * Endpoint: GET /api/esimgo/catalogue-processed
 * 
 * Возвращает структурированные данные:
 * - Список стран с доступными тарифами
 * - Группировка по регионам
 * - Обработанные тарифы с ценами
 */

const esimgoClient = require('../_lib/esimgo/client');

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
    'Central Eurasia': ['AM', 'KZ', 'KG', 'MD', 'RU', 'UA', 'GE'],
    'Oceania': ['AU', 'NZ']
};

/**
 * Обработка каталога eSIM Go в структурированный формат
 * Структура ответа от /catalogue: массив Bundle объектов
 */
function processCatalogue(catalogueData) {
    // Структура ответа от /catalogue: массив Bundle объектов
    if (!catalogueData) {
        console.warn('processCatalogue: catalogueData is null or undefined');
        return {
            countries: [],
            regions: {},
            bundles: [],
            totalCountries: 0,
            totalBundles: 0
        };
    }
    
    // Проверяем, является ли ответ массивом Bundle или объектом с bundles
    let bundles = null;
    if (Array.isArray(catalogueData)) {
        bundles = catalogueData;
    } else if (catalogueData.bundles && Array.isArray(catalogueData.bundles)) {
        // API возвращает объект с полем bundles: { bundles: [], pageCount, rows, pageSize }
        bundles = catalogueData.bundles;
    } else if (catalogueData.data && Array.isArray(catalogueData.data)) {
        bundles = catalogueData.data;
    } else if (catalogueData.items && Array.isArray(catalogueData.items)) {
        bundles = catalogueData.items;
    } else {
        bundles = [];
    }
    
    console.log('processCatalogue: bundles extracted', {
        bundlesCount: bundles.length,
        isArray: Array.isArray(bundles),
        sampleBundle: bundles[0] || null,
        sourceType: Array.isArray(catalogueData) ? 'array' : (catalogueData.bundles ? 'bundles' : 'other')
    });
    
    if (!Array.isArray(bundles) || bundles.length === 0) {
        console.warn('processCatalogue: bundles is not an array or empty', {
            isArray: Array.isArray(bundles),
            length: bundles?.length || 0,
            type: typeof catalogueData,
            keys: Object.keys(catalogueData || {}),
            catalogueDataType: Array.isArray(catalogueData) ? 'array' : typeof catalogueData
        });
        return {
            countries: [],
            regions: {},
            bundles: [],
            totalCountries: 0,
            totalBundles: 0
        };
    }

    console.log(`Processing ${bundles.length} bundles`);

    const countriesMap = new Map();
    const regionsMap = new Map();
    const processedBundles = [];

    // Обрабатываем каждый Bundle
    bundles.forEach((bundle, index) => {
        try {
            // Bundle имеет структуру:
            // { name, description, countries: [{name, region, iso}], dataAmount, duration, price, ... }
            
            if (!bundle.countries || !Array.isArray(bundle.countries) || bundle.countries.length === 0) {
                console.warn(`Bundle at index ${index} has no countries:`, bundle.name);
                return;
            }

            // Обрабатываем каждую страну в Bundle
            bundle.countries.forEach(countryInfo => {
                const countryCode = (countryInfo.iso || countryInfo.ISO || countryInfo.code)?.toUpperCase();
                if (!countryCode) {
                    return;
                }

                // Используем регион из Bundle или находим по маппингу
                let region = countryInfo.region || null;
                if (!region) {
                    for (const [regName, countries] of Object.entries(regionMapping)) {
                        if (countries.includes(countryCode)) {
                            region = regName;
                            break;
                        }
                    }
                }
                if (!region) {
                    region = 'Other';
                }

                // Создаём или обновляем запись страны
                if (!countriesMap.has(countryCode)) {
                    countriesMap.set(countryCode, {
                        code: countryCode,
                        name: countryInfo.name || countryCode,
                        region: region,
                        bundles: []
                    });
                }

                const country = countriesMap.get(countryCode);
                
                // Добавляем Bundle к стране (если еще не добавлен)
                const bundleExists = country.bundles.some(b => b.name === bundle.name);
                if (!bundleExists) {
                    country.bundles.push({
                        name: bundle.name,
                        description: bundle.description,
                        dataAmount: bundle.dataAmount,
                        duration: bundle.duration,
                        price: bundle.price,
                        unlimited: bundle.unlimited,
                        autostart: bundle.autostart,
                        speed: bundle.speed,
                        groups: bundle.groups,
                        roamingEnabled: bundle.roamingEnabled
                    });
                }
            });

            // Сохраняем обработанный Bundle
            processedBundles.push({
                name: bundle.name,
                description: bundle.description,
                countries: bundle.countries,
                dataAmount: bundle.dataAmount,
                duration: bundle.duration,
                price: bundle.price,
                unlimited: bundle.unlimited,
                autostart: bundle.autostart,
                speed: bundle.speed,
                groups: bundle.groups,
                roamingEnabled: bundle.roamingEnabled
            });

        } catch (bundleError) {
            console.error(`Error processing bundle at index ${index}:`, bundleError, bundle);
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
        bundles: processedBundles,
        totalCountries: countries.length,
        totalBundles: processedBundles.length
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
        
        console.log('Catalogue-processed request:', { country, region, format });
        
        // Получаем каталог из eSIM Go
        let catalogue;
        try {
            // Пробуем получить каталог с разными параметрами
            const options = {
                perPage: 1000 // Получаем больше Bundle за раз
            };
            
            // Если указан регион, добавляем его
            if (region) {
                options.region = region;
            }
            
            catalogue = await esimgoClient.getCatalogue(country || null, options);
            
            // Детальное логирование для отладки
            console.log('Catalogue received (raw):', {
                isArray: Array.isArray(catalogue),
                type: typeof catalogue,
                bundlesCount: Array.isArray(catalogue) ? catalogue.length : (catalogue?.data?.length || catalogue?.bundles?.length || 0),
                keys: catalogue ? Object.keys(catalogue) : [],
                firstItem: Array.isArray(catalogue) ? catalogue[0] : (catalogue?.data?.[0] || catalogue?.bundles?.[0] || null),
                fullResponsePreview: JSON.stringify(catalogue).substring(0, 500) // Первые 500 символов для отладки
            });
            
            // API возвращает объект с полем bundles: { bundles: [], pageCount, rows, pageSize }
            // Оставляем как есть, processCatalogue обработает это правильно
            if (!Array.isArray(catalogue)) {
                if (catalogue?.bundles && Array.isArray(catalogue.bundles)) {
                    console.log('Found catalogue.bundles array, will be processed correctly');
                    // Не меняем структуру, processCatalogue знает про bundles
                } else if (catalogue?.data && Array.isArray(catalogue.data)) {
                    console.log('Found catalogue.data array, using it');
                    catalogue = catalogue.data;
                } else if (catalogue?.items && Array.isArray(catalogue.items)) {
                    console.log('Found catalogue.items array, using it');
                    catalogue = catalogue.items;
                } else {
                    // Если это объект с пагинацией, возможно данные в другом поле
                    console.warn('Catalogue is not an array and no known array field found', {
                        keys: Object.keys(catalogue || {}),
                        type: typeof catalogue
                    });
                }
            }
            
            // Если каталог пустой, логируем предупреждение
            if ((Array.isArray(catalogue) && catalogue.length === 0) || !catalogue) {
                console.warn('Catalogue is empty!', {
                    country: country || 'all',
                    region: region || 'all',
                    catalogueType: typeof catalogue,
                    catalogueKeys: catalogue ? Object.keys(catalogue) : []
                });
            }
        } catch (catalogueError) {
            console.error('Error fetching catalogue:', {
                message: catalogueError.message,
                stack: catalogueError.stack,
                name: catalogueError.name
            });
            throw new Error(`Failed to fetch catalogue: ${catalogueError.message}`);
        }
        
        // Обрабатываем данные
        let processed;
        try {
            processed = processCatalogue(catalogue);
            console.log('Catalogue processed:', {
                countriesCount: processed?.countries?.length || 0,
                bundlesCount: processed?.bundles?.length || 0,
                regionsCount: Object.keys(processed?.regions || {}).length
            });
        } catch (processError) {
            console.error('Error processing catalogue:', processError);
            throw new Error(`Failed to process catalogue: ${processError.message}`);
        }
        
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
                totalCountries: processed.totalCountries || 0,
                totalBundles: processed.totalBundles || 0,
                regions: Object.keys(processed.regions || {})
            }
        });
        
    } catch (error) {
        console.error('Catalogue processed API error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch and process catalogue',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

