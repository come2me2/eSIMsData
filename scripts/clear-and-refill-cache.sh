#!/bin/bash
# Скрипт для очистки кэша и перезаполнения правильными данными (себестоимость)
# Использование: ./scripts/clear-and-refill-cache.sh [API_URL] [SECRET]

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="${1:-http://localhost:3000}"
SECRET="${2:-esimsdata11}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧹 Очистка кэша и перезаполнение${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Шаг 1: Очистка кэша через API (если есть endpoint)
echo -e "${YELLOW}📋 Шаг 1/3: Очистка кэша...${NC}"
echo -e "${BLUE}💡 Примечание: Кэш будет очищен автоматически при перезаполнении${NC}"
echo ""

# Шаг 2: Удаление старых статических JSON файлов
echo -e "${YELLOW}📋 Шаг 2/3: Удаление старых статических JSON файлов...${NC}"
if [ -d "public/data" ]; then
    echo -e "${BLUE}🗑️  Удаляю старые JSON файлы из public/data...${NC}"
    find public/data -name "*.json" -type f -delete 2>/dev/null || true
    echo -e "${GREEN}✅ Старые статические файлы удалены${NC}"
else
    echo -e "${YELLOW}⚠️  Директория public/data не найдена${NC}"
fi
echo ""

# Шаг 3: Перезаполнение кэша
echo -e "${YELLOW}📋 Шаг 3/3: Перезаполнение кэша правильными данными (себестоимость)...${NC}"
echo -e "${BLUE}📡 Вызываю /api/cache/prefill...${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/cache/prefill?secret=${SECRET}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Кэш успешно перезаполнен!${NC}"
    echo ""
    echo -e "${BLUE}📊 Результаты:${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Ошибка при перезаполнении кэша (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Очистка и перезаполнение завершены!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}💡 Теперь клиенты будут видеть правильные цены (себестоимость + наценка)${NC}"
