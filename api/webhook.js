/**
 * GitHub Webhook для автоматического деплоя
 * Endpoint: POST /api/webhook
 * 
 * Настройте webhook в GitHub:
 * Settings → Webhooks → Add webhook
 * Payload URL: https://esimsdata.app/api/webhook
 * Content type: application/json
 * Secret: (создайте секретный ключ)
 * Events: Just the push event
 */

const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Секретный ключ для проверки подписи GitHub (установите в .env)
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

// Путь к проекту
const PROJECT_DIR = process.env.PROJECT_DIR || '/var/www/esimsdata';

/**
 * Проверка подписи GitHub webhook
 */
function verifySignature(payload, signature) {
    if (!WEBHOOK_SECRET) {
        console.warn('⚠️ GITHUB_WEBHOOK_SECRET не установлен, пропускаем проверку подписи');
        return true;
    }
    
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    );
}

/**
 * Выполнение деплоя
 */
async function deploy() {
    console.log('🚀 Начинаю деплой...');
    
    try {
        // Переходим в директорию проекта
        process.chdir(PROJECT_DIR);
        
        // Получаем последние изменения
        console.log('📥 Получаю изменения из GitHub...');
        await execPromise('git fetch origin');
        
        // Проверяем, есть ли изменения
        const { stdout: statusOutput } = await execPromise('git status -sb');
        if (statusOutput.includes('ahead') || !statusOutput.includes('behind')) {
            console.log('✅ Нет новых изменений');
            return { success: true, message: 'No changes to deploy' };
        }
        
        // Делаем pull
        console.log('📦 Обновляю код...');
        await execPromise('git pull origin main');
        
        // Устанавливаем зависимости (если package.json изменился)
        console.log('📦 Проверяю зависимости...');
        const { stdout: diffOutput } = await execPromise('git diff HEAD@{1} HEAD -- package.json package-lock.json');
        if (diffOutput) {
            console.log('📦 Устанавливаю зависимости...');
            await execPromise('npm install --production');
        }
        
        // Перезапускаем PM2
        console.log('🔄 Перезапускаю сервер...');
        await execPromise('pm2 restart esimsdata');
        
        // Перезагружаем Nginx (если конфигурация изменилась)
        const { stdout: nginxDiff } = await execPromise('git diff HEAD@{1} HEAD -- nginx.conf');
        if (nginxDiff) {
            console.log('🔄 Обновляю конфигурацию Nginx...');
            await execPromise('nginx -t && systemctl reload nginx');
        }
        
        console.log('✅ Деплой завершен успешно!');
        return { success: true, message: 'Deployment successful' };
        
    } catch (error) {
        console.error('❌ Ошибка при деплое:', error);
        return { 
            success: false, 
            message: 'Deployment failed', 
            error: error.message 
        };
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Получаем подпись из заголовка
        const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
        
        // Получаем тело запроса как строку для проверки подписи
        const payload = JSON.stringify(req.body);
        
        // Проверяем подпись (если секрет установлен)
        if (WEBHOOK_SECRET && signature) {
            if (!verifySignature(payload, signature)) {
                console.error('❌ Неверная подпись webhook');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }
        
        // Проверяем, что это push событие
        const event = req.headers['x-github-event'];
        if (event !== 'push') {
            return res.status(200).json({ message: 'Event ignored', event });
        }
        
        // Проверяем ветку
        const ref = req.body.ref;
        if (ref !== 'refs/heads/main' && ref !== 'refs/heads/master') {
            return res.status(200).json({ message: 'Branch ignored', ref });
        }
        
        console.log('📨 Получен webhook от GitHub:', {
            event,
            ref,
            commit: req.body.head_commit?.id,
            message: req.body.head_commit?.message
        });
        
        // Выполняем деплой асинхронно
        deploy().then(result => {
            console.log('Деплой завершен:', result);
        }).catch(error => {
            console.error('Ошибка деплоя:', error);
        });
        
        // Отвечаем сразу (GitHub ожидает быстрый ответ)
        return res.status(200).json({ 
            message: 'Webhook received, deployment started',
            event,
            ref
        });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
};

