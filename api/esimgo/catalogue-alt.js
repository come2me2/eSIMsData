/**
 * Альтернативный подход к получению каталога
 * Если прямого endpoint /catalogue нет, используем другой метод
 * 
 * Возможные варианты:
 * 1. Получить список eSIM через /esims (если такой endpoint есть)
 * 2. Использовать другой endpoint для получения доступных пакетов
 * 3. Использовать портал eSIM Go для получения каталога
 */

const esimgoClient = require('./client');

/**
 * Получить список доступных eSIM (если endpoint существует)
 */
async function getAvailableESIMs() {
    try {
        // Пробуем получить список eSIM
        return await esimgoClient.makeRequest('/esims');
    } catch (error) {
        console.error('Failed to get eSIMs list:', error);
        throw error;
    }
}

/**
 * Получить каталог через альтернативный метод
 * Пробуем разные подходы
 */
async function getCatalogueAlternative(countryCode = null) {
    const results = {
        method: null,
        data: null,
        error: null
    };
    
    // Метод 1: Прямой endpoint /catalogue или /bundles
    try {
        const direct = await esimgoClient.getCatalogue(countryCode);
        results.method = 'direct';
        results.data = direct;
        return results;
    } catch (error) {
        console.log('Direct catalogue method failed:', error.message);
    }
    
    // Метод 2: Получить список eSIM, затем bundles для каждого
    try {
        const esims = await getAvailableESIMs();
        if (esims && esims.data && esims.data.length > 0) {
            // Берем первый eSIM для примера
            const firstESIM = esims.data[0];
            if (firstESIM.iccid) {
                const bundles = await esimgoClient.getESIMBundles(firstESIM.iccid);
                results.method = 'via-esim';
                results.data = bundles;
                return results;
            }
        }
    } catch (error) {
        console.log('Via eSIM method failed:', error.message);
    }
    
    // Если все методы не сработали
    results.error = 'No working method found to get catalogue';
    throw new Error(results.error);
}

module.exports = {
    getCatalogueAlternative,
    getAvailableESIMs
};

