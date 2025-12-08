/**
 * Маппинг регионов приложения на регионы API eSIM Go
 * Используется для получения региональных тарифов
 */

// Маппинг регионов приложения на регионы API
const regionMapping = {
    'Africa': ['Africa'],
    'Asia': ['Asia'],
    'Europe': ['EU Lite'], // Не берем EU+
    'North America': ['North America'],
    'Latin America': ['Americas', 'Caribbean', 'CENAM'], // Три региона с возможными дублями
    'Oceania': ['Oceania'],
    'Balkanas': ['Balkanas'],
    'Central Eurasia': ['CIS']
};

/**
 * Получить список регионов API для региона приложения
 * @param {string} appRegion - регион приложения
 * @returns {string[]} - массив регионов API
 */
function getAPIRegions(appRegion) {
    return regionMapping[appRegion] || [];
}

/**
 * Проверка, является ли регион Latin America (требует дедупликации)
 * @param {string} appRegion - регион приложения
 * @returns {boolean}
 */
function isLatinAmerica(appRegion) {
    return appRegion === 'Latin America';
}

/**
 * Получить все доступные регионы приложения
 * @returns {string[]}
 */
function getAllAppRegions() {
    return Object.keys(regionMapping);
}

module.exports = {
    regionMapping,
    getAPIRegions,
    isLatinAmerica,
    getAllAppRegions
};

