/**
 * Утилита для парсинга OpenAPI спецификации eSIM Go
 * Используйте этот файл для анализа доступных endpoints
 * 
 * Инструкция:
 * 1. Скачайте OpenAPI YAML файл с сайта eSIM Go
 * 2. Загрузите его в этот файл или используйте для анализа
 * 3. Найдите endpoints для получения каталога/bundles
 */

// Пример структуры OpenAPI спецификации
// После скачивания файла, можно использовать библиотеку для парсинга:
// const yaml = require('js-yaml');
// const fs = require('fs');
// const spec = yaml.load(fs.readFileSync('esim-go-openapi.yaml', 'utf8'));

/**
 * Анализирует OpenAPI спецификацию и находит endpoints для каталога
 */
function findCatalogueEndpoints(openApiSpec) {
    const catalogueEndpoints = [];
    
    if (!openApiSpec || !openApiSpec.paths) {
        return catalogueEndpoints;
    }
    
    // Ищем endpoints, связанные с каталогом, bundles, products
    const keywords = ['catalogue', 'catalog', 'bundle', 'product', 'package', 'available', 'plan', 'tariff'];
    
    for (const [path, methods] of Object.entries(openApiSpec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            if (typeof operation === 'object' && operation.operationId) {
                const pathLower = path.toLowerCase();
                const operationIdLower = operation.operationId.toLowerCase();
                const summaryLower = (operation.summary || '').toLowerCase();
                const descriptionLower = (operation.description || '').toLowerCase();
                
                // Проверяем, содержит ли endpoint ключевые слова
                const matches = keywords.some(keyword => 
                    pathLower.includes(keyword) || 
                    operationIdLower.includes(keyword) ||
                    summaryLower.includes(keyword) ||
                    descriptionLower.includes(keyword)
                );
                
                if (matches) {
                    catalogueEndpoints.push({
                        path,
                        method: method.toUpperCase(),
                        operationId: operation.operationId,
                        summary: operation.summary,
                        description: operation.description,
                        parameters: operation.parameters || [],
                        responses: Object.keys(operation.responses || {})
                    });
                }
            }
        }
    }
    
    return catalogueEndpoints;
}

/**
 * Находит все GET endpoints (для получения данных)
 */
function findGetEndpoints(openApiSpec) {
    const getEndpoints = [];
    
    if (!openApiSpec || !openApiSpec.paths) {
        return getEndpoints;
    }
    
    for (const [path, methods] of Object.entries(openApiSpec.paths)) {
        if (methods.get) {
            getEndpoints.push({
                path,
                method: 'GET',
                operationId: methods.get.operationId,
                summary: methods.get.summary,
                description: methods.get.description,
                parameters: methods.get.parameters || []
            });
        }
    }
    
    return getEndpoints;
}

module.exports = {
    findCatalogueEndpoints,
    findGetEndpoints
};

