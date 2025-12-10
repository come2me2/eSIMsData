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
const cache = require('../_lib/cache');

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
    // В bundle регион может быть указан как "Europe Lite", "Europe" или "EU Lite"
    const regionAliases = {
        'EU Lite': ['Europe Lite', 'EU Lite', 'Europe', 'EU', 'EUL'], // Europe Lite - правильное название в bundle
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
                    const countryRegion = (country.region || country.Region || country.REGION || '').toLowerCase();
                    
                    // Региональный bundle: name или iso = название региона
                    for (const regionName of possibleRegionNames) {
                        const regionNameLower = regionName.toLowerCase();
                        const regionNameUpper = regionName.toUpperCase();
                        
                        // Проверяем name
                        if (countryName === regionNameLower) {
                            return true;
                        }
                        
                        // Проверяем iso
                        if (countryIso === regionNameUpper || countryIso === regionName) {
                            return true;
                        }
                        
                                        // Для Europe также проверяем region (может быть "Europe Lite" или "Europe" в поле region)
                        // Это нужно для случаев, когда региональный bundle имеет region="Europe Lite", 
                        // но name/iso указывают на конкретную страну
                        if (apiRegion === 'EU Lite') {
                            // Проверяем region на "Europe Lite", "Europe" или "EU Lite"
                            if (countryRegion === 'europe lite' || 
                                countryRegion === 'europe' || 
                                countryRegion === 'eu lite') {
                                // Но только если это не стандартный ISO код страны (2 символа)
                                // Региональные bundles обычно имеют нестандартные ISO коды
                                if (countryIso.length > 2 || 
                                    countryIso === 'EU' || 
                                    countryIso === 'EUROPE' ||
                                    countryIso === 'EUL' ||
                                    countryIso === 'EUROPE LITE') {
                                    return true;
                                }
                            }
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
            'EU Lite': ['EUROPELITE', 'EUROPE_LITE', '_EUL_', '_EU_', 'EUROPE'],
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
        
        // Для Europe дополнительно проверяем, есть ли bundles с "Europe Lite"
        if (apiRegion === 'EU Lite') {
            const europeLiteBundles = bundles.filter(bundle => {
                const countries = bundle.countries || [];
                const name = (bundle.name || '').toUpperCase();
                return countries.some(country => {
                    if (typeof country === 'object' && country !== null) {
                        const region = (country.region || country.Region || country.REGION || '').toLowerCase();
                        const countryName = (country.name || '').toLowerCase();
                        const countryIso = (country.iso || '').toUpperCase();
                        return region === 'europe lite' || 
                               countryName === 'europe lite' || 
                               countryIso === 'EUROPE LITE' ||
                               countryIso === 'EUL';
                    }
                    return false;
                }) || name.includes('EUROPELITE') || name.includes('EUROPE_LITE');
            });
            console.log(`Found ${europeLiteBundles.length} bundles with "Europe Lite"`);
            if (europeLiteBundles.length > 0) {
                console.log('Sample Europe Lite bundles:', europeLiteBundles.slice(0, 3).map(b => ({
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
        
        // Определяем ключ кэша для региона
        const cacheKey = `region-plans:${region}`;
        
        // Проверяем кэш перед запросом к API
        const cachedData = cache.get(cacheKey, cache.getTTL('regionPlans'));
        if (cachedData) {
            // Проверяем, что кэшированные данные не пустые
            const hasData = cachedData.data && (
                (cachedData.data.standard && cachedData.data.standard.length > 0) ||
                (cachedData.data.unlimited && cachedData.data.unlimited.length > 0)
            );
            if (hasData) {
                console.log('✅ Using cached region plans data for:', region);
                return res.status(200).json({
                    success: true,
                    data: cachedData.data,
                    meta: {
                        ...cachedData.meta,
                        cached: true
                    }
                });
            } else {
                console.warn('⚠️ Cached data is empty, clearing cache for:', cacheKey);
                cache.clear(cacheKey);
            }
        }
        
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
        
        // Извлекаем уникальные страны из bundles (исключаем региональные коды)
        const countriesMap = new Map();
        
        // Маппинг ISO кодов на названия стран
        const isoToCountryName = {
            'AD': 'Andorra', 'AE': 'United Arab Emirates', 'AF': 'Afghanistan', 'AG': 'Antigua and Barbuda',
            'AI': 'Anguilla', 'AL': 'Albania', 'AM': 'Armenia', 'AN': 'Netherlands Antilles', 'AO': 'Angola', 'AQ': 'Antarctica',
            'AR': 'Argentina', 'AS': 'American Samoa', 'AT': 'Austria', 'AU': 'Australia', 'AW': 'Aruba',
            'AX': 'Åland Islands', 'AZ': 'Azerbaijan', 'BA': 'Bosnia and Herzegovina', 'BB': 'Barbados',
            'BD': 'Bangladesh', 'BE': 'Belgium', 'BF': 'Burkina Faso', 'BG': 'Bulgaria', 'BH': 'Bahrain',
            'BI': 'Burundi', 'BJ': 'Benin', 'BL': 'Saint Barthélemy', 'BM': 'Bermuda', 'BN': 'Brunei',
            'BO': 'Bolivia', 'BQ': 'Caribbean Netherlands', 'BR': 'Brazil', 'BS': 'Bahamas', 'BT': 'Bhutan',
            'BV': 'Bouvet Island', 'BW': 'Botswana', 'BY': 'Belarus', 'BZ': 'Belize', 'CA': 'Canada',
            'CYP': 'Northern Cyprus', 'CC': 'Cocos Islands', 'CD': 'Congo, Democratic Republic', 'CF': 'Central African Republic',
            'CG': 'Congo', 'CH': 'Switzerland', 'CI': 'Côte d\'Ivoire', 'CK': 'Cook Islands', 'CL': 'Chile',
            'CM': 'Cameroon', 'CN': 'China', 'CO': 'Colombia', 'CR': 'Costa Rica', 'CU': 'Cuba',
            'CV': 'Cabo Verde', 'CW': 'Curaçao', 'CX': 'Christmas Island', 'CY': 'Cyprus',
            'CZ': 'Czech Republic', 'DE': 'Germany', 'DJ': 'Djibouti', 'DK': 'Denmark', 'DM': 'Dominica',
            'DO': 'Dominican Republic', 'DZ': 'Algeria', 'EC': 'Ecuador', 'EE': 'Estonia', 'EG': 'Egypt',
            'EH': 'Western Sahara', 'ER': 'Eritrea', 'ES': 'Spain', 'ET': 'Ethiopia', 'FI': 'Finland',
            'FJ': 'Fiji', 'FK': 'Falkland Islands', 'FM': 'Micronesia', 'FO': 'Faroe Islands', 'FR': 'France',
            'GA': 'Gabon', 'GB': 'United Kingdom', 'GD': 'Grenada', 'GE': 'Georgia', 'GF': 'French Guiana',
            'GG': 'Guernsey', 'GH': 'Ghana', 'GI': 'Gibraltar', 'GL': 'Greenland', 'GM': 'Gambia',
            'GN': 'Guinea', 'GP': 'Guadeloupe', 'GQ': 'Equatorial Guinea', 'GR': 'Greece', 'GS': 'South Georgia',
            'GT': 'Guatemala', 'GU': 'Guam', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HK': 'Hong Kong', 'IC': 'Canary Islands',
            'HM': 'Heard Island', 'HN': 'Honduras', 'HR': 'Croatia', 'HT': 'Haiti', 'HU': 'Hungary',
            'ID': 'Indonesia', 'IE': 'Ireland', 'IL': 'Israel', 'IM': 'Isle of Man', 'IN': 'India',
            'IO': 'British Indian Ocean Territory', 'IQ': 'Iraq', 'IR': 'Iran', 'IS': 'Iceland', 'IT': 'Italy',
            'JE': 'Jersey', 'JM': 'Jamaica', 'JO': 'Jordan', 'JP': 'Japan', 'KE': 'Kenya',
            'KG': 'Kyrgyzstan', 'KH': 'Cambodia', 'KI': 'Kiribati', 'KM': 'Comoros', 'KN': 'Saint Kitts and Nevis',
            'KP': 'Korea, North', 'KR': 'Korea, South', 'KW': 'Kuwait', 'KY': 'Cayman Islands', 'KZ': 'Kazakhstan',
            'LA': 'Laos', 'LB': 'Lebanon', 'LC': 'Saint Lucia', 'LI': 'Liechtenstein', 'LK': 'Sri Lanka',
            'LR': 'Liberia', 'LS': 'Lesotho', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia',
            'LY': 'Libya', 'MA': 'Morocco', 'MC': 'Monaco', 'MD': 'Moldova', 'ME': 'Montenegro',
            'MF': 'Saint Martin', 'MG': 'Madagascar', 'MH': 'Marshall Islands', 'MK': 'North Macedonia', 'ML': 'Mali',
            'MM': 'Myanmar', 'MN': 'Mongolia', 'MO': 'Macao', 'MP': 'Northern Mariana Islands', 'MQ': 'Martinique',
            'MR': 'Mauritania', 'MS': 'Montserrat', 'MT': 'Malta', 'MU': 'Mauritius', 'MV': 'Maldives',
            'MW': 'Malawi', 'MX': 'Mexico', 'MY': 'Malaysia', 'MZ': 'Mozambique', 'NA': 'Namibia',
            'NC': 'New Caledonia', 'NE': 'Niger', 'NF': 'Norfolk Island', 'NG': 'Nigeria', 'NI': 'Nicaragua',
            'NL': 'Netherlands', 'NO': 'Norway', 'NP': 'Nepal', 'NR': 'Nauru', 'NU': 'Niue',
            'NZ': 'New Zealand', 'OM': 'Oman', 'PA': 'Panama', 'PE': 'Peru', 'PF': 'French Polynesia',
            'PG': 'Papua New Guinea', 'PH': 'Philippines', 'PK': 'Pakistan', 'PL': 'Poland', 'PM': 'Saint Pierre and Miquelon',
            'PN': 'Pitcairn', 'PR': 'Puerto Rico', 'PS': 'Palestine', 'PT': 'Portugal', 'PW': 'Palau',
            'PY': 'Paraguay', 'QA': 'Qatar', 'RE': 'Réunion', 'RO': 'Romania', 'RS': 'Serbia',
            'RU': 'Russia', 'RW': 'Rwanda', 'SA': 'Saudi Arabia', 'SB': 'Solomon Islands', 'SC': 'Seychelles',
            'SD': 'Sudan', 'SE': 'Sweden', 'SG': 'Singapore', 'SH': 'Saint Helena', 'SI': 'Slovenia',
            'SJ': 'Svalbard and Jan Mayen', 'SK': 'Slovakia', 'SL': 'Sierra Leone', 'SM': 'San Marino', 'SN': 'Senegal',
            'SO': 'Somalia', 'SR': 'Suriname', 'SS': 'South Sudan', 'ST': 'São Tomé and Príncipe', 'SV': 'El Salvador',
            'SX': 'Sint Maarten', 'SY': 'Syria', 'SZ': 'Eswatini', 'TC': 'Turks and Caicos Islands', 'TD': 'Chad',
            'TF': 'French Southern Territories', 'TG': 'Togo', 'TH': 'Thailand', 'TJ': 'Tajikistan', 'TK': 'Tokelau',
            'TL': 'Timor-Leste', 'TM': 'Turkmenistan', 'TN': 'Tunisia', 'TO': 'Tonga', 'TR': 'Turkey',
            'TT': 'Trinidad and Tobago', 'TV': 'Tuvalu', 'TW': 'Taiwan', 'TZ': 'Tanzania', 'UA': 'Ukraine',
            'UG': 'Uganda', 'UM': 'United States Minor Outlying Islands', 'US': 'United States', 'US-HI': 'Hawaii', 'UY': 'Uruguay', 'UZ': 'Uzbekistan',
            'VA': 'Vatican City', 'VC': 'Saint Vincent and the Grenadines', 'VE': 'Venezuela', 'VG': 'British Virgin Islands', 'VI': 'U.S. Virgin Islands',
            'VN': 'Vietnam', 'VU': 'Vanuatu', 'WF': 'Wallis and Futuna', 'WS': 'Samoa', 'XK': 'Kosovo', 'YE': 'Yemen',
            'YT': 'Mayotte', 'ZA': 'South Africa', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
        };
        
        // Список региональных кодов, которые нужно исключить
        const regionalCodes = [
            'AFRICA', 'ASIA', 'EU LITE', 'EUROPE LITE', 'EUROPE', 'EU', 'EUL',
            'NORTH AMERICA', 'NORTHAMERICA', 'AMERICAS', 'AMERICA', 'LATAM', 'LATIN AMERICA',
            'CARIBBEAN', 'CARIB', 'CENAM', 'CENTRAL AMERICA',
            'OCEANIA', 'BALKANAS', 'BALKANS', 'CIS', 'CENTRAL EURASIA'
        ];
        
        allBundles.forEach(bundle => {
            const countries = bundle.countries || [];
            countries.forEach(country => {
                let countryCode = null;
                let countryName = null;
                
                if (typeof country === 'string') {
                    countryCode = country.toUpperCase();
                    // Пропускаем региональные коды
                    if (regionalCodes.includes(countryCode)) {
                        return;
                    }
                    countryName = isoToCountryName[countryCode] || countryCode;
                } else if (typeof country === 'object' && country !== null) {
                    countryCode = (country.iso || country.ISO || country.code || '').toUpperCase();
                    countryName = country.name || country.Name || '';
                    
                    // Пропускаем региональные коды и названия
                    const countryNameUpper = countryName.toUpperCase();
                    if (regionalCodes.includes(countryCode) || regionalCodes.includes(countryNameUpper)) {
                        return;
                    }
                    
                    // Если название не указано, используем маппинг
                    if (!countryName && countryCode) {
                        countryName = isoToCountryName[countryCode] || countryCode;
                    }
                }
                
                // Добавляем только валидные ISO коды стран (2-5 символов, не региональные коды)
                if (countryCode && 
                    countryCode.length >= 2 && countryCode.length <= 5 && 
                    !regionalCodes.includes(countryCode) &&
                    !countriesMap.has(countryCode)) {
                    countriesMap.set(countryCode, {
                        code: countryCode,
                        name: countryName || countryCode
                    });
                }
            });
        });
        
        const countries = Array.from(countriesMap.values())
            .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
        
        console.log('Region plans grouped:', {
            region: region,
            apiRegions: apiRegions,
            standardPlans: plans.standard.length,
            totalBundles: allBundles.length,
            countriesCount: countries.length
        });
        
        const responseData = {
            standard: plans.standard,
            unlimited: [], // Для регионов всегда пустой массив
            total: plans.standard.length,
            countries: countries // Добавляем список стран из API
        };
        
        const responseMeta = {
            region: region,
            apiRegions: apiRegions,
            bundlesCount: allBundles.length,
            countriesCount: countries.length
        };
        
        // Сохраняем в кэш перед отправкой ответа
        cache.set(cacheKey, {
            data: responseData,
            meta: responseMeta
        });
        console.log('💾 Cached region plans data for:', region);
        
        return res.status(200).json({
            success: true,
            data: responseData,
            meta: responseMeta
        });
        
    } catch (error) {
        console.error('Region plans API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch region plans'
        });
    }
};

