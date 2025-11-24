#!/bin/bash

# Deployment script for Appifylab Task
# Run this script after pulling latest changes from Git

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Use a user with sudo privileges.${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Pulling latest changes from Git...${NC}"
git pull origin main || git pull origin master

echo -e "${YELLOW}Step 2: Installing/updating Backend dependencies...${NC}"
cd Backend
composer install --optimize-autoloader --no-dev

echo -e "${YELLOW}Step 3: Running database migrations...${NC}"
php artisan migrate --force

echo -e "${YELLOW}Step 4: Optimizing Laravel...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo -e "${YELLOW}Step 5: Installing/updating Frontend dependencies...${NC}"
cd ../frontend
npm install

echo -e "${YELLOW}Step 6: Building Frontend for production...${NC}"
npm run build

echo -e "${YELLOW}Step 7: Setting proper permissions...${NC}"
cd ..
sudo chown -R www-data:www-data "$SCRIPT_DIR"
sudo chmod -R 755 "$SCRIPT_DIR"
sudo chmod -R 775 "$SCRIPT_DIR/Backend/storage"
sudo chmod -R 775 "$SCRIPT_DIR/Backend/bootstrap/cache"

echo -e "${YELLOW}Step 8: Restarting services...${NC}"
sudo systemctl reload php8.2-fpm
sudo systemctl reload nginx

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}Your application should now be updated.${NC}"

