#!/bin/bash

# Deployment script for Contabo VPS
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Configuration
DOMAIN="your-domain.com"
WEB_ROOT="/var/www/esimsdata"
BACKUP_DIR="/var/backups/esimsdata"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
if [ -d "$WEB_ROOT" ]; then
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$WEB_ROOT" .
    echo -e "${GREEN}Backup created: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz${NC}"
fi

# Create web root if it doesn't exist
mkdir -p "$WEB_ROOT"

# Copy files (assuming you're running from project directory)
echo -e "${YELLOW}Copying files...${NC}"
cp -r . "$WEB_ROOT/" 2>/dev/null || {
    echo -e "${YELLOW}Note: Some files may have been skipped. Make sure to copy all files manually.${NC}"
}

# Set proper permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R www-data:www-data "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

# Test nginx configuration
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Testing nginx configuration...${NC}"
    nginx -t && {
        echo -e "${GREEN}Nginx configuration is valid${NC}"
        systemctl reload nginx
        echo -e "${GREEN}Nginx reloaded${NC}"
    } || {
        echo -e "${RED}Nginx configuration test failed!${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}Your site should be available at: https://$DOMAIN${NC}"




























