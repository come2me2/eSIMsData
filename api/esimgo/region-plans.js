/**
 * eSIM Go API - Получение региональных планов (тарифов)
 * Endpoint: GET /api/esimgo/region-plans
 * 
 * Параметры:
 * - region: название региона приложения (Africa, Asia, Europe, North America, Latin America, Oceania, Balkanas, Central Eurasia)
 * 
 * Возвращает только fixed тарифы (без unlimited) для региональных eSIM
 */

const esimgoClient = require('../_lib/esimgo/client');
const { getAPIRegions, isLatinAmerica } = require('../_lib/esimgo/region-mapping');

/**
 * Дедупликация тарифов для Latin America
 * Выбирает тариф с минимальной ценой для каждой комбинации страны/данных/длительности
 * Пример: El Salvador (SV) - если есть тарифы из Americas ($9.99) и CENAM ($9.79), выбирается CENAM
 * @param {Array} bundles - массив bundles из разных регионов API
 * @returns {Array} - дедуплицированный массив bundles
 */
function deduplicateLatinAmerica(bundles) {
    // Группируем по стране, объему данных и длительности
    const plansMap = new Map();
    
    bundles.forEach(bundle => {
        // Получаем коды стран из bundle
        // countries может быть массивом строк (ISO кодов) или объектов {name, region, iso}
        const countries = bundle.countries || [];
        let countryCodes = [];
        
        if (countries.length === 0) {
            // Если countries пустой, пробуем получить из других полей
            const countryCode = bundle.country || bundle.countryCode || bundle.iso;
            if (countryCode) {
                countryCodes.push(String(countryCode).toUpperCase());
            }
        } else {
            // Обрабатываем массив countries
            countries.forEach(country => {
                if (typeof country === 'string') {
                    countryCodes.push(country.toUpperCase());
                } else if (typeof country === 'object' && country !== null) {
                    // Объект с полями iso, ISO, code
                    const countryIso = (country.iso || country.ISO || country.code || '').toUpperCase();
                    if (countryIso) {
                        countryCodes.push(countryIso);
                    }
                }
            });
        }
        
        // Извлекаем цену
        let priceValue = 0;
        if (bundle.price) {
            if (typeof bundle.price === 'number') {
                priceValue = bundle.price;
            } else if (typeof bundle.price === 'object' && bundle.price.amount) {
                priceValue = typeof bundle.price.amount === 'number' 
                    ? bundle.price.amount 
                    : parseFloat(bundle.price.amount) || 0;
            } else if (typeof bundle.price === 'string') {
                priceValue = parseFloat(bundle.price) || 0;
            }
        } else if (bundle.pricePerUnit) {
            priceValue = typeof bundle.pricePerUnit === 'number' 
                ? bundle.pricePerUnit 
                : parseFloat(bundle.pricePerUnit) || 0;
        }
        
        // Если цена в центах (больше 100 и меньше 100000), конвертируем в доллары
        if (priceValue > 100 && priceValue < 100000 && priceValue % 1 === 0) {
            priceValue = priceValue / 100;
        }
        
        // Для каждой страны создаем ключ и проверяем минимальную цену
        countryCodes.forEach(countryCode => {
            const dataAmount = bundle.dataAmount || 0;
            const duration = bundle.duration || 0;
            const key = `${countryCode}_${dataAmount}_${duration}`;
            
            if (!plansMap.has(key)) {
                plansMap.set(key, {
                    ...bundle,
                    countryCode: countryCode,
                    priceValue: priceValue,
                    apiRegion: bundle.apiRegion // Сохраняем информацию о регионе API
                });
            } else {
                const existing = plansMap.get(key);
                const existingPrice = existing.priceValue || 0;
                
                // Выбираем bundle с минимальной ценой
                // Если цены равны, предпочитаем USD
                if (priceValue < existingPrice) {
                    plansMap.set(key, {
                        ...bundle,
                        countryCode: countryCode,
                        priceValue: priceValue,
                        apiRegion: bundle.apiRegion
                    });
                } else if (priceValue === existingPrice) {
                    // Если цены равны, предпочитаем USD
                    const bundleCurrency = bundle.currency || 'USD';
                    const existingCurrency = existing.currency || 'USD';
                    if (bundleCurrency === 'USD' && existingCurrency !== 'USD') {
                        plansMap.set(key, {
                            ...bundle,
                            countryCode: countryCode,
                            priceValue: priceValue,
                            apiRegion: bundle.apiRegion
                        });
                    }
                }
            }
        });
    });
    
    const deduplicated = Array.from(plansMap.values());
    console.log(`Latin America deduplication: ${bundles.length} bundles -> ${deduplicated.length} bundles`);
    
    return deduplicated;
}

/**
 * Получить все bundles из группы "Standard Fixed"
 * Регионы определяются по полю country/countries, а не по параметру region
 * Использует пагинацию для получения всех bundles
 * @returns {Promise<Array>}
 */
async function getAllStandardFixedBundles() {
    try {
        console.log('Fetching all bundles from group "Standard Fixed"');
        
        let allBundles = [];
        let page = 1;
        const perPage = 1000;
        let hasMore = true;
        
        // Запрашиваем все bundles из группы Standard Fixed с пагинацией
        while (hasMore) {
            const catalogue = await esimgoClient.getCatalogue(null, {
                group: 'Standard Fixed',
                perPage: perPage,
                page: page
            });
            
            const bundles = Array.isArray(catalogue) 
                ? catalogue 
                : (catalogue?.bundles || catalogue?.data || []);
            
            if (bundles.length > 0) {
                allBundles = allBundles.concat(bundles);
                
                // Логируем структуру первого bundle только для первой страницы
                if (page === 1 && bundles.length > 0) {
                    const sampleBundle = bundles[0];
                    console.log('Sample Standard Fixed bundle structure:', {
                        name: sampleBundle.name,
                        country: sampleBundle.country,
                        countries: sampleBundle.countries,
                        countriesType: typeof sampleBundle.countries,
                        countriesLength: Array.isArray(sampleBundle.countries) ? sampleBundle.countries.length : 0,
                        firstCountry: Array.isArray(sampleBundle.countries) ? sampleBundle.countries[0] : null
                    });
                }
                
                // Проверяем, есть ли еще страницы
                const pageCount = catalogue?.pageCount || 0;
                const rows = catalogue?.rows || 0;
                
                if (pageCount > 0 && page >= pageCount) {
                    hasMore = false;
                } else if (rows > 0 && allBundles.length >= rows) {
                    hasMore = false;
                } else if (bundles.length < perPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }
        
        console.log(`Received ${allBundles.length} bundles from Standard Fixed group (${page} page(s))`);
        
        // Фильтруем только fixed тарифы (не unlimited) - дополнительная проверка
        const fixedBundles = allBundles.filter(bundle => !bundle.unlimited);
        
        console.log(`Filtered to ${fixedBundles.length} fixed bundles`);
        
        return fixedBundles;
    } catch (error) {
        console.error('Error fetching Standard Fixed bundles:', error);
        return [];
    }
}

/**
 * Фильтровать bundles по региону API
 * Регион определяется по полю country/countries в bundle
 * @param {Array} bundles - все bundles из Standard Fixed
 * @param {string} apiRegion - регион API (Africa, Asia, EU Lite, North America, Americas, Caribbean, CENAM, Oceania, Balkanas, CIS)
 * @returns {Array} - отфильтрованные bundles
 */
function filterBundlesByRegion(bundles, apiRegion) {
    // Маппинг регионов API на возможные значения в bundle
    // В bundle регион может быть указан как "Europe", а не "EU Lite"
    const regionAliases = {
        'EU Lite': ['EU Lite', 'Europe', 'EU'], // Europe в bundle соответствует EU Lite в API
        'Americas': ['Americas', 'America', 'LATAM', 'Latin America'],
        'Caribbean': ['Caribbean', 'Carib'],
        'CENAM': ['CENAM', 'Central America'],
        'Asia': ['Asia', 'ASIA'],
        'Africa': ['Africa'],
        'North America': ['North America', 'NorthAmerica'],
        'Oceania': ['Oceania'],
        'Balkanas': ['Balkanas', 'Balkans'],
        'CIS': ['CIS', 'Central Eurasia']
    };
    
    // Получаем список возможных значений для региона
    const possibleRegionNames = regionAliases[apiRegion] || [apiRegion];
    
    // Для региональных bundles ищем, где country.name или country.iso = название региона
    // Это bundles, которые покрывают весь регион, а не отдельные страны
    const filtered = bundles.filter(bundle => {
        const countries = bundle.countries || [];
        const bundleName = (bundle.name || '').toUpperCase();
        
        // Проверяем поле country (если это строка)
        if (bundle.country) {
            const countryStr = String(bundle.country);
            for (const regionName of possibleRegionNames) {
                if (countryStr === regionName || countryStr.toLowerCase() === regionName.toLowerCase()) {
                    return true;
                }
            }
        }
        
        // Проверяем массив countries - ищем региональные bundles
        // Региональный bundle: country.name или country.iso = название региона
        if (countries.length > 0) {
            const isRegionalBundle = countries.some(country => {
                if (typeof country === 'string') {
                    // Если country - строка, проверяем напрямую
                    for (const regionName of possibleRegionNames) {
                        if (country === regionName || country.toLowerCase() === regionName.toLowerCase()) {
                            return true;
                        }
                    }
                    return false;
                } else if (typeof country === 'object' && country !== null) {
                    const countryName = (country.name || country.Name || country.NAME || '').toLowerCase();
                    const countryIso = (country.iso || country.ISO || country.code || '').toUpperCase();
                    
                    // Региональный bundle: name или iso = название региона
                    for (const regionName of possibleRegionNames) {
                        const regionNameLower = regionName.toLowerCase();
                        const regionNameUpper = regionName.toUpperCase();
                        
                        if (countryName === regionNameLower || 
                            countryIso === regionNameUpper ||
                            countryIso === regionName) {
                            return true;
                        }
                    }
                }
                return false;
            });
            
            if (isRegionalBundle) {
                return true;
            }
        }
        
        // Также проверяем название bundle (может содержать код региона)
        // Например: esim_1GB_7D_AFRICA_V2 или esim_1GB_7D_AF_V2
        const regionCodes = {
            'Africa': ['AFRICA', '_AF_', '_AFR_'],
            'Asia': ['ASIA', '_AS_', '_ASI_'],
            'EU Lite': ['EUROPE', '_EU_', '_EUL_'],
            'Americas': ['AMERICAS', '_AM_', '_AME_'],
            'Caribbean': ['CARIBBEAN', '_CB_', '_CAR_'],
            'CENAM': ['CENAM', '_CE_', '_CEN_'],
            'North America': ['NORTHAMERICA', '_NA_', '_NAM_'],
            'Oceania': ['OCEANIA', '_OC_', '_OCE_'],
            'Balkanas': ['BALKANAS', '_BK_', '_BAL_'],
            'CIS': ['CIS', '_CIS_']
        };
        
        const codes = regionCodes[apiRegion] || [];
        for (const code of codes) {
            if (bundleName.includes(code)) {
                return true;
            }
        }
        
        return false;
    });
    
    // Логируем примеры найденных bundles для отладки
    if (filtered.length > 0) {
        console.log(`Found ${filtered.length} bundles for region ${apiRegion}`);
        if (filtered.length <= 5) {
            console.log(`Sample bundles for region ${apiRegion}:`, filtered.map(b => ({
                name: b.name,
                country: b.country,
                countries: b.countries,
                price: b.price
            })));
        }
    } else if (filtered.length === 0) {
        // Логируем примеры bundles для отладки, если ничего не найдено
        const sampleBundles = bundles.slice(0, 10).map(b => {
            const countries = b.countries || [];
            const countryRegions = countries.map(c => {
                if (typeof c === 'object' && c !== null) {
                    return {
                        name: c.name,
                        iso: c.iso,
                        region: c.region
                    };
                }
                return c;
            });
            return {
                name: b.name,
                country: b.country,
                countries: countryRegions,
                price: b.price
            };
        });
        console.log(`No bundles found for region ${apiRegion}. Looking for:`, possibleRegionNames);
        console.log(`Sample bundles from all Standard Fixed:`, sampleBundles);
        
        // Для Europe дополнительно проверяем, есть ли bundles с region='Europe'
        if (apiRegion === 'EU Lite') {
            const europeBundles = bundles.filter(bundle => {
                const countries = bundle.countries || [];
                return countries.some(country => {
                    if (typeof country === 'object' && country !== null) {
                        const region = country.region || country.Region || country.REGION;
                        const countryName = (country.name || '').toLowerCase();
                        const countryIso = (country.iso || '').toUpperCase();
                        return region === 'Europe' || 
                               countryName === 'europe' || 
                               countryIso === 'EUROPE' ||
                               countryIso === 'EU';
                    }
                    return false;
                });
            });
            console.log(`Found ${europeBundles.length} bundles with region='Europe' (not EU Lite)`);
            if (europeBundles.length > 0) {
                console.log('Sample Europe bundles:', europeBundles.slice(0, 3).map(b => ({
                    name: b.name,
                    countries: b.countries,
                    price: b.price
                })));
            }
        }
    }
    
    return filtered;
}

/**
 * Группировка bundles в планы (только standard, без unlimited)
 */
function groupBundlesIntoPlans(bundles) {
    const plans = {
        standard: []
    };
    
    bundles.forEach(bundle => {
        // Извлекаем цену из разных возможных форматов
        // API может возвращать base price и user price - нужно использовать user price
        let priceValue = 0;
        let currency = 'USD';
        
        // Пробуем разные поля для цены (приоритет: userPrice > pricePerUnit > price > basePrice)
        const priceFields = [
            bundle.userPrice,
            bundle.pricePerUnit,
            bundle.price,
            bundle.basePrice,
            bundle.cost,
            bundle.amount,
            bundle.fee,
            bundle.totalPrice
        ];
        
        for (const priceField of priceFields) {
            if (priceField !== undefined && priceField !== null) {
                if (typeof priceField === 'number' && priceField > 0) {
                    priceValue = priceField;
                    break;
                } else if (typeof priceField === 'object' && priceField.amount) {
                    priceValue = typeof priceField.amount === 'number' 
                        ? priceField.amount 
                        : parseFloat(priceField.amount) || 0;
                    currency = priceField.currency || 'USD';
                    if (priceValue > 0) break;
                } else if (typeof priceField === 'string') {
                    const parsed = parseFloat(priceField);
                    if (!isNaN(parsed) && parsed > 0) {
                        priceValue = parsed;
                        break;
                    }
                }
            }
        }
        
        // Логируем структуру цены для первых нескольких bundles (для отладки)
        if (bundles.indexOf(bundle) < 3) {
            console.log('Bundle price structure:', {
                name: bundle.name,
                price: bundle.price,
                pricePerUnit: bundle.pricePerUnit,
                userPrice: bundle.userPrice,
                basePrice: bundle.basePrice,
                cost: bundle.cost,
                amount: bundle.amount,
                extractedPrice: priceValue,
                bundleKeys: Object.keys(bundle).filter(k => 
                    k.toLowerCase().includes('price') || 
                    k.toLowerCase().includes('cost') || 
                    k.toLowerCase().includes('amount') ||
                    k.toLowerCase().includes('fee')
                )
            });
        }
        
        // Если цена в центах (больше 100 и меньше 100000), конвертируем в доллары
        // Но только если это целое число (признак центов)
        if (priceValue > 100 && priceValue < 100000 && priceValue % 1 === 0) {
            priceValue = priceValue / 100;
        }
        
        // Получаем валюту из bundle
        if (bundle.currency) {
            currency = bundle.currency;
        } else if (bundle.price && typeof bundle.price === 'object' && bundle.price.currency) {
            currency = bundle.price.currency;
        }
        
        const priceFormatted = currency === 'USD' 
            ? `$ ${priceValue.toFixed(2)}`
            : `${currency} ${priceValue.toFixed(2)}`;
        
        const plan = {
            id: bundle.name,
            bundle_name: bundle.name,
            data: `${bundle.dataAmount / 1000} GB`,
            dataAmount: bundle.dataAmount,
            duration: `${bundle.duration} Days`,
            durationDays: bundle.duration,
            price: priceFormatted,
            priceValue: priceValue,
            currency: currency,
            unlimited: false,
            countries: bundle.countries || [],
            description: bundle.description || '',
            region: bundle.region || bundle.apiRegion || null
        };
        
        plans.standard.push(plan);
    });
    
    // Дедупликация стандартных планов
    const standardMap = new Map();
    plans.standard.forEach(plan => {
        const priceValue = typeof plan.priceValue === 'number' 
            ? plan.priceValue 
            : parseFloat(plan.priceValue) || 0;
        plan.priceValue = priceValue;
        
        const key = `${plan.durationDays}-${plan.dataAmount}`;
        
        if (!standardMap.has(key)) {
            standardMap.set(key, plan);
        } else {
            const existing = standardMap.get(key);
            const existingPrice = typeof existing.priceValue === 'number' 
                ? existing.priceValue 
                : parseFloat(existing.priceValue) || 0;
            
            if (plan.currency === existing.currency) {
                if (priceValue < existingPrice) {
                    standardMap.set(key, plan);
                }
            } else if (plan.currency === 'USD' && existing.currency !== 'USD') {
                standardMap.set(key, plan);
            } else if (existing.currency === 'USD' && plan.currency !== 'USD') {
                // Оставляем существующий USD план
            } else if (priceValue < existingPrice) {
                standardMap.set(key, plan);
            }
        }
    });
    
    plans.standard = Array.from(standardMap.values()).sort((a, b) => {
        if (a.durationDays !== b.durationDays) {
            return a.durationDays - b.durationDays;
        }
        return a.dataAmount - b.dataAmount;
    });
    
    return plans;
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
        const { region } = req.query;
        
        if (!region) {
            return res.status(400).json({
                success: false,
                error: 'Region parameter is required'
            });
        }
        
        console.log('Region plans API request:', { region });
        
        // Получаем регионы API для региона приложения
        const apiRegions = getAPIRegions(region);
        
        if (apiRegions.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Unknown region: ${region}`
            });
        }
        
        // Получаем все bundles из группы Standard Fixed один раз
        const allStandardFixedBundles = await getAllStandardFixedBundles();
        
        // Фильтруем bundles по регионам API (регионы указаны в поле country/countries)
        let allBundles = [];
        
        for (const apiRegion of apiRegions) {
            console.log(`Filtering bundles for API region: ${apiRegion}`);
            const bundles = filterBundlesByRegion(allStandardFixedBundles, apiRegion);
            console.log(`Found ${bundles.length} bundles for region ${apiRegion}`);
            
            // Добавляем информацию о регионе API к каждому bundle
            bundles.forEach(bundle => {
                bundle.apiRegion = apiRegion;
            });
            allBundles = allBundles.concat(bundles);
        }
        
        console.log(`Total bundles after filtering by regions: ${allBundles.length}`);
        
        // Для Latin America делаем дедупликацию по минимальной цене
        if (isLatinAmerica(region)) {
            allBundles = deduplicateLatinAmerica(allBundles);
        }
        
        if (allBundles.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    standard: [],
                    unlimited: [],
                    total: 0
                },
                meta: {
                    region: region,
                    apiRegions: apiRegions,
                    message: 'No bundles found'
                }
            });
        }
        
        // Группируем в планы
        const plans = groupBundlesIntoPlans(allBundles);
        
        console.log('Region plans grouped:', {
            region: region,
            apiRegions: apiRegions,
            standardPlans: plans.standard.length,
            totalBundles: allBundles.length
        });
        
        return res.status(200).json({
            success: true,
            data: {
                standard: plans.standard,
                unlimited: [], // Для регионов всегда пустой массив
                total: plans.standard.length
            },
            meta: {
                region: region,
                apiRegions: apiRegions,
                bundlesCount: allBundles.length
            }
        });
        
    } catch (error) {
        console.error('Region plans API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch region plans'
        });
    }
};

