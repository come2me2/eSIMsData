#!/bin/bash
# Скрипт для быстрой проверки работы API v2.4

echo "🧪 Тестирование eSIM Go API v2.4"
echo "================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка наличия BASE_URL
BASE_URL="${1:-http://localhost:3000}"
if [ "$BASE_URL" = "prod" ] || [ "$BASE_URL" = "production" ]; then
    echo "⚠️  Укажите URL вашего проекта Vercel:"
    echo "   ./test-api.sh https://your-project.vercel.app"
    exit 1
fi

echo "📍 Используется базовый URL: $BASE_URL"
echo ""

# Функция для проверки endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local url="${BASE_URL}${endpoint}"
    
    echo -n "🔍 Проверка $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        success=$(echo "$body" | grep -o '"success":true' || echo "")
        if [ -n "$success" ]; then
            echo -e "${GREEN}✅ OK${NC}"
            echo "$body" | jq '.' 2>/dev/null || echo "$body" | head -c 200
            echo ""
            return 0
        else
            echo -e "${YELLOW}⚠️  Ответ получен, но success=false${NC}"
            echo "$body" | head -c 200
            echo ""
            return 1
        fi
    else
        echo -e "${RED}❌ Ошибка HTTP $http_code${NC}"
        echo "$body" | head -c 200
        echo ""
        return 1
    fi
}

# Тесты
echo "1️⃣  Проверка подключения (diagnostics)..."
test_endpoint "Диагностика" "/api/esimgo/test"
echo ""

echo "2️⃣  Получение списка стран..."
test_endpoint "Список стран" "/api/esimgo/countries"
echo ""

echo "3️⃣  Получение каталога..."
test_endpoint "Каталог" "/api/esimgo/catalogue-processed"
echo ""

echo "4️⃣  Получение тарифов для Таиланда..."
test_endpoint "Тарифы TH" "/api/esimgo/bundles?country=TH"
echo ""

echo "================================"
echo "✅ Тестирование завершено!"
echo ""
echo "💡 Для более детального тестирования откройте:"
echo "   $BASE_URL/test-esimgo.html"

