/**
 * Парсинг Excel файла с региональными тарифами
 * Использует библиотеку xlsx для чтения файла
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE_PATH = path.join(__dirname, '../../../Rate_Sheet_November_2025_Standard_babe40b098.xlsx');

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
 * Содержит:
 * - Local тарифы с фиксированным трафиком (один ISO код на тариф, country = ISO код)
 * - Global тарифы с фиксированным трафиком (множество стран, country = "Global")
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
        // Используем sheet_to_json с заголовками для более удобной работы
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        const plans = [];
        
        // Адаптируем под реальную структуру Excel файла
        // Структура: Country (ISO код или "Global"), Data (GB), Duration (Days), Base Price, User Price, SKU, Profile
        data.forEach((row, index) => {
            if (index === 0 && !row.Country && !row.ISO && !row.country) {
                // Пропускаем заголовки, если они не распознаны
                return;
            }
            
            const countryValue = row.Country || row.ISO || row.country || row['Country Code'] || row['ISO Code'];
            const dataAmount = parseFloat(row.Data || row['Data (GB)'] || row['Data Amount'] || 0);
            const duration = parseInt(row.Duration || row['Duration (Days)'] || row.Days || 0);
            const basePrice = parseFloat(row['Base Price'] || row['Base'] || row.Price || 0);
            const userPrice = parseFloat(row['User Price'] || row['User'] || row['Final Price'] || basePrice);
            const sku = row.SKU || row['SKU Code'] || '';
            const profile = row.Profile || row['Profile Name'] || '';
            
            // Проверяем, является ли это Global тарифом
            const isGlobal = countryValue && countryValue.toString().toUpperCase() === 'GLOBAL';
            
            if (countryValue && dataAmount > 0 && duration > 0) {
                plans.push({
                    countryCode: isGlobal ? 'GLOBAL' : countryValue.toUpperCase(),
                    isGlobal: isGlobal,
                    dataAmount: dataAmount * 1000, // Конвертируем GB в MB для совместимости с API
                    duration: duration,
                    basePrice: basePrice,
                    userPrice: userPrice,
                    price: userPrice, // Используем userPrice как основную цену
                    currency: 'USD', // Предполагаем USD, можно добавить парсинг валюты
                    sku: sku,
                    profile: profile,
                    unlimited: false
                });
            }
        });

        console.log(`Parsed ${plans.length} fixed plans from Excel (${plans.filter(p => p.isGlobal).length} Global, ${plans.filter(p => !p.isGlobal).length} Local)`);
        return plans;
    } catch (error) {
        console.error('Error parsing standard fixed:', error);
        return [];
    }
}

/**
 * Парсинг вкладки "standard unlimited essential"
 * Содержит:
 * - Local тарифы с unlimited трафиком (один ISO код на тариф, country = ISO код)
 * - Global тарифы с unlimited трафиком (множество стран, country = "Global")
 * @returns {Array} - массив тарифов с unlimited трафиком
 */
function parseStandardUnlimitedEssential() {
    try {
        if (!fs.existsSync(EXCEL_FILE_PATH)) {
            console.warn('Excel file not found:', EXCEL_FILE_PATH);
            return [];
        }

        const workbook = XLSX.readFile(EXCEL_FILE_PATH);
        const sheetName = 'standard unlimited essential';
        
        if (!workbook.SheetNames.includes(sheetName)) {
            console.warn(`Sheet "${sheetName}" not found in Excel file`);
            return [];
        }

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        const plans = [];
        
        // Адаптируем под реальную структуру Excel файла
        data.forEach((row, index) => {
            if (index === 0 && !row.Country && !row.ISO && !row.country) {
                return;
            }
            
            const countryValue = row.Country || row.ISO || row.country || row['Country Code'] || row['ISO Code'];
            const duration = parseInt(row.Duration || row['Duration (Days)'] || row.Days || 0);
            const basePrice = parseFloat(row['Base Price'] || row['Base'] || row.Price || 0);
            const userPrice = parseFloat(row['User Price'] || row['User'] || row['Final Price'] || basePrice);
            const sku = row.SKU || row['SKU Code'] || '';
            const profile = row.Profile || row['Profile Name'] || '';
            
            // Проверяем, является ли это Global тарифом
            const isGlobal = countryValue && countryValue.toString().toUpperCase() === 'GLOBAL';
            
            if (countryValue && duration > 0) {
                plans.push({
                    countryCode: isGlobal ? 'GLOBAL' : countryValue.toUpperCase(),
                    isGlobal: isGlobal,
                    dataAmount: 0, // Unlimited
                    duration: duration,
                    basePrice: basePrice,
                    userPrice: userPrice,
                    price: userPrice,
                    currency: 'USD',
                    sku: sku,
                    profile: profile,
                    unlimited: true
                });
            }
        });

        console.log(`Parsed ${plans.length} unlimited plans from Excel (${plans.filter(p => p.isGlobal).length} Global, ${plans.filter(p => !p.isGlobal).length} Local)`);
        return plans;
    } catch (error) {
        console.error('Error parsing standard unlimited essential:', error);
        return [];
    }
}

/**
 * Получить Local тарифы для страны из Excel
 * @param {string} countryCode - ISO код страны
 * @returns {Object} - объект с standard и unlimited планами
 */
function getLocalPlansFromExcel(countryCode) {
    if (!countryCode) {
        return { standard: [], unlimited: [] };
    }
    
    const code = countryCode.toUpperCase();
    const fixedPlans = parseStandardFixed();
    const unlimitedPlans = parseStandardUnlimitedEssential();
    
    // Фильтруем по коду страны (исключаем Global)
    const standard = fixedPlans.filter(plan => !plan.isGlobal && plan.countryCode === code);
    const unlimited = unlimitedPlans.filter(plan => !plan.isGlobal && plan.countryCode === code);
    
    return { standard, unlimited };
}

/**
 * Получить Global тарифы из Excel
 * Global = множество стран, country = "Global" в Excel
 * @returns {Object} - объект с standard и unlimited планами
 */
function getGlobalPlansFromExcel() {
    const fixedPlans = parseStandardFixed();
    const unlimitedPlans = parseStandardUnlimitedEssential();
    
    // Фильтруем только Global тарифы
    const standard = fixedPlans.filter(plan => plan.isGlobal);
    const unlimited = unlimitedPlans.filter(plan => plan.isGlobal);
    
    return { standard, unlimited };
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
    parseStandardUnlimitedEssential,
    getLocalPlansFromExcel,
    getGlobalPlansFromExcel,
    getRegionalPlansFromExcel
};

