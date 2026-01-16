/**
 * Скрипт для обновления country_code и country_name в старых заказах
 * Извлекает country_code из bundle_name (например, esim_1GB_7D_TH_V2 -> TH)
 * 
 * Использование:
 *   node scripts/update-orders-country.js
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// ISO 3166-1 alpha-2 to country name mapping
const isoToCountryName = {
    'AF': 'Afghanistan', 'AX': 'Åland Islands', 'AL': 'Albania', 'DZ': 'Algeria',
    'AS': 'American Samoa', 'AD': 'Andorra', 'AO': 'Angola', 'AI': 'Anguilla',
    'AQ': 'Antarctica', 'AG': 'Antigua and Barbuda', 'AR': 'Argentina', 'AM': 'Armenia',
    'AW': 'Aruba', 'AU': 'Australia', 'AT': 'Austria', 'AZ': 'Azerbaijan',
    'BS': 'Bahamas', 'BH': 'Bahrain', 'BD': 'Bangladesh', 'BB': 'Barbados',
    'BY': 'Belarus', 'BE': 'Belgium', 'BZ': 'Belize', 'BJ': 'Benin',
    'BM': 'Bermuda', 'BT': 'Bhutan', 'BO': 'Bolivia', 'BQ': 'Bonaire',
    'BA': 'Bosnia and Herzegovina', 'BW': 'Botswana', 'BV': 'Bouvet Island', 'BR': 'Brazil',
    'IO': 'British Indian Ocean Territory', 'BN': 'Brunei', 'BG': 'Bulgaria', 'BF': 'Burkina Faso',
    'BI': 'Burundi', 'CV': 'Cabo Verde', 'KH': 'Cambodia', 'CM': 'Cameroon',
    'CA': 'Canada', 'KY': 'Cayman Islands', 'CF': 'Central African Republic', 'TD': 'Chad',
    'CL': 'Chile', 'CN': 'China', 'CX': 'Christmas Island', 'CC': 'Cocos Islands',
    'CO': 'Colombia', 'KM': 'Comoros', 'CG': 'Congo', 'CD': 'Congo (DRC)',
    'CK': 'Cook Islands', 'CR': 'Costa Rica', 'CI': 'Côte d\'Ivoire', 'HR': 'Croatia',
    'CU': 'Cuba', 'CW': 'Curaçao', 'CY': 'Cyprus', 'CZ': 'Czech Republic',
    'DK': 'Denmark', 'DJ': 'Djibouti', 'DM': 'Dominica', 'DO': 'Dominican Republic',
    'EC': 'Ecuador', 'EG': 'Egypt', 'SV': 'El Salvador', 'GQ': 'Equatorial Guinea',
    'ER': 'Eritrea', 'EE': 'Estonia', 'SZ': 'Eswatini', 'ET': 'Ethiopia',
    'FK': 'Falkland Islands', 'FO': 'Faroe Islands', 'FJ': 'Fiji', 'FI': 'Finland',
    'FR': 'France', 'GF': 'French Guiana', 'PF': 'French Polynesia', 'TF': 'French Southern Territories',
    'GA': 'Gabon', 'GM': 'Gambia', 'GE': 'Georgia', 'DE': 'Germany',
    'GH': 'Ghana', 'GI': 'Gibraltar', 'GR': 'Greece', 'GL': 'Greenland',
    'GD': 'Grenada', 'GP': 'Guadeloupe', 'GU': 'Guam', 'GT': 'Guatemala',
    'GG': 'Guernsey', 'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'GY': 'Guyana',
    'HT': 'Haiti', 'HM': 'Heard Island', 'VA': 'Holy See', 'HN': 'Honduras',
    'HK': 'Hong Kong', 'HU': 'Hungary', 'IS': 'Iceland', 'IN': 'India',
    'ID': 'Indonesia', 'IR': 'Iran', 'IQ': 'Iraq', 'IE': 'Ireland',
    'IM': 'Isle of Man', 'IL': 'Israel', 'IT': 'Italy', 'JM': 'Jamaica',
    'JP': 'Japan', 'JE': 'Jersey', 'JO': 'Jordan', 'KZ': 'Kazakhstan',
    'KE': 'Kenya', 'KI': 'Kiribati', 'KP': 'Korea (North)', 'KR': 'Korea (South)',
    'KW': 'Kuwait', 'KG': 'Kyrgyzstan', 'LA': 'Laos', 'LV': 'Latvia',
    'LB': 'Lebanon', 'LS': 'Lesotho', 'LR': 'Liberia', 'LY': 'Libya',
    'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'MO': 'Macao',
    'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaysia', 'MV': 'Maldives',
    'ML': 'Mali', 'MT': 'Malta', 'MH': 'Marshall Islands', 'MQ': 'Martinique',
    'MR': 'Mauritania', 'MU': 'Mauritius', 'YT': 'Mayotte', 'MX': 'Mexico',
    'FM': 'Micronesia', 'MD': 'Moldova', 'MC': 'Monaco', 'MN': 'Mongolia',
    'ME': 'Montenegro', 'MS': 'Montserrat', 'MA': 'Morocco', 'MZ': 'Mozambique',
    'MM': 'Myanmar', 'NA': 'Namibia', 'NR': 'Nauru', 'NP': 'Nepal',
    'NL': 'Netherlands', 'NC': 'New Caledonia', 'NZ': 'New Zealand', 'NI': 'Nicaragua',
    'NE': 'Niger', 'NG': 'Nigeria', 'NU': 'Niue', 'NF': 'Norfolk Island',
    'MK': 'North Macedonia', 'MP': 'Northern Mariana Islands', 'NO': 'Norway', 'OM': 'Oman',
    'PK': 'Pakistan', 'PW': 'Palau', 'PS': 'Palestine', 'PA': 'Panama',
    'PG': 'Papua New Guinea', 'PY': 'Paraguay', 'PE': 'Peru', 'PH': 'Philippines',
    'PN': 'Pitcairn', 'PL': 'Poland', 'PT': 'Portugal', 'PR': 'Puerto Rico',
    'QA': 'Qatar', 'RE': 'Réunion', 'RO': 'Romania', 'RU': 'Russia',
    'RW': 'Rwanda', 'BL': 'Saint Barthélemy', 'SH': 'Saint Helena', 'KN': 'Saint Kitts and Nevis',
    'LC': 'Saint Lucia', 'MF': 'Saint Martin', 'PM': 'Saint Pierre and Miquelon',
    'VC': 'Saint Vincent and the Grenadines', 'WS': 'Samoa', 'SM': 'San Marino',
    'ST': 'São Tomé and Príncipe', 'SA': 'Saudi Arabia', 'SN': 'Senegal', 'RS': 'Serbia',
    'SC': 'Seychelles', 'SL': 'Sierra Leone', 'SG': 'Singapore', 'SX': 'Sint Maarten',
    'SK': 'Slovakia', 'SI': 'Slovenia', 'SB': 'Solomon Islands', 'SO': 'Somalia',
    'ZA': 'South Africa', 'GS': 'South Georgia', 'SS': 'South Sudan', 'ES': 'Spain',
    'LK': 'Sri Lanka', 'SD': 'Sudan', 'SR': 'Suriname', 'SJ': 'Svalbard and Jan Mayen',
    'SE': 'Sweden', 'CH': 'Switzerland', 'SY': 'Syria', 'TW': 'Taiwan',
    'TJ': 'Tajikistan', 'TZ': 'Tanzania', 'TH': 'Thailand', 'TL': 'Timor-Leste',
    'TG': 'Togo', 'TK': 'Tokelau', 'TO': 'Tonga', 'TT': 'Trinidad and Tobago',
    'TN': 'Tunisia', 'TR': 'Turkey', 'TM': 'Turkmenistan', 'TC': 'Turks and Caicos Islands',
    'TV': 'Tuvalu', 'UG': 'Uganda', 'UA': 'Ukraine', 'AE': 'United Arab Emirates',
    'GB': 'United Kingdom', 'US': 'United States', 'UM': 'United States Minor Outlying Islands',
    'UY': 'Uruguay', 'UZ': 'Uzbekistan', 'VU': 'Vanuatu', 'VE': 'Venezuela',
    'VN': 'Vietnam', 'VG': 'Virgin Islands (British)', 'VI': 'Virgin Islands (U.S.)',
    'WF': 'Wallis and Futuna', 'EH': 'Western Sahara', 'YE': 'Yemen', 'ZM': 'Zambia',
    'ZW': 'Zimbabwe'
};

/**
 * Извлекает код страны из bundle_name
 * Формат: esim_1GB_7D_TH_V2 -> TH
 */
function extractCountryCodeFromBundleName(bundleName) {
    if (!bundleName) return null;
    
    // Паттерн: esim_1GB_7D_TH_V2 или esim_1GB_7D_AT_V2
    const match = bundleName.match(/_([A-Z]{2})_V?\d*$/);
    if (match && match[1]) {
        return match[1];
    }
    
    return null;
}

/**
 * Получает название страны по коду
 */
function getCountryNameFromCode(code) {
    if (!code) return null;
    return isoToCountryName[code.toUpperCase()] || null;
}

/**
 * Обновляет заказы, добавляя country_code и country_name
 */
async function updateOrdersCountry() {
    try {
        console.log('📖 Загружаю заказы из файла...');
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(data);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        console.log('\n🔍 Проверяю заказы...\n');
        
        // Проходим по всем пользователям
        for (const userId in allOrders) {
            const userOrders = allOrders[userId];
            
            if (!Array.isArray(userOrders)) {
                continue;
            }
            
            // Проходим по всем заказам пользователя
            for (const order of userOrders) {
                let orderUpdated = false;
                
                // Если нет country_code, пытаемся извлечь из bundle_name
                if (!order.country_code) {
                    const countryCode = extractCountryCodeFromBundleName(order.bundle_name);
                    
                    if (countryCode) {
                        order.country_code = countryCode;
                        orderUpdated = true;
                    }
                }
                
                // Если есть country_code, но нет country_name, добавляем country_name
                if (order.country_code && !order.country_name) {
                    const countryName = getCountryNameFromCode(order.country_code);
                    if (countryName) {
                        order.country_name = countryName;
                        orderUpdated = true;
                    }
                }
                
                if (orderUpdated) {
                    console.log(`✅ Обновлен заказ ${order.orderReference?.substring(0, 8) || 'N/A'}:`, {
                        bundle_name: order.bundle_name,
                        country_code: order.country_code || 'N/A',
                        country_name: order.country_name || 'N/A'
                    });
                    updatedCount++;
                } else {
                    skippedCount++;
                }
            }
        }
        
        // Сохраняем обновленные заказы
        if (updatedCount > 0) {
            console.log(`\n💾 Сохраняю обновленные заказы...`);
            await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
            console.log(`✅ Сохранено!`);
        }
        
        console.log(`\n📊 Результаты:`);
        console.log(`   ✅ Обновлено заказов: ${updatedCount}`);
        console.log(`   ⏭️  Пропущено заказов: ${skippedCount}`);
        console.log(`   📦 Всего обработано: ${updatedCount + skippedCount}`);
        
    } catch (error) {
        console.error('❌ Ошибка при обновлении заказов:', error);
        process.exit(1);
    }
}

// Запускаем обновление
updateOrdersCountry();
