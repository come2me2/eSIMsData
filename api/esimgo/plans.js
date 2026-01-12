/**
 * eSIM Go API - Получение планов (тарифов) для страны/региона
 * Endpoint: GET /api/esimgo/plans
 * 
 * Параметры:
 * - country: код страны (ISO, опционально)
 * - region: название региона (опционально)
 * - groupBy: группировка (duration, dataAmount, unlimited)
 * 
 * Возвращает структурированные планы с реальными ценами из каталога
 */

// Загружаем client модуль в начале файла
let esimgoClient;
try {
    esimgoClient = require('../_lib/esimgo/client');
    if (!esimgoClient || !esimgoClient.getCatalogue) {
        throw new Error('Client module loaded but getCatalogue function not found');
    }
} catch (error) {
    console.error('CRITICAL: Failed to load client module:', {
        message: error.message,
        stack: error.stack,
        name: error.name
    });
    // Не устанавливаем esimgoClient, чтобы проверка сработала
}

// Загружаем модуль кэширования
const cache = require('../_lib/cache');

// Используем общий модуль для настроек наценки (с централизованным кэшем)
const { loadMarkupSettings, applyMarkup, applyMarkupToPlans } = require('../_lib/markup-settings');

/**
 * Группировка bundles в планы
 * @param {Array} bundles - массив bundles
 * @param {boolean} isLocal - является ли это Local запросом (для Local показываем все тарифы, без агрессивной дедупликации)
 */
function groupBundlesIntoPlans(bundles, isLocal = false) {
    const plans = {
        standard: [],
        unlimited: []
    };
    
    // Группируем по типу (unlimited или нет)
    bundles.forEach(bundle => {
        // Извлекаем СЕБЕСТОИМОСТЬ из разных возможных форматов
        // ВАЖНО: Нужна себестоимость (cost/basePrice), а не цена для пользователя (price/userPrice)
        // API eSIM Go может возвращать цену в разных полях
        let priceValue = 0;
        let currency = 'USD';
        
        // Пробуем разные поля для СЕБЕСТОИМОСТИ (приоритет: cost > basePrice > pricePerUnit > amount > price)
        // cost и basePrice - это себестоимость, price и userPrice - это цена для пользователя (может быть с наценкой)
        const priceFields = [
            bundle.cost,           // Себестоимость (приоритет 1)
            bundle.basePrice,      // Базовая цена/себестоимость (приоритет 2)
            bundle.pricePerUnit,   // Цена за единицу (может быть себестоимость)
            bundle.amount,         // Сумма
            bundle.price,          // Цена (может быть уже с наценкой, используем только если нет cost/basePrice)
            bundle.fee,            // Комиссия
            bundle.totalPrice,     // Общая цена
            bundle.userPrice       // Цена для пользователя (последний приоритет, может быть с наценкой)
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
        
        // Если цена в центах (больше 100 и меньше 100000), конвертируем в доллары
        // Но только если это выглядит как цена в центах (например, 999 для $9.99)
        if (priceValue > 100 && priceValue < 100000 && priceValue % 1 === 0) {
            // Проверяем, не является ли это уже ценой в долларах (например, 9.99)
            // Если цена целое число и больше 100, вероятно это центы
            priceValue = priceValue / 100;
        }
        
        // Получаем валюту из bundle
        if (bundle.currency) {
            currency = bundle.currency;
        } else if (bundle.price && typeof bundle.price === 'object' && bundle.price.currency) {
            currency = bundle.price.currency;
        } else if (bundle.priceCurrency) {
            currency = bundle.priceCurrency;
        }
        
        // Логируем, если цена не найдена
        if (priceValue <= 0) {
            console.warn('Price extraction failed for bundle:', {
                name: bundle.name,
                availableFields: Object.keys(bundle).filter(k => 
                    k.toLowerCase().includes('price') || 
                    k.toLowerCase().includes('cost') || 
                    k.toLowerCase().includes('amount') ||
                    k.toLowerCase().includes('fee')
                ),
                price: bundle.price,
                priceType: typeof bundle.price,
                pricePerUnit: bundle.pricePerUnit,
                cost: bundle.cost,
                amount: bundle.amount,
                userPrice: bundle.userPrice,
                basePrice: bundle.basePrice,
                allKeys: Object.keys(bundle)
            });
        } else {
            // Для Global bundles логируем успешное извлечение цены с деталями
            if (bundle.name && (bundle.name.includes('RGB') || bundle.name.includes('Global'))) {
                // Определяем, какое поле было использовано
                let usedField = 'unknown';
                if (bundle.cost && priceValue === (typeof bundle.cost === 'number' ? bundle.cost : parseFloat(bundle.cost))) {
                    usedField = 'cost';
                } else if (bundle.basePrice && priceValue === (typeof bundle.basePrice === 'number' ? bundle.basePrice : parseFloat(bundle.basePrice))) {
                    usedField = 'basePrice';
                } else if (bundle.price && priceValue === (typeof bundle.price === 'number' ? bundle.price : parseFloat(bundle.price))) {
                    usedField = 'price';
                } else if (bundle.pricePerUnit && priceValue === (typeof bundle.pricePerUnit === 'number' ? bundle.pricePerUnit : parseFloat(bundle.pricePerUnit))) {
                    usedField = 'pricePerUnit';
                }
                
                console.log('✅ Price extracted for Global bundle:', {
                    name: bundle.name,
                    priceValue: priceValue,
                    currency: currency,
                    usedField: usedField,
                    availableFields: {
                        cost: bundle.cost,
                        basePrice: bundle.basePrice,
                        price: bundle.price,
                        pricePerUnit: bundle.pricePerUnit,
                        userPrice: bundle.userPrice,
                        amount: bundle.amount
                    },
                    source: 'groupBundlesIntoPlans'
                });
            }
        }
        
        // Пропускаем bundles без цены или с нулевой ценой
        if (priceValue <= 0) {
            console.warn('Skipping bundle with zero or missing price:', {
                name: bundle.name,
                price: bundle.price,
                pricePerUnit: bundle.pricePerUnit,
                priceType: typeof bundle.price
            });
            return;
        }
        
        // НЕ применяем наценку здесь - она будет применена при возврате данных
        // Это предотвращает двойное применение наценки (при создании и при возврате из кэша)
        
        const priceFormatted = currency === 'USD' 
            ? `$ ${priceValue.toFixed(2)}`
            : `${currency} ${priceValue.toFixed(2)}`;
        
        const plan = {
            id: bundle.name, // Используем bundle name как ID
            bundle_name: bundle.name,
            data: bundle.unlimited ? '∞ GB' : `${bundle.dataAmount / 1000} GB`,
            dataAmount: bundle.dataAmount,
            duration: `${bundle.duration} Days`,
            durationDays: bundle.duration,
            price: priceFormatted,
            priceValue: priceValue,
            currency: currency,
            unlimited: bundle.unlimited || false,
            countries: bundle.countries || [],
            description: bundle.description || ''
        };
        
        if (bundle.unlimited) {
            plans.unlimited.push(plan);
        } else {
            plans.standard.push(plan);
        }
    });
    
    // Дедупликация стандартных планов
    if (isLocal) {
        // Для Local планов: показываем ВСЕ тарифы без дедупликации
        // Просто нормализуем priceValue и сортируем
        plans.standard.forEach(plan => {
            const priceValue = typeof plan.priceValue === 'number' ? plan.priceValue : parseFloat(plan.priceValue) || 0;
            plan.priceValue = priceValue;
        });
        
        // Сортируем по длительности, затем по объему данных, затем по цене
        plans.standard.sort((a, b) => {
            if (a.durationDays !== b.durationDays) {
                return a.durationDays - b.durationDays;
            }
            if (a.dataAmount !== b.dataAmount) {
                return a.dataAmount - b.dataAmount;
            }
            return a.priceValue - b.priceValue;
        });
    } else {
        // Для Global/Region планов: оставляем только один вариант с минимальной ценой для каждой комбинации длительности и объема данных
        const standardMap = new Map();
        plans.standard.forEach(plan => {
            const priceValue = typeof plan.priceValue === 'number' ? plan.priceValue : parseFloat(plan.priceValue) || 0;
            plan.priceValue = priceValue;
            
            // Ключ: комбинация длительности и объема данных
            const key = `${plan.durationDays}_${plan.dataAmount}`;
            
            if (!standardMap.has(key)) {
                standardMap.set(key, plan);
            } else {
                // Если уже есть план с такой комбинацией, выбираем с минимальной ценой
                const existing = standardMap.get(key);
                const existingPrice = typeof existing.priceValue === 'number' ? existing.priceValue : parseFloat(existing.priceValue) || 0;
                
                // Если валюта одинаковая, выбираем минимальную цену
                // Если валюта разная, оставляем USD или первую найденную
                if (plan.currency === existing.currency) {
                    if (priceValue < existingPrice) {
                        standardMap.set(key, plan);
                    }
                } else if (plan.currency === 'USD' && existing.currency !== 'USD') {
                    // Предпочитаем USD если есть выбор
                    standardMap.set(key, plan);
                } else if (existing.currency === 'USD' && plan.currency !== 'USD') {
                    // Оставляем существующий USD план
                    // Ничего не делаем
                } else if (priceValue < existingPrice) {
                    // Если валюты разные и обе не USD, выбираем минимальную цену
                    standardMap.set(key, plan);
                }
            }
        });
        
        // Преобразуем Map обратно в массив и сортируем
        plans.standard = Array.from(standardMap.values()).sort((a, b) => {
            // Сначала по длительности, потом по объему данных
            if (a.durationDays !== b.durationDays) {
                return a.durationDays - b.durationDays;
            }
            return a.dataAmount - b.dataAmount;
        });
    }
    
    console.log('Standard plans after deduplication:', {
        count: plans.standard.length,
        plans: plans.standard.map(p => ({ duration: p.durationDays, data: p.dataAmount, price: p.priceValue, currency: p.currency }))
    });
    
    // Дедупликация безлимитных планов
    if (isLocal) {
        // Для Local планов: показываем ВСЕ тарифы без дедупликации
        // Просто нормализуем priceValue и сортируем
        plans.unlimited.forEach(plan => {
            const priceValue = typeof plan.priceValue === 'number' ? plan.priceValue : parseFloat(plan.priceValue) || 0;
            plan.priceValue = priceValue;
        });
        
        // Сортируем по длительности, затем по цене
        plans.unlimited.sort((a, b) => {
            if (a.durationDays !== b.durationDays) {
                return a.durationDays - b.durationDays;
            }
            return a.priceValue - b.priceValue;
        });
    } else {
        // Для Global/Region планов: оставляем только один вариант с минимальной ценой для каждой длительности
        const unlimitedMap = new Map();
        plans.unlimited.forEach(plan => {
            const key = plan.durationDays;
            const priceValue = typeof plan.priceValue === 'number' ? plan.priceValue : parseFloat(plan.priceValue) || 0;
            plan.priceValue = priceValue;
            
            if (!unlimitedMap.has(key)) {
                unlimitedMap.set(key, plan);
            } else {
                // Если уже есть план с такой длительностью, выбираем с минимальной ценой
                // Учитываем валюту: сравниваем только планы с одинаковой валютой
                const existing = unlimitedMap.get(key);
                const existingPrice = typeof existing.priceValue === 'number' ? existing.priceValue : parseFloat(existing.priceValue) || 0;
                
                // Если валюта одинаковая, выбираем минимальную цену
                // Если валюта разная, оставляем USD или первую найденную
                if (plan.currency === existing.currency) {
                    if (priceValue < existingPrice) {
                        unlimitedMap.set(key, plan);
                    }
                } else if (plan.currency === 'USD' && existing.currency !== 'USD') {
                    // Предпочитаем USD если есть выбор
                    unlimitedMap.set(key, plan);
                } else if (existing.currency === 'USD' && plan.currency !== 'USD') {
                    // Оставляем существующий USD план
                    // Ничего не делаем
                } else if (priceValue < existingPrice) {
                    // Если валюты разные и обе не USD, выбираем минимальную цену
                    unlimitedMap.set(key, plan);
                }
            }
        });
        
        // Преобразуем Map обратно в массив и сортируем
        plans.unlimited = Array.from(unlimitedMap.values()).sort((a, b) => {
            return a.durationDays - b.durationDays;
        });
    }
    
    console.log('Unlimited plans after deduplication:', {
        count: plans.unlimited.length,
        plans: plans.unlimited.map(p => ({ duration: p.durationDays, price: p.priceValue, currency: p.currency }))
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
    
    // Проверяем наличие API ключа сразу
    if (!process.env.ESIMGO_API_KEY) {
        console.error('ESIMGO_API_KEY not found in environment variables');
        return res.status(500).json({
            success: false,
            error: 'ESIMGO_API_KEY not configured',
            data: {
                standard: [],
                unlimited: [],
                total: 0
            }
        });
    }
    
    try {
        const { country, region, perPage = 1000, category } = req.query;
        
        console.log('Plans API request:', { country, region, perPage, category });
        console.log('ESIMGO_API_KEY exists:', !!process.env.ESIMGO_API_KEY);
        
        const countryCode = country ? country.toUpperCase() : null;
        const isGlobal = category === 'global' || req.query.global === 'true';
        // Для Local: если есть countryCode и нет region, и category не 'global' - это Local
        const isLocal = category === 'local' || (countryCode && !region && category !== 'global');
        
        // Маппинг ISO кодов на названия стран (используется для Global и Local)
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
        
        // Определяем ключ кэша для всех типов запросов
        // Для Local явно указываем category='local' в ключе кэша, чтобы каждая страна имела свой кэш
        const effectiveCategory = isLocal ? 'local' : (isGlobal ? 'global' : category);
        const cacheKey = cache.getPlansCacheKey(countryCode, region, effectiveCategory);
        
        // ВАЖНО: Пользователи видят ТОЛЬКО предзаполненный кэш
        // forceRefresh доступен только через секретный ключ (для админов/обновления кэша)
        const forceRefreshSecret = process.env.CACHE_REFRESH_SECRET || 'change-me-in-production';
        const providedSecret = req.query.secret || req.headers['x-cache-refresh-secret'] || req.headers['authorization']?.replace('Bearer ', '');
        
        // Проверяем, является ли это принудительным обновлением с валидным секретом
        const isForceRefreshRequest = req.query.forceRefresh === 'true' || req.query.refresh === 'true';
        const hasValidSecret = forceRefreshSecret !== 'change-me-in-production' && providedSecret === forceRefreshSecret;
        const forceRefresh = isForceRefreshRequest && hasValidSecret;
        
        // Если запрошен forceRefresh без валидного секрета, игнорируем его
        if (isForceRefreshRequest && !hasValidSecret) {
            console.warn('⚠️ Force refresh requested without valid secret, ignoring and using cache');
        }
        
        // Проверяем кэш перед запросом к API
        // Для обычных пользователей ВСЕГДА используем кэш, если он есть
        const cachedData = cache.get(cacheKey, cache.getTTL('plans'));
        if (cachedData && cachedData.data) {
            // Если это не принудительное обновление с валидным секретом, возвращаем кэш
            if (!forceRefresh) {
                console.log('✅ Using cached plans data for:', cacheKey);
                // КРИТИЧЕСКИ ВАЖНО: Создаем глубокую копию кэшированных данных перед применением наценки
                // Это предотвращает мутацию данных в кэше
                const cachedDataCopy = JSON.parse(JSON.stringify(cachedData.data));
                
                // Логируем цену в кэше ПЕРЕД применением наценки
                // ВАЖНО: В кэше всегда должна быть себестоимость БЕЗ наценки
                // Наценка применяется при чтении из кэша
                if (isGlobal && cachedDataCopy.standard && cachedDataCopy.standard.length > 0) {
                    const samplePlan = cachedDataCopy.standard[0];
                    console.log('🔍 Reading from cache (BEFORE markup):', {
                        bundle_name: samplePlan.bundle_name,
                        priceValue: samplePlan.priceValue,
                        price: samplePlan.price
                    });
                }
                
                // Проверяем, нужно ли возвращать данные БЕЗ наценки (для генерации статических файлов)
                const noMarkup = req.query.noMarkup === 'true' || req.query.noMarkup === '1';
                
                // Применяем наценку к копии кэшированных данных
                // Для Global тарифов countryCode = null, но наценка должна применяться
                // Передаем null для Global, чтобы применить только базовую наценку
                // НО: если noMarkup=true, возвращаем данные БЕЗ наценки (для статических файлов)
                // ВАЖНО: В кэше всегда себестоимость БЕЗ наценки, поэтому наценку применяем ВСЕГДА (если noMarkup=false)
                const dataWithMarkup = noMarkup
                    ? cachedDataCopy  // Возвращаем БЕЗ наценки для статических файлов
                    : applyMarkupToPlans(cachedDataCopy, isGlobal ? null : countryCode);
                
                // Логируем цену ПОСЛЕ применения наценки
                if (isGlobal && dataWithMarkup.standard && dataWithMarkup.standard.length > 0) {
                    const samplePlan = dataWithMarkup.standard[0];
                    console.log('📤 Returning from cache (AFTER markup):', {
                        bundle_name: samplePlan.bundle_name,
                        priceValue: samplePlan.priceValue,
                        price: samplePlan.price
                    });
                }
                return res.status(200).json({
                    success: true,
                    data: dataWithMarkup,
                    meta: {
                        ...cachedData.meta,
                        source: 'cache'
                    }
                });
            } else {
                // Принудительное обновление с валидным секретом - очищаем кэш
                console.log('🔄 Force refresh requested (with valid secret), clearing cache for:', cacheKey);
                cache.clear(cacheKey);
            }
        } else if (!cachedData || !cachedData.data) {
            // Если кэш пуст, логируем предупреждение
            console.warn('⚠️ Cache is empty for:', cacheKey, '- fetching from API. Consider running /api/cache/prefill first.');
        }
        
        // Извлекаем уникальные страны из bundles (для Global и Local)
        // Определяем countriesMap заранее, чтобы он был доступен во всех блоках
        const countriesMap = new Map();
        
        // Получаем каталог из API eSIM Go
        const catalogueOptions = {
            perPage: parseInt(perPage)
        };
        
        // Для Region используем параметр region
        if (region) {
            catalogueOptions.region = region;
        }
        
        // Функция для проверки, является ли bundle Global
        function isGlobalBundle(bundle) {
            const countries = bundle.countries || [];
            const name = (bundle.name || '').toLowerCase();
            const desc = (bundle.description || '').toLowerCase();
            
            // Проверяем, есть ли "Global" в названии или описании
            if (name.includes('global') || desc.includes('global')) {
                return true;
            }
            
            // Проверяем countries - возможно, есть специальное значение "Global"
            if (countries.length > 0) {
                // Если countries - массив объектов, проверяем name или iso
                const hasGlobalCountry = countries.some(country => {
                    if (typeof country === 'string') {
                        return country.toUpperCase() === 'GLOBAL';
                    } else if (typeof country === 'object' && country !== null) {
                        const countryName = (country.name || '').toLowerCase();
                        const countryIso = (country.iso || country.ISO || country.code || '').toUpperCase();
                        return countryName === 'global' || countryIso === 'GLOBAL';
                    }
                    return false;
                });
                if (hasGlobalCountry) {
                    return true;
                }
            }
            
            // Проверяем паттерны в названии (RGBS, RGB - Global bundles)
            // Проверяем как в lowercase, так и в оригинальном регистре
            const nameOriginal = bundle.name || '';
            if (name.includes('rgbs') || name.includes('rgb') || 
                nameOriginal.includes('RGBS') || nameOriginal.includes('RGB') ||
                name.includes('world') || name.includes('worldwide') ||
                nameOriginal.includes('WORLD') || nameOriginal.includes('WORLDWIDE')) {
                return true;
            }
            
            // Также проверяем паттерны с подчеркиваниями: _RGB_, _RGBS_, _RGB_V2 и т.д.
            if (name.includes('_rgb') || name.includes('_rgbs') ||
                nameOriginal.includes('_RGB') || nameOriginal.includes('_RGBS')) {
                return true;
            }
            
            return false;
        }
        
        // Для Global запрашиваем bundles из двух групп: "Standard Fixed" и "Standard Unlimited Essential"
        // Для Local запрашиваем конкретную страну
        // Для Region используем параметр region
        let bundles = [];
        
        if (isGlobal) {
            // Global: запрашиваем из двух групп отдельно
            console.log('Fetching Global bundles from groups: Standard Fixed and Standard Unlimited Essential');
            
            // Проверяем, что client загружен
            if (!esimgoClient) {
                const errorMsg = 'eSIM Go client module failed to load. Check server logs for details.';
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            if (typeof esimgoClient.getCatalogue !== 'function') {
                const errorMsg = 'getCatalogue function not found in client module';
                console.error(errorMsg, { clientKeys: Object.keys(esimgoClient) });
                throw new Error(errorMsg);
            }
            
            // Оптимизация: загружаем Standard Fixed и Standard Unlimited Essential параллельно
            // Также используем параллельную загрузку страниц пагинации
            try {
                // Функция для загрузки всех страниц группы с пагинацией
                async function fetchAllPages(groupName) {
                    let allBundles = [];
                    let page = 1;
                    const perPage = 1000;
                    let hasMore = true;
                    const maxPages = 50;
                    
                    // Сначала получаем первую страницу, чтобы узнать общее количество страниц
                    const firstPageOptions = {
                        ...catalogueOptions,
                        group: groupName,
                        perPage: perPage,
                        page: 1
                    };
                    console.log(`Fetching ${groupName} bundles for Global, page 1...`);
                    const firstCatalogue = await esimgoClient.getCatalogue(null, firstPageOptions);
                    const firstBundles = Array.isArray(firstCatalogue) 
                        ? firstCatalogue 
                        : (firstCatalogue?.bundles || firstCatalogue?.data || []);
                    
                    allBundles = allBundles.concat(firstBundles);
                    console.log(`${groupName} bundles received on page 1:`, firstBundles.length);
                    
                    // Определяем общее количество страниц
                    const pageCount = firstCatalogue?.pageCount || 0;
                    const totalRows = firstCatalogue?.rows || 0;
                    
                    if (pageCount > 1 || (totalRows > 0 && firstBundles.length < totalRows)) {
                        // Загружаем остальные страницы параллельно (батчами по 5 страниц)
                        const pagesToFetch = [];
                        const maxPage = Math.min(pageCount || maxPages, maxPages);
                        
                        for (let p = 2; p <= maxPage; p++) {
                            pagesToFetch.push(p);
                        }
                        
                        // Загружаем страницы батчами по 5 параллельно
                        const batchSize = 5;
                        for (let i = 0; i < pagesToFetch.length; i += batchSize) {
                            const batch = pagesToFetch.slice(i, i + batchSize);
                            console.log(`Fetching ${groupName} bundles for Global, pages ${batch.join(', ')}...`);
                            
                            const batchPromises = batch.map(pageNum => {
                                const options = {
                                    ...catalogueOptions,
                                    group: groupName,
                                    perPage: perPage,
                                    page: pageNum
                                };
                                return esimgoClient.getCatalogue(null, options).catch(err => {
                                    console.error(`Error fetching ${groupName} page ${pageNum}:`, err.message);
                                    return null; // Возвращаем null при ошибке
                                });
                            });
                            
                            const batchResults = await Promise.all(batchPromises);
                            
                            batchResults.forEach((catalogue, idx) => {
                                if (!catalogue) {
                                    console.warn(`⚠️ Failed to fetch ${groupName} page ${batch[idx]}`);
                                    return;
                                }
                                const pageBundles = Array.isArray(catalogue) 
                                    ? catalogue 
                                    : (catalogue?.bundles || catalogue?.data || []);
                                if (pageBundles && pageBundles.length > 0) {
                                    allBundles = allBundles.concat(pageBundles);
                                    console.log(`${groupName} bundles received on page ${batch[idx]}:`, pageBundles.length);
                                }
                            });
                        }
                    }
                    
                    console.log(`Total ${groupName} bundles received:`, allBundles.length);
                    return allBundles;
                }
                
                // Загружаем обе группы параллельно
                console.log('Fetching Global bundles from both groups in parallel...');
                const [allFixedBundles, allUnlimitedBundles] = await Promise.all([
                    fetchAllPages('Standard Fixed').catch(err => {
                        console.error('Error in fetchAllPages for Standard Fixed:', err.message);
                        return [];
                    }),
                    fetchAllPages('Standard Unlimited Essential').catch(err => {
                        console.error('Error in fetchAllPages for Standard Unlimited Essential:', err.message);
                        return [];
                    })
                ]);
                
                // Фильтруем по country = "Global"
                const globalFixedBundles = allFixedBundles.filter(bundle => {
                    const isGlobal = isGlobalBundle(bundle);
                    if (!isGlobal && bundle.name) {
                        // Логируем примеры отфильтрованных bundles для отладки
                        if (bundle.name.includes('RGB') || bundle.name.includes('RGBS')) {
                            console.log('❌ Bundle с RGB отфильтрован (не Global):', {
                                name: bundle.name,
                                countries: bundle.countries,
                                description: bundle.description
                            });
                        }
                    }
                    return isGlobal;
                });
                
                const globalUnlimitedBundles = allUnlimitedBundles.filter(bundle => {
                    return isGlobalBundle(bundle);
                });
                
                console.log('Global Fixed bundles after filter:', globalFixedBundles.length);
                console.log('Global Unlimited bundles after filter:', globalUnlimitedBundles.length);
                
                if (globalFixedBundles.length > 0) {
                    console.log('Sample Global Fixed bundles:', globalFixedBundles.slice(0, 5).map(b => ({
                        name: b.name,
                        countries: b.countries,
                        price: b.price,
                        priceType: typeof b.price,
                        pricePerUnit: b.pricePerUnit,
                        cost: b.cost,
                        amount: b.amount,
                        userPrice: b.userPrice,
                        basePrice: b.basePrice,
                        allPriceFields: Object.keys(b).filter(k => 
                            k.toLowerCase().includes('price') || 
                            k.toLowerCase().includes('cost') || 
                            k.toLowerCase().includes('amount') ||
                            k.toLowerCase().includes('fee')
                        )
                    })));
                }
                
                bundles = bundles.concat(globalFixedBundles, globalUnlimitedBundles);
                
                // Для Global используем предопределенный список из 106 стран
                // Этот список соответствует актуальным странам, поддерживаемым Global планами в eSIM Go API
                const globalCountryCodes = [
                    'AT', 'DK', 'IE', 'IT', 'SE', 'IM', 'FR', 'BG', 'CY', 'EE', 'FI', 'GR', 'HU', 'LV', 'LT', 'NL', 'NO', 'PL', 'RO', 'SK',
                    'ES', 'GB', 'TR', 'DE', 'MT', 'CH', 'BE', 'HR', 'CZ', 'LI', 'LU', 'PT', 'SI', 'IS', 'UA', 'JE', 'SG', 'MO', 'HK', 'IL',
                    'AX', 'ID', 'VN', 'RU', 'AE', 'AU', 'TH', 'TW', 'LK', 'MY', 'PK', 'UZ', 'EG', 'NZ', 'AL', 'KR', 'CA', 'KZ', 'MD', 'MK',
                    'KW', 'MX', 'GG', 'JO', 'OM', 'GI', 'MA', 'BR', 'CL', 'RS', 'JP', 'ME', 'GU', 'US', 'TZ', 'UG', 'CR', 'EC', 'NI', 'IN',
                    'AR', 'SV', 'PE', 'UY', 'CN', 'PA', 'RE', 'TN', 'BA', 'ZA', 'ZM', 'MG', 'NG', 'KE', 'AD', 'IQ', 'QA', 'SC', 'MU', 'CO',
                    'GT', 'CM', 'GY', 'SA', 'PY', 'BO'
                ];
                
                console.log(`✅ Using predefined list of ${globalCountryCodes.length} countries for Global plans`);
                
                // Добавляем все страны из предопределенного списка в countriesMap
                globalCountryCodes.forEach(countryCode => {
                    if (!countriesMap.has(countryCode)) {
                        countriesMap.set(countryCode, {
                            code: countryCode,
                            name: isoToCountryName[countryCode] || countryCode
                        });
                    }
                });
                
                console.log(`✅ Added ${globalCountryCodes.length} countries from predefined list to countriesMap for Global`);
            } catch (error) {
                console.error('Error fetching Global bundles:', {
                    message: error.message,
                    stack: error.stack
                });
                // Не сохраняем пустые данные в кэш при ошибке
                throw error;
            }
            
            console.log('Total Global bundles:', bundles.length);
            
            // Проверяем, что bundles не пустой
            if (bundles.length === 0) {
                console.warn('⚠️ No Global bundles found, skipping cache');
                // Не сохраняем в кэш, если bundles пустой
            }
        } else if (isLocal && countryCode) {
            // Local: запрашиваем из двух групп отдельно (как для Global)
            console.log('Fetching Local bundles from groups: Standard Fixed and Standard Unlimited Essential');
            
            // Проверяем, что client загружен
            if (!esimgoClient) {
                const errorMsg = 'eSIM Go client module failed to load. Check server logs for details.';
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            if (typeof esimgoClient.getCatalogue !== 'function') {
                const errorMsg = 'getCatalogue function not found in client module';
                console.error(errorMsg, { clientKeys: Object.keys(esimgoClient) });
                throw new Error(errorMsg);
            }
            
            // Функция для проверки, является ли bundle Local (для одной страны)
            function isLocalBundle(bundle, targetCountryCode) {
                const countries = bundle.countries || [];
                const bundleCountry = bundle.country || bundle.countryCode || bundle.iso;
                const bundleName = (bundle.name || '').toUpperCase();
                
                // Специальная обработка для Northern Cyprus (CYP) - НЕ принимаем CY без "Northern"
                // Для CYP принимаем только bundles с CYP или "Northern Cyprus", но НЕ CY
                // Для CY принимаем только bundles с CY, но НЕ CYP
                
                // Строгая проверка для CYP: исключаем bundles с CY (Cyprus)
                if (targetCountryCode === 'CYP') {
                    // Проверяем, не является ли это bundle из Cyprus (CY без "Northern")
                    const hasCY = bundleName.includes('_CY_') || bundleName.includes('_CY ') || 
                                 bundleName.endsWith('_CY') || bundleName.startsWith('CY_');
                    const hasCYP = bundleName.includes('_CYP_') || bundleName.includes('_CYP ') || 
                                  bundleName.endsWith('_CYP') || bundleName.startsWith('CYP_');
                    
                    // Если есть CY, но нет CYP, и нет "NORTHERN" в названии - это Cyprus, не Northern Cyprus
                    if (hasCY && !hasCYP && !bundleName.includes('NORTHERN')) {
                        return false;
                    }
                    
                    // Проверяем countries - если там CY без "Northern", это не Northern Cyprus
                    if (countries.length === 1) {
                        const country = countries[0];
                        if (typeof country === 'string') {
                            if (country.toUpperCase() === 'CY') {
                                return false; // Это Cyprus, не Northern Cyprus
                            }
                        } else if (typeof country === 'object' && country !== null) {
                            const countryIso = (country.iso || country.ISO || country.code || '').toUpperCase();
                            const countryName = (country.name || country.Name || '').toUpperCase();
                            if (countryIso === 'CY' && !countryName.includes('NORTHERN')) {
                                return false; // Это Cyprus, не Northern Cyprus
                            }
                        }
                    }
                    
                    // Проверяем bundleCountry
                    if (bundleCountry && String(bundleCountry).toUpperCase() === 'CY') {
                        // Проверяем, есть ли в bundle указание на "Northern"
                        const bundleCountryName = bundle.country_name || bundle.countryName || '';
                        if (!bundleCountryName.toUpperCase().includes('NORTHERN')) {
                            return false; // Это Cyprus, не Northern Cyprus
                        }
                    }
                }
                
                // Строгая проверка для CY: исключаем bundles с CYP
                if (targetCountryCode === 'CY') {
                    const hasCYP = bundleName.includes('_CYP_') || bundleName.includes('_CYP ') || 
                                  bundleName.endsWith('_CYP') || bundleName.startsWith('CYP_');
                    if (hasCYP) {
                        return false; // Это Northern Cyprus, не Cyprus
                    }
                    
                    // Проверяем countries - если там CYP, это не Cyprus
                    if (countries.length === 1) {
                        const country = countries[0];
                        if (typeof country === 'string') {
                            if (country.toUpperCase() === 'CYP') {
                                return false; // Это Northern Cyprus, не Cyprus
                            }
                        } else if (typeof country === 'object' && country !== null) {
                            const countryIso = (country.iso || country.ISO || country.code || '').toUpperCase();
                            const countryName = (country.name || country.Name || '').toUpperCase();
                            if (countryIso === 'CYP' || countryName.includes('NORTHERN')) {
                                return false; // Это Northern Cyprus, не Cyprus
                            }
                        }
                    }
                    
                    // Проверяем bundleCountry
                    if (bundleCountry && String(bundleCountry).toUpperCase() === 'CYP') {
                        return false; // Это Northern Cyprus, не Cyprus
                    }
                }
                
                // Универсальная проверка: если bundle содержит только одну страну И в названии есть код страны
                // Это помогает находить bundles даже если структура данных нестандартная
                if (countries.length === 1) {
                    // Проверяем паттерн в названии bundle (например, esim_20GB_30D_CYP_V2)
                    // Используем регулярное выражение для более гибкой проверки
                    const codePattern = new RegExp(`[^A-Z]${targetCountryCode}[^A-Z]|^${targetCountryCode}[^A-Z]|[^A-Z]${targetCountryCode}$|^${targetCountryCode}$`, 'i');
                    if (codePattern.test(bundleName)) {
                        console.log('✅ Bundle найден по паттерну в названии (универсальная проверка):', bundle.name);
                        return true;
                    }
                }
                
                // Проверяем паттерн в названии bundle (например, esim_20GB_30D_CYP_V2)
                if (bundleName.includes(`_${targetCountryCode}_`) || 
                    bundleName.includes(`_${targetCountryCode} `) ||
                    bundleName.endsWith(`_${targetCountryCode}`) ||
                    bundleName.startsWith(`${targetCountryCode}_`)) {
                    console.log('✅ Bundle найден по паттерну в названии:', bundle.name);
                    return true;
                }
                
                // Bundle должен содержать только одну страну и это должна быть запрошенная страна
                if (countries.length === 1) {
                    const country = countries[0];
                    // countries может быть массивом строк (ISO кодов) или объектов {name, region, iso}
                    if (typeof country === 'string') {
                        const countryUpper = country.toUpperCase();
                        if (countryUpper === targetCountryCode) {
                            return true;
                        }
                    } else if (typeof country === 'object' && country !== null) {
                        // Объект с полями iso, ISO, code, name
                        const countryIso = (country.iso || country.ISO || country.code || '').toUpperCase();
                        const countryName = (country.name || country.Name || '').toUpperCase();
                        
                        if (countryIso === targetCountryCode) {
                            return true;
                        }
                        
                        // Проверяем по названию страны (для Northern Cyprus)
                        if (targetCountryCode === 'CYP' && 
                            (countryName.includes('NORTHERN CYPRUS') || countryName === 'NORTHERN CYPRUS')) {
                            return true;
                        }
                    }
                }
                
                // Проверяем bundleCountry напрямую
                if (bundleCountry) {
                    const bundleCountryUpper = String(bundleCountry).toUpperCase();
                    if (bundleCountryUpper === targetCountryCode) {
                        return true;
                    }
                }
                
                return false;
            }
            
            // Запрос 1: Standard Fixed (fixed трафик) с пагинацией
            try {
                let allFixedBundles = [];
                let page = 1;
                const perPage = 1000;
                let hasMore = true;
                
                while (hasMore) {
                    const fixedOptions = {
                        ...catalogueOptions,
                        group: 'Standard Fixed',
                        perPage: perPage,
                        page: page
                    };
                    console.log(`Fetching Standard Fixed bundles for Local country ${countryCode}, page ${page}...`);
                    const fixedCatalogue = await esimgoClient.getCatalogue(null, fixedOptions);
                    const fixedBundles = Array.isArray(fixedCatalogue) 
                        ? fixedCatalogue 
                        : (fixedCatalogue?.bundles || fixedCatalogue?.data || []);
                    
                    allFixedBundles = allFixedBundles.concat(fixedBundles);
                    console.log(`Standard Fixed bundles received on page ${page}:`, fixedBundles.length);
                    
                    // Проверяем, есть ли еще страницы
                    if (fixedCatalogue?.pageCount && page < fixedCatalogue.pageCount) {
                        page++;
                    } else if (fixedCatalogue?.rows && allFixedBundles.length < fixedCatalogue.rows) {
                        page++;
                    } else if (fixedBundles.length < perPage) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                    
                    // Защита от бесконечного цикла
                    if (page > 50) {
                        console.warn('⚠️ Превышен лимит страниц (50), останавливаем пагинацию');
                        hasMore = false;
                    }
                }
                
                console.log('Total Standard Fixed bundles received:', allFixedBundles.length);
                
                // Фильтруем по countryCode (одна страна)
                const localFixedBundles = allFixedBundles.filter(bundle => {
                    return isLocalBundle(bundle, countryCode);
                });
                console.log('Local Fixed bundles after filter:', localFixedBundles.length);
                if (localFixedBundles.length > 0) {
                    console.log('Sample Local Fixed bundles:', localFixedBundles.slice(0, 5).map(b => ({
                        name: b.name,
                        dataAmount: b.dataAmount,
                        price: b.price,
                        countries: b.countries
                    })));
                }
                bundles = bundles.concat(localFixedBundles);
            } catch (error) {
                console.error('Error fetching Standard Fixed bundles for Local:', error.message);
            }
            
            // Запрос 2: Standard Unlimited Essential (unlimited трафик) с пагинацией
            try {
                let allUnlimitedBundles = [];
                let page = 1;
                const perPage = 1000;
                let hasMore = true;
                
                while (hasMore) {
                    const unlimitedOptions = {
                        ...catalogueOptions,
                        group: 'Standard Unlimited Essential',
                        perPage: perPage,
                        page: page
                    };
                    console.log(`Fetching Standard Unlimited Essential bundles for Local country ${countryCode}, page ${page}...`);
                    const unlimitedCatalogue = await esimgoClient.getCatalogue(null, unlimitedOptions);
                    const unlimitedBundles = Array.isArray(unlimitedCatalogue) 
                        ? unlimitedCatalogue 
                        : (unlimitedCatalogue?.bundles || unlimitedCatalogue?.data || []);
                    
                    allUnlimitedBundles = allUnlimitedBundles.concat(unlimitedBundles);
                    console.log(`Standard Unlimited Essential bundles received on page ${page}:`, unlimitedBundles.length);
                    
                    // Проверяем, есть ли еще страницы
                    if (unlimitedCatalogue?.pageCount && page < unlimitedCatalogue.pageCount) {
                        page++;
                    } else if (unlimitedCatalogue?.rows && allUnlimitedBundles.length < unlimitedCatalogue.rows) {
                        page++;
                    } else if (unlimitedBundles.length < perPage) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                    
                    // Защита от бесконечного цикла
                    if (page > 50) {
                        console.warn('⚠️ Превышен лимит страниц (50), останавливаем пагинацию');
                        hasMore = false;
                    }
                }
                
                console.log('Total Standard Unlimited Essential bundles received:', allUnlimitedBundles.length);
                
                // Фильтруем по countryCode (одна страна)
                const localUnlimitedBundles = allUnlimitedBundles.filter(bundle => {
                    return isLocalBundle(bundle, countryCode);
                });
                console.log('Local Unlimited bundles after filter:', localUnlimitedBundles.length);
                if (localUnlimitedBundles.length > 0) {
                    console.log('Sample Local Unlimited bundles:', localUnlimitedBundles.slice(0, 3).map(b => ({
                        name: b.name,
                        countries: b.countries,
                        price: b.price
                    })));
                }
                bundles = bundles.concat(localUnlimitedBundles);
            } catch (error) {
                console.error('Error fetching Standard Unlimited Essential bundles for Local:', {
                    message: error.message,
                    stack: error.stack
                });
                // Продолжаем, даже если одна группа не загрузилась
            }
            
            console.log('Total Local bundles:', bundles.length);
            
            // Проверяем, что bundles не пустой
            if (bundles.length === 0) {
                console.warn('⚠️ No Local bundles found for country:', countryCode);
            }
        } else {
            // Region: обычный запрос
            const requestCountryCode = null;
            
            console.log('Calling getCatalogue with:', { 
                countryCode: requestCountryCode, 
                options: catalogueOptions,
                category: region ? 'region' : 'all'
            });
        
        // Проверяем, что client загружен
        if (!esimgoClient) {
            const errorMsg = 'eSIM Go client module failed to load. Check server logs for details.';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        if (typeof esimgoClient.getCatalogue !== 'function') {
            const errorMsg = 'getCatalogue function not found in client module';
            console.error(errorMsg, { clientKeys: Object.keys(esimgoClient) });
            throw new Error(errorMsg);
        }
        
        let catalogue;
        try {
                catalogue = await esimgoClient.getCatalogue(requestCountryCode, catalogueOptions);
            console.log('Catalogue received:', {
                isArray: Array.isArray(catalogue),
                hasBundles: !!catalogue?.bundles,
                bundlesCount: Array.isArray(catalogue) ? catalogue.length : (catalogue?.bundles?.length || 0)
            });
        } catch (catalogueError) {
            console.error('Error getting catalogue:', {
                message: catalogueError.message,
                stack: catalogueError.stack,
                name: catalogueError.name
            });
            throw new Error(`Failed to get catalogue: ${catalogueError.message}`);
        }
        
        // Извлекаем bundles
            bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        }
        
        console.log('Bundles extracted from catalogue:', {
            total: bundles.length,
            category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all'))
        });
        
        // Логируем структуру первого bundle для отладки
        if (bundles.length > 0) {
            const sampleCountry = bundles[0].countries?.[0];
            console.log('Sample bundle structure:', {
                name: bundles[0].name,
                price: bundles[0].price,
                priceType: typeof bundles[0].price,
                pricePerUnit: bundles[0].pricePerUnit,
                currency: bundles[0].currency,
                countries: bundles[0].countries?.length || 0,
                firstCountry: sampleCountry,
                firstCountryType: typeof sampleCountry,
                dataAmount: bundles[0].dataAmount,
                duration: bundles[0].duration,
                unlimited: bundles[0].unlimited,
                bundleKeys: Object.keys(bundles[0])
            });
            
            // Для Global логируем примеры bundles с разным количеством стран и проверяем groups
            if (isGlobal) {
                const bundlesByCountryCount = {};
                const bundlesWithGroups = [];
                bundles.forEach(b => {
                    const count = b.countries?.length || 0;
                    if (!bundlesByCountryCount[count]) {
                        bundlesByCountryCount[count] = [];
                    }
                    if (bundlesByCountryCount[count].length < 2) {
                        bundlesByCountryCount[count].push({
                            name: b.name,
                            countriesCount: count,
                            firstCountry: b.countries?.[0]
                        });
                    }
                    // Проверяем groups для Global
                    if (b.groups && Array.isArray(b.groups) && b.groups.length > 0) {
                        if (bundlesWithGroups.length < 5) {
                            bundlesWithGroups.push({
                                name: b.name,
                                groups: b.groups,
                                description: b.description
                            });
                        }
                    }
                });
                console.log('Bundles by country count (for Global):', bundlesByCountryCount);
                console.log('Sample bundles with groups:', bundlesWithGroups);
                
                // Проверяем, есть ли bundles с "global" в названии или описании
                const globalNamedBundles = bundles.filter(b => {
                    const name = (b.name || '').toLowerCase();
                    const desc = (b.description || '').toLowerCase();
                    return name.includes('global') || desc.includes('global');
                });
                console.log('Bundles with "global" in name/description:', globalNamedBundles.length);
                if (globalNamedBundles.length > 0) {
                    console.log('Sample global-named bundles:', globalNamedBundles.slice(0, 3).map(b => ({
                        name: b.name,
                        description: b.description,
                        groups: b.groups
                    })));
                }
            }
        }
        
        // Фильтруем bundles по категории
        if (isLocal && countryCode) {
            // Local bundles уже получены из групп "Standard Fixed" и "Standard Unlimited Essential"
            // и отфильтрованы по isLocalBundle
            console.log('Local bundles already filtered from groups:', bundles.length);
        } else if (isGlobal) {
            // Global bundles уже получены из групп "Standard Fixed" и "Standard Unlimited Essential"
            // и отфильтрованы по isGlobalBundle
            console.log('Global bundles already filtered from groups:', bundles.length);
        }
        // Region: уже фильтруется через параметр region в API
        
        console.log('Bundles after filtering:', {
            count: bundles.length,
            category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all'))
        });
        
        if (!bundles || bundles.length === 0) {
            console.warn('No bundles found after filtering:', {
                category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
                country: countryCode,
                region: region,
                originalBundlesCount: Array.isArray(bundles) ? bundles.length : 0
            });
            return res.status(200).json({
                success: true,
                data: {
                    standard: [],
                    unlimited: [],
                    total: 0
                },
                meta: {
                    country: country || null,
                    region: region || null,
                    category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
                    message: 'No bundles found'
                }
            });
        }
        
        // Группируем в планы (для Local показываем все тарифы, для Global/Region - дедуплицируем)
        const plans = groupBundlesIntoPlans(bundles, isLocal);
        
        // Логируем примеры планов для отладки цен (ПЕРЕД применением наценки)
        if (plans.standard.length > 0) {
            console.log('📊 Sample standard plans (BEFORE markup, should be cost price):', plans.standard.slice(0, 3).map(p => ({
                name: p.bundle_name,
                price: p.price,
                priceValue: p.priceValue,
                currency: p.currency,
                data: p.data,
                duration: p.duration
            })));
            // Для Global проверяем, что цена правильная (должна быть ~$8.06 для 1GB)
            if (isGlobal && plans.standard.length > 0) {
                const firstPlan = plans.standard[0];
                if (firstPlan.priceValue && firstPlan.priceValue > 20) {
                    console.error('⚠️ ВНИМАНИЕ: Global план имеет цену > $20, возможно уже с наценкой!', {
                        bundle_name: firstPlan.bundle_name,
                        priceValue: firstPlan.priceValue,
                        expectedCostPrice: '~$8.06 for 1GB'
                    });
                }
            }
        }
        if (plans.unlimited.length > 0) {
            console.log('Sample unlimited plans:', plans.unlimited.slice(0, 3).map(p => ({
                name: p.bundle_name,
                price: p.price,
                priceValue: p.priceValue,
                currency: p.currency,
                duration: p.duration
            })));
        }
        
        // Извлекаем уникальные страны из bundles (для Global и Local)
        // countriesMap уже определен выше
        if (isGlobal || isLocal) {
            // Для Global собираем все уникальные коды стран из всех bundles
            const allCountryCodes = new Set();
            const skippedCountries = [];
            
            bundles.forEach(bundle => {
                const countries = bundle.countries || [];
                countries.forEach(country => {
                    let countryCode = null;
                    let countryName = null;
                    
                    if (typeof country === 'string') {
                        countryCode = country.toUpperCase();
                        // Для Global пропускаем "GLOBAL" и другие региональные коды
                        if (isGlobal && (countryCode === 'GLOBAL' || countryCode === 'WORLD' || countryCode === 'WORLDWIDE')) {
                            return; // Пропускаем региональные коды для Global
                        }
                        countryName = isoToCountryName[countryCode] || countryCode;
                    } else if (typeof country === 'object' && country !== null) {
                        countryCode = (country.iso || country.ISO || country.code || '').toUpperCase();
                        countryName = country.name || country.Name || '';
                        // Для Global пропускаем "Global" и другие региональные названия
                        if (isGlobal) {
                            const countryNameUpper = countryName.toUpperCase();
                            if (countryCode === 'GLOBAL' || countryCode === 'WORLD' || countryCode === 'WORLDWIDE' ||
                                countryNameUpper === 'GLOBAL' || countryNameUpper === 'WORLD' || countryNameUpper === 'WORLDWIDE') {
                                return; // Пропускаем региональные коды/названия для Global
                            }
                        }
                        // Если название не указано, используем маппинг
                        if (!countryName && countryCode) {
                            countryName = isoToCountryName[countryCode] || countryCode;
                        }
                    }
                    
                    // Собираем все коды для анализа
                    if (countryCode) {
                        allCountryCodes.add(countryCode);
                    }
                    
                    // Добавляем только валидные ISO коды стран (2-5 символов, не региональные коды)
                    if (countryCode && 
                        countryCode.length >= 2 && countryCode.length <= 5 && 
                        countryCode !== 'GLOBAL' && countryCode !== 'WORLD' && countryCode !== 'WORLDWIDE' &&
                        !countriesMap.has(countryCode)) {
                        countriesMap.set(countryCode, {
                            code: countryCode,
                            name: countryName || countryCode
                        });
                    } else if (countryCode && countriesMap.has(countryCode)) {
                        // Дубликат - не логируем, это нормально
                    } else if (countryCode) {
                        // Логируем пропущенные страны для отладки
                        if (countryCode.length < 2 || countryCode.length > 5) {
                            skippedCountries.push({ code: countryCode, reason: `Invalid length: ${countryCode.length}` });
                        } else if (countryCode === 'GLOBAL' || countryCode === 'WORLD' || countryCode === 'WORLDWIDE') {
                            skippedCountries.push({ code: countryCode, reason: 'Regional code' });
                        }
                    }
                });
            });
            
            // Для Global логируем все найденные коды и пропущенные
            if (isGlobal && skippedCountries.length > 0) {
                console.log('Skipped countries in Global:', skippedCountries);
            }
            if (isGlobal) {
                console.log('All country codes found in Global bundles:', {
                    total: allCountryCodes.size,
                    codes: Array.from(allCountryCodes).sort(),
                    added: countriesMap.size,
                    skipped: skippedCountries.length
                });
            }
        }
        
        const countries = Array.from(countriesMap.values())
            .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
        
        // Для Global логируем детальную информацию о странах
        if (isGlobal) {
            console.log('Global countries extracted:', {
                total: countries.length,
                countryCodes: countries.map(c => c.code).sort(),
                sampleCountries: countries.slice(0, 10).map(c => ({ code: c.code, name: c.name }))
            });
        }
        
        console.log('Plans grouped:', {
            country: country || 'all',
            region: region || 'all',
            category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
            standardPlans: plans.standard.length,
            unlimitedPlans: plans.unlimited.length,
            totalBundles: bundles.length,
            countriesCount: countries.length
        });
        
        const responseData = {
            standard: plans.standard,
            unlimited: plans.unlimited,
            total: plans.standard.length + plans.unlimited.length,
            countries: countries.length > 0 ? countries : undefined // Добавляем список стран из API
        };
        
        const responseMeta = {
            country: country || null,
            region: region || null,
            category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
            totalBundles: bundles.length,
            countriesCount: countries.length,
            source: 'api'
        };
        
        // Сохраняем в кэш только если есть данные (БЕЗ наценки)
        // ВАЖНО: Сохраняем глубокую копию данных БЕЗ наценки, чтобы наценка не применялась повторно
        if (bundles.length > 0 || plans.standard.length > 0 || plans.unlimited.length > 0) {
            // Создаем глубокую копию данных для кэша (БЕЗ наценки)
            // responseData содержит планы с себестоимостью (без наценки) из groupBundlesIntoPlans
            const dataForCache = JSON.parse(JSON.stringify(responseData));
            
            // Логируем пример цены для проверки (для Global)
            if (isGlobal && dataForCache.standard && dataForCache.standard.length > 0) {
                const samplePlan = dataForCache.standard[0];
                console.log('💾 Caching Global plan (should be cost price, not markup):', {
                    bundle_name: samplePlan.bundle_name,
                    priceValue: samplePlan.priceValue,
                    price: samplePlan.price
                });
                // КРИТИЧЕСКАЯ ПРОВЕРКА: если цена > 20, значит в кэш попадает уже нацененная цена!
                if (samplePlan.priceValue > 20) {
                    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: В кэш сохраняется цена с наценкой!', {
                        bundle_name: samplePlan.bundle_name,
                        priceValue: samplePlan.priceValue,
                        expectedCostPrice: '~$8.06 for 1GB'
                    });
                }
            }
            
            cache.set(cacheKey, {
                data: dataForCache, // Сохраняем БЕЗ наценки (себестоимость)
                meta: responseMeta
            });
            console.log('💾 Cached plans data for:', cacheKey, '(without markup)');
        } else {
            console.warn('⚠️ Not caching empty plans data for:', cacheKey);
        }
        
        // Проверяем, нужно ли возвращать данные БЕЗ наценки (для генерации статических файлов)
        const noMarkup = req.query.noMarkup === 'true' || req.query.noMarkup === '1';
        
        // Применяем наценку к данным ПЕРЕД возвратом (после сохранения в кэш)
        // Для Global тарифов countryCode = null, но наценка должна применяться
        // Передаем null для Global, чтобы применить только базовую наценку
        // НО: если noMarkup=true, возвращаем данные БЕЗ наценки (для статических файлов)
        const dataWithMarkup = noMarkup 
            ? responseData  // Возвращаем БЕЗ наценки для статических файлов
            : applyMarkupToPlans(responseData, isGlobal ? null : countryCode);
        
        // Логируем пример цены после применения наценки (для Global)
        if (isGlobal && dataWithMarkup.standard && dataWithMarkup.standard.length > 0) {
            const samplePlan = dataWithMarkup.standard[0];
            console.log(`📤 Global plan ${noMarkup ? '(NO MARKUP - for static files)' : '(WITH markup)'}:`, {
                bundle_name: samplePlan.bundle_name,
                priceValue: samplePlan.priceValue,
                price: samplePlan.price
            });
        }
        
        // Для Global логируем финальный ответ перед отправкой
        if (isGlobal) {
            console.log('📤 Sending Global plans response:', {
                success: true,
                noMarkup: noMarkup,
                standardPlansCount: responseData.standard.length,
                unlimitedPlansCount: responseData.unlimited.length,
                countriesCount: responseData.countries?.length || 0,
                sampleStandardPlan: responseData.standard[0] || null,
                sampleUnlimitedPlan: responseData.unlimited[0] || null
            });
        }
        
        // Возвращаем данные С наценкой (или БЕЗ, если noMarkup=true)
        return res.status(200).json({
            success: true,
            data: dataWithMarkup,
            meta: responseMeta
        });
        
    } catch (error) {
        console.error('Plans API error:', {
            message: error.message,
            stack: error.stack,
            country: req.query.country,
            region: req.query.region,
            name: error.name
        });
        
        // Возвращаем ошибку с деталями для отладки
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get plans',
            errorType: error.name || 'UnknownError',
            data: {
                standard: [],
                unlimited: [],
                total: 0
            },
            meta: {
                country: req.query.country || null,
                region: req.query.region || null,
                error: true,
                debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
};

