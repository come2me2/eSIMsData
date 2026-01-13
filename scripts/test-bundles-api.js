#!/usr/bin/env node
/**
 * Тестовый скрипт для проверки структуры ответа eSIM Go API для bundles
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const esimgoClient = require('../api/_lib/esimgo/client');

const ICCID = '8944422711110566034';

async function testBundlesAPI() {
    try {
        console.log('🔍 Testing bundles API for ICCID:', ICCID);
        
        const response = await esimgoClient.getESIMBundles(ICCID);
        
        console.log('\n📦 Full API Response:');
        console.log(JSON.stringify(response, null, 2));
        
        console.log('\n📊 Response Structure:');
        console.log('- Has bundles:', !!response?.bundles);
        console.log('- Bundles count:', response?.bundles?.length || 0);
        console.log('- Response keys:', response ? Object.keys(response) : []);
        
        if (response?.bundles && response.bundles.length > 0) {
            console.log('\n📋 First Bundle:');
            const firstBundle = response.bundles[0];
            console.log('- Keys:', Object.keys(firstBundle));
            console.log('- Name:', firstBundle.name);
            console.log('- Bundle State:', firstBundle.bundleState);
            console.log('- Has assignments:', !!firstBundle.assignments);
            console.log('- Assignments count:', firstBundle.assignments?.length || 0);
            console.log('- Has initialQuantity:', firstBundle.initialQuantity !== undefined);
            console.log('- Has remainingQuantity:', firstBundle.remainingQuantity !== undefined);
            console.log('- Full structure:', JSON.stringify(firstBundle, null, 2));
            
            if (firstBundle.assignments && firstBundle.assignments.length > 0) {
                console.log('\n📋 First Assignment:');
                const firstAssignment = firstBundle.assignments[0];
                console.log('- Keys:', Object.keys(firstAssignment));
                console.log('- Full structure:', JSON.stringify(firstAssignment, null, 2));
            }
        } else {
            console.log('\n❌ No bundles found in response');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testBundlesAPI();
