#!/bin/bash
# Автоматическая установка eSIMsData на VPS Contabo
# Использование: bash <(curl -s https://raw.githubusercontent.com/come2me2/eSIMsData/main/install.sh)
# Или: wget -O - https://raw.githubusercontent.com/come2me2/eSIMsData/main/install.sh | bash

set -e

echo "🚀 Начинаю установку eSIMsData на VPS..."
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Пожалуйста, запустите скрипт от имени root: sudo bash install.sh${NC}"
    exit 1
fi

# Переменные
DOMAIN=""
ESIMGO_API_KEY=""
PROJECT_DIR="/var/www/esimsdata"
REPO_URL="https://github.com/come2me2/eSIMsData.git"

# Функция для запроса ввода
ask() {
    local prompt="$1"
    local default="$2"
    local answer
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${YELLOW}"$prompt [$default]: "${NC})" answer
        echo "${answer:-$default}"
    else
        read -p "$(echo -e ${YELLOW}"$prompt: "${NC})" answer
        echo "$answer"
    fi
}

echo -e "${GREEN}📋 Сбор информации...${NC}"
echo ""

# Запрос домена
DOMAIN=$(ask "Введите ваш домен (например, example.com)" "")
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Домен обязателен для продолжения${NC}"
    exit 1
fi

# Запрос API ключа
ESIMGO_API_KEY=$(ask "Введите ваш ESIMGO_API_KEY" "")
if [ -z "$ESIMGO_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  ESIMGO_API_KEY не указан. Вы сможете добавить его позже в .env файл${NC}"
fi

echo ""
echo -e "${GREEN}✅ Информация собрана:${NC}"
echo "   Домен: $DOMAIN"
echo "   API Key: ${ESIMGO_API_KEY:+✓ Указан}${ESIMGO_API_KEY:-✗ Не указан}"
echo ""
read -p "$(echo -e ${YELLOW}"Продолжить установку? (y/n): "${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Установка отменена."
    exit 1
fi

echo ""
echo -e "${GREEN}📦 Шаг 1: Обновление системы...${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${GREEN}📦 Шаг 2: Установка Node.js 18.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    echo "Node.js уже установлен: $(node --version)"
fi

echo ""
echo -e "${GREEN}📦 Шаг 3: Установка PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 уже установлен"
fi

echo ""
echo -e "${GREEN}📦 Шаг 4: Установка Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install nginx -y
    systemctl start nginx
    systemctl enable nginx
else
    echo "Nginx уже установлен"
fi

echo ""
echo -e "${GREEN}📦 Шаг 5: Установка Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install certbot python3-certbot-nginx -y
else
    echo "Certbot уже установлен"
fi

echo ""
echo -e "${GREEN}📦 Шаг 6: Клонирование проекта...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo "Директория $PROJECT_DIR уже существует. Обновляю..."
    cd "$PROJECT_DIR"
    git pull || echo "Не удалось обновить. Продолжаю..."
else
    mkdir -p "$PROJECT_DIR"
    git clone "$REPO_URL" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

echo ""
echo -e "${GREEN}📦 Шаг 7: Установка зависимостей Node.js...${NC}"
npm install --production

echo ""
echo -e "${GREEN}📦 Шаг 8: Настройка переменных окружения...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    if [ -n "$ESIMGO_API_KEY" ]; then
        sed -i "s/ESIMGO_API_KEY=.*/ESIMGO_API_KEY=$ESIMGO_API_KEY/" .env
    fi
    echo "Файл .env создан"
else
    if [ -n "$ESIMGO_API_KEY" ]; then
        if grep -q "ESIMGO_API_KEY=" .env; then
            sed -i "s/ESIMGO_API_KEY=.*/ESIMGO_API_KEY=$ESIMGO_API_KEY/" .env
        else
            echo "ESIMGO_API_KEY=$ESIMGO_API_KEY" >> .env
        fi
        echo "ESIMGO_API_KEY обновлен в .env"
    fi
fi

echo ""
echo -e "${GREEN}📦 Шаг 9: Настройка прав доступа...${NC}"
chown -R www-data:www-data "$PROJECT_DIR"
chmod 600 .env
chmod +x update.sh

echo ""
echo -e "${GREEN}📦 Шаг 10: Создание директории для логов...${NC}"
mkdir -p logs
chown -R www-data:www-data logs

echo ""
echo -e "${GREEN}📦 Шаг 11: Настройка Nginx...${NC}"
# Создание конфигурации Nginx
NGINX_CONFIG="/etc/nginx/sites-available/esimsdata"
cat > "$NGINX_CONFIG" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (будет настроен Certbot)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Root directory
    root $PROJECT_DIR/public;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/esimsdata-access.log;
    error_log /var/log/nginx/esimsdata-error.log;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/xml image/svg+xml;
    
    # API endpoints - проксируем на Node.js сервер
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Cache HTML files
    location ~* \.html\$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # Main location - проксируем на Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Активация конфигурации
ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
if nginx -t; then
    systemctl reload nginx
    echo "Конфигурация Nginx применена"
else
    echo -e "${RED}❌ Ошибка в конфигурации Nginx${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}📦 Шаг 12: Запуск Node.js сервера через PM2...${NC}"
# Остановка существующего процесса, если есть
pm2 delete esimsdata 2>/dev/null || true

# Запуск нового процесса
cd "$PROJECT_DIR"
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

echo ""
echo -e "${GREEN}📦 Шаг 13: Настройка SSL сертификата...${NC}"
echo -e "${YELLOW}⚠️  Убедитесь, что DNS записи для $DOMAIN указывают на этот сервер${NC}"
read -p "$(echo -e ${YELLOW}"Продолжить с получением SSL сертификата? (y/n): "${NC})" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
        echo -e "${YELLOW}⚠️  Не удалось получить SSL сертификат автоматически.${NC}"
        echo "Вы можете получить его позже командой:"
        echo "certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    }
else
    echo -e "${YELLOW}⚠️  SSL сертификат не настроен. Настройте его позже:${NC}"
    echo "certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo -e "${GREEN}✅ Установка завершена!${NC}"
echo ""
echo -e "${GREEN}📊 Статус сервисов:${NC}"
pm2 status
echo ""
echo -e "${GREEN}🌐 Проверьте работу:${NC}"
echo "   HTTP:  http://$DOMAIN"
echo "   HTTPS: https://$DOMAIN"
echo "   API:   https://$DOMAIN/api/esimgo/countries"
echo ""
echo -e "${GREEN}📝 Полезные команды:${NC}"
echo "   Просмотр логов:     pm2 logs esimsdata"
echo "   Перезапуск:         pm2 restart esimsdata"
echo "   Обновление проекта: cd $PROJECT_DIR && ./update.sh"
echo ""
echo -e "${GREEN}🔐 Не забудьте:${NC}"
if [ -z "$ESIMGO_API_KEY" ]; then
    echo "   1. Добавить ESIMGO_API_KEY в $PROJECT_DIR/.env"
fi
echo "   2. Настроить Telegram Bot с URL: https://$DOMAIN"
echo ""

