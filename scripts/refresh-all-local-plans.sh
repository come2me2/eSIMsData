#!/bin/bash

# Скрипт для обновления кэша Local планов для ВСЕХ стран через API endpoint на сервере
# Использование: ./scripts/refresh-all-local-plans.sh [API_URL]
# Пример: ./scripts/refresh-all-local-plans.sh https://esim-data.vercel.app

API_URL="${1:-https://esim-data.vercel.app}"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Обновление кэша Local планов для ВСЕХ стран через API...${NC}"
echo -e "${BLUE}📍 API URL: $API_URL${NC}"
echo ""

# Шаг 1: Получаем список всех стран
echo -e "${CYAN}📋 Шаг 1: Получение списка всех стран...${NC}"
countries_response=$(curl -s "$API_URL/api/esimgo/countries")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при получении списка стран${NC}"
    exit 1
fi

# Извлекаем коды стран из JSON (используем jq если доступен, иначе простой парсинг)
if command -v jq &> /dev/null; then
    country_codes=$(echo "$countries_response" | jq -r '.data[]?.code // .data[]?.iso // empty' 2>/dev/null)
    country_count=$(echo "$countries_response" | jq '.data | length' 2>/dev/null || echo "0")
else
    # Простой парсинг без jq (извлекаем коды из JSON)
    country_codes=$(echo "$countries_response" | grep -o '"code":"[^"]*"' | sed 's/"code":"\([^"]*\)"/\1/' | sort -u)
    country_count=$(echo "$country_codes" | wc -l | tr -d ' ')
fi

if [ -z "$country_codes" ] || [ "$country_count" -eq 0 ]; then
    echo -e "${RED}❌ Не удалось получить список стран${NC}"
    echo "Ответ API: $countries_response"
    exit 1
fi

echo -e "${GREEN}✅ Найдено стран: $country_count${NC}"
echo ""

# Шаг 2: Обновляем кэш для каждой страны
echo -e "${CYAN}📦 Шаг 2: Обновление кэша для каждой страны...${NC}"
echo ""

success=0
failed=0
skipped=0
errors=()
current=0

# Обрабатываем каждую страну
while IFS= read -r code; do
    [ -z "$code" ] && continue
    
    ((current++))
    code=$(echo "$code" | tr -d '[:space:]')
    
    # Пропускаем пустые коды или некорректные значения
    if [ ${#code} -lt 2 ] || [ ${#code} -gt 5 ]; then
        continue
    fi
    
    # Получаем название страны из ответа (если доступно)
    if command -v jq &> /dev/null; then
        country_name=$(echo "$countries_response" | jq -r ".data[]? | select(.code == \"$code\") | .name // \"$code\"" 2>/dev/null)
    else
        country_name="$code"
    fi
    
    # Показываем прогресс
    progress=$((current * 100 / country_count))
    echo -e "${CYAN}[$current/$country_count - ${progress}%]${NC} 🔄 Обновление кэша для ${country_name} ($code)..."
    
    # Вызываем API endpoint для обновления кэша
    url="$API_URL/api/esimgo/plans?country=$code&category=local"
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        # Проверяем успешность ответа
        if echo "$body" | grep -q '"success":true'; then
            # Извлекаем количество тарифов
            if command -v jq &> /dev/null; then
                standard_count=$(echo "$body" | jq '.data.standard | length' 2>/dev/null || echo "0")
                unlimited_count=$(echo "$body" | jq '.data.unlimited | length' 2>/dev/null || echo "0")
            else
                # Простая проверка без jq
                standard_count=$(echo "$body" | grep -o '"standard":\[' | wc -l || echo "0")
                unlimited_count=$(echo "$body" | grep -o '"unlimited":\[' | wc -l || echo "0")
            fi
            
            if [ "$standard_count" -gt 0 ] || [ "$unlimited_count" -gt 0 ]; then
                echo -e "   ${GREEN}✅ $country_name ($code): $standard_count standard, $unlimited_count unlimited${NC}"
                ((success++))
            else
                echo -e "   ${YELLOW}⚠️ $country_name ($code): тарифы не найдены${NC}"
                ((skipped++))
            fi
        else
            error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | head -1 | sed 's/"error":"\([^"]*\)"/\1/' || echo "Unknown error")
            echo -e "   ${RED}❌ Ошибка: $error_msg${NC}"
            ((failed++))
            errors+=("$country_name ($code): $error_msg")
        fi
    else
        echo -e "   ${RED}❌ HTTP $http_code${NC}"
        ((failed++))
        errors+=("$country_name ($code): HTTP $http_code")
    fi
    
    # Небольшая задержка между запросами, чтобы не перегружать API
    sleep 0.3
    
    # Показываем прогресс каждые 10 стран
    if [ $((current % 10)) -eq 0 ]; then
        echo -e "${BLUE}   Прогресс: $success успешно, $skipped пропущено, $failed ошибок${NC}"
    fi
    
done <<< "$country_codes"

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}✅ Обновление кэша завершено!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Итоговые результаты:${NC}"
echo -e "   ${GREEN}✅ Успешно: $success${NC}"
echo -e "   ${YELLOW}⚠️ Пропущено (нет тарифов): $skipped${NC}"
echo -e "   ${RED}❌ Ошибки: $failed${NC}"
echo -e "   ${CYAN}📋 Всего обработано: $current стран${NC}"

if [ ${#errors[@]} -gt 0 ] && [ ${#errors[@]} -le 20 ]; then
    echo ""
    echo -e "${RED}❌ Ошибки (первые 20):${NC}"
    for error in "${errors[@]}"; do
        echo -e "   ${RED}- $error${NC}"
    done
elif [ ${#errors[@]} -gt 20 ]; then
    echo ""
    echo -e "${RED}❌ Ошибки (показаны первые 20 из ${#errors[@]}):${NC}"
    for error in "${errors[@]:0:20}"; do
        echo -e "   ${RED}- $error${NC}"
    done
    echo -e "   ${YELLOW}... и еще $(( ${#errors[@]} - 20 )) ошибок${NC}"
fi

if [ $failed -gt 0 ]; then
    exit 1
fi

