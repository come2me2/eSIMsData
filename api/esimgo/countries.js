/**
 * eSIM Go API - Получение списка стран
 * Endpoint: GET /api/esimgo/countries
 * 
 * Возвращает список всех стран с доступными тарифами из eSIM Go
 */

const esimgoClient = require('./client');

// Маппинг ISO кода страны на название
const isoToCountryName = {
    'AD': 'Andorra', 'AE': 'United Arab Emirates', 'AF': 'Afghanistan', 'AG': 'Antigua and Barbuda',
    'AI': 'Anguilla', 'AL': 'Albania', 'AM': 'Armenia', 'AN': 'Netherlands Antilles', 'AO': 'Angola', 'AQ': 'Antarctica',
    'AR': 'Argentina', 'AS': 'American Samoa', 'AT': 'Austria', 'AU': 'Australia', 'AW': 'Aruba',
    'AX': 'Åland Islands', 'AZ': 'Azerbaijan', 'BA': 'Bosnia and Herzegovina', 'BB': 'Barbados',
    'BD': 'Bangladesh', 'BE': 'Belgium', 'BF': 'Burkina Faso', 'BG': 'Bulgaria', 'BH': 'Bahrain',
    'BI': 'Burundi', 'BJ': 'Benin', 'BL': 'Saint Barthélemy', 'BM': 'Bermuda', 'BN': 'Brunei',
    'BO': 'Bolivia', 'BQ': 'Caribbean Netherlands', 'BR': 'Brazil', 'BS': 'Bahamas', 'BT': 'Bhutan',
    'BV': 'Bouvet Island', 'BW': 'Botswana', 'BY': 'Belarus', 'BZ': 'Belize', 'CA': 'Canada',
    'CYP': 'Northern Cyprus', // Northern Cyprus специальный код
    'CC': 'Cocos Islands', 'CD': 'Congo, Democratic Republic', 'CF': 'Central African Republic',
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
        // Получаем полный каталог с максимальным количеством результатов
        // Используем большой perPage, чтобы получить все страны
        // Если API поддерживает пагинацию, делаем несколько запросов
        let allBundles = [];
        let page = 1;
        const perPage = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const catalogue = await esimgoClient.getCatalogue(null, { 
                perPage: perPage,
                page: page
            });
            
            console.log(`Fetching catalogue page ${page}:`, {
                isArray: Array.isArray(catalogue),
                hasBundles: !!catalogue?.bundles,
                hasData: !!catalogue?.data,
                pageCount: catalogue?.pageCount,
                rows: catalogue?.rows,
                pageSize: catalogue?.pageSize,
                currentPage: catalogue?.page,
                keys: catalogue && !Array.isArray(catalogue) ? Object.keys(catalogue) : []
            });
            
            // Извлекаем bundles - структура может быть разной
            const bundles = Array.isArray(catalogue) 
                ? catalogue 
                : (catalogue?.bundles || catalogue?.data || []);
            
            if (bundles && bundles.length > 0) {
                allBundles = allBundles.concat(bundles);
                
                // Проверяем, есть ли еще страницы
                // Используем метаданные пагинации, если они есть
                const pageCount = catalogue?.pageCount;
                const totalRows = catalogue?.rows;
                const currentPage = catalogue?.page || page;
                
                if (pageCount && currentPage >= pageCount) {
                    // Достигли последней страницы по метаданным
                    hasMore = false;
                    console.log(`Reached last page according to metadata: ${currentPage}/${pageCount}`);
                } else if (totalRows && allBundles.length >= totalRows) {
                    // Получили все bundles по метаданным
                    hasMore = false;
                    console.log(`Fetched all bundles: ${allBundles.length}/${totalRows}`);
                } else if (bundles.length < perPage) {
                    // Если количество bundles меньше perPage, значит это последняя страница
                    hasMore = false;
                    console.log(`Last page: received ${bundles.length} bundles (less than perPage ${perPage})`);
                } else {
                    page++;
                }
            } else {
                hasMore = false;
                console.log(`No bundles on page ${page}, stopping pagination`);
            }
            
            // Защита от бесконечного цикла
            if (page > 100) {
                console.warn('Reached maximum page limit (100), stopping pagination');
                hasMore = false;
            }
        }
        
        console.log('Total bundles fetched:', allBundles.length);
        
        const bundles = allBundles;
        
        if (!bundles || bundles.length === 0) {
            console.warn('No bundles found in catalogue');
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        
        console.log('Processing bundles:', { count: bundles.length });

        // Извлекаем уникальные страны
        const countriesMap = new Map();
        
        bundles.forEach(bundle => {
            // Обрабатываем разные варианты: одна страна или массив стран
            let countryCodes = [];
            
            // Вариант 1: массив стран в поле countries
            if (bundle.countries && Array.isArray(bundle.countries)) {
                countryCodes = bundle.countries.map(c => {
                    let code = (typeof c === 'string' ? c : c.code || c.country || c.iso)?.toUpperCase();
                    // Специальная обработка для Northern Cyprus
                    const countryName = (typeof c === 'object' ? c.name : '') || bundle.country_name || bundle.countryName || '';
                    if (code === 'CY' && countryName.toLowerCase().includes('northern cyprus')) {
                        code = 'CYP';
                    }
                    return code;
                }).filter(Boolean);
            }
            // Вариант 2: одна страна в поле country
            else {
                let countryCode = (bundle.country || bundle.countryCode || bundle.iso)?.toUpperCase();
                if (countryCode) {
                    // Специальная обработка для Northern Cyprus
                    // Если код CY и название содержит "Northern Cyprus", используем CYP
                    const countryName = bundle.country_name || bundle.countryName || '';
                    if (countryCode === 'CY' && countryName.toLowerCase().includes('northern cyprus')) {
                        countryCode = 'CYP';
                    }
                    countryCodes = [countryCode];
                }
            }
            
            // Если нет кодов стран, пропускаем этот bundle
            if (countryCodes.length === 0) {
                return;
            }
            
            // Добавляем каждую страну в карту
            countryCodes.forEach(countryCode => {
                // Фильтруем: оставляем только валидные коды из нашего маппинга
                // Разрешаем коды длиной 2-5 символов (стандартные ISO + специальные: CYP, US-HI)
                if (!countryCode || countryCode.length < 2 || countryCode.length > 5) {
                    return; // Пропускаем коды неправильной длины
                }
                
                // Проверяем, что код есть в нашем маппинге (валидная страна/регион)
                if (!isoToCountryName[countryCode]) {
                    console.log(`Skipping invalid country code: ${countryCode}`);
                    return; // Пропускаем коды, которых нет в маппинге (регионы и т.д.)
                }
                
                // Получаем название страны из маппинга по ISO коду
                const countryName = isoToCountryName[countryCode];
                
                if (!countriesMap.has(countryCode)) {
                    countriesMap.set(countryCode, {
                        code: countryCode,
                        name: countryName,
                        bundlesCount: 0
                    });
                }
                
                const country = countriesMap.get(countryCode);
                country.bundlesCount++;
            });
        });
        
        const countries = Array.from(countriesMap.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
        
        console.log('Countries fetched:', {
            total: countries.length,
            first: countries[0] ? { code: countries[0].code, name: countries[0].name } : null,
            last: countries[countries.length - 1] ? { code: countries[countries.length - 1].code, name: countries[countries.length - 1].name } : null,
            sample: countries.slice(0, 5).map(c => ({ code: c.code, name: c.name })),
            sampleEnd: countries.slice(-5).map(c => ({ code: c.code, name: c.name }))
        });
        
        return res.status(200).json({
            success: true,
            data: countries,
            meta: {
                total: countries.length
            }
        });
        
    } catch (error) {
        console.error('Countries API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch countries'
        });
    }
};

