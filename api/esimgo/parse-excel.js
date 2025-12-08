/**
 * Парсинг Excel файла с региональными тарифами
 * Использует библиотеку xlsx для чтения файла
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE_PATH = path.join(__dirname, '../../Rate_Sheet_November_2025_Standard_babe40b098.xlsx');

/**
 * Парсинг вкладки "Regional Bundles"
 * @returns {Array} - массив региональных тарифов
 */
function parseRegionalBundles() {
    try {
        if (!fs.existsSync(EXCEL_FILE_PATH)) {
            console.warn('Excel file not found:', EXCEL_FILE_PATH);
            return [];
        }

        const workbook = XLSX.readFile(EXCEL_FILE_PATH);
        const sheetName = 'Regional Bundles';
        
        if (!workbook.SheetNames.includes(sheetName)) {
            console.warn(`Sheet "${sheetName}" not found in Excel file`);
            return [];
        }

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Пропускаем заголовки и парсим данные
        // Структура зависит от формата Excel файла
        const bundles = [];
        
        // TODO: Адаптировать под реальную структуру Excel файла
        // Примерная структура:
        // data.forEach((row, index) => {
        //     if (index === 0) return; // Пропускаем заголовки
        //     bundles.push({
        //         region: row[0],
        //         dataAmount: row[1],
        //         duration: row[2],
        //         price: row[3],
        //         sku: row[4]
        //     });
        // });

        return bundles;
    } catch (error) {
        console.error('Error parsing Regional Bundles:', error);
        return [];
    }
}

/**
 * Парсинг вкладки "standard fixed"
 * @returns {Array} - массив тарифов с фиксированным трафиком
 */
function parseStandardFixed() {
    try {
        if (!fs.existsSync(EXCEL_FILE_PATH)) {
            console.warn('Excel file not found:', EXCEL_FILE_PATH);
            return [];
        }

        const workbook = XLSX.readFile(EXCEL_FILE_PATH);
        const sheetName = 'standard fixed';
        
        if (!workbook.SheetNames.includes(sheetName)) {
            console.warn(`Sheet "${sheetName}" not found in Excel file`);
            return [];
        }

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const plans = [];
        
        // TODO: Адаптировать под реальную структуру Excel файла
        // Примерная структура:
        // data.forEach((row, index) => {
        //     if (index === 0) return; // Пропускаем заголовки
        //     plans.push({
        //         region: row[0],
        //         dataAmount: row[1], // в GB
        //         duration: row[2], // в днях
        //         basePrice: row[3], // базовая цена
        //         userPrice: row[4], // цена для пользователя
        //         sku: row[5],
        //         profile: row[6] // Profile 1, Profile 2, etc.
        //     });
        // });

        return plans;
    } catch (error) {
        console.error('Error parsing standard fixed:', error);
        return [];
    }
}

/**
 * Получить тарифы для региона из Excel
 * @param {string} appRegion - регион приложения
 * @returns {Array} - массив тарифов
 */
function getRegionalPlansFromExcel(appRegion) {
    const plans = parseStandardFixed();
    
    // Фильтруем по региону приложения
    // TODO: Адаптировать под реальную структуру данных
    return plans.filter(plan => plan.region === appRegion);
}

module.exports = {
    parseRegionalBundles,
    parseStandardFixed,
    getRegionalPlansFromExcel
};

