#!/bin/bash

# ============================================
# INDASH Deployment Script
# Target: integrasi.brmpkementan.id
# ============================================

set -e

# Configuration
SERVER="integrasi.brmpkementan.id"
REMOTE_PATH="/var/www/html/"
LOCAL_BUILD="./www/"
EXCLUDE_DIRS="bcwag .htaccess"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   INDASH Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Ask if user wants to build first
read -p "Build production first? (Y/n): " BUILD_FIRST

if [[ "$BUILD_FIRST" != "n" && "$BUILD_FIRST" != "N" ]]; then
    echo -e "${YELLOW}[BUILD] Running production build...${NC}"
    echo ""
    npx ng build --configuration production
    echo ""
    echo -e "${GREEN}[BUILD] Complete!${NC}"
    echo ""
fi

# Check if www folder exists
if [ ! -d "$LOCAL_BUILD" ]; then
    echo -e "${RED}Error: Build folder '$LOCAL_BUILD' not found!${NC}"
    echo -e "${YELLOW}Run 'npx ng build --configuration production' first.${NC}"
    exit 1
fi

# Copy PHP API files to www/ folder
echo -e "${YELLOW}[COPY] Copying PHP API files to build folder...${NC}"
PHP_FILES=("geojson-api.php" "api.php")
for php_file in "${PHP_FILES[@]}"; do
    if [ -f "$php_file" ]; then
        cp -v "$php_file" ./www/
        echo -e "  ${GREEN}✓${NC} $php_file"
    else
        echo -e "  ${YELLOW}⚠${NC} $php_file not found, skipping"
    fi
done
echo -e "${GREEN}[COPY] PHP files copied!${NC}"
echo ""

# Get SSH user
read -p "SSH Username: " SSH_USER

if [ -z "$SSH_USER" ]; then
    echo -e "${RED}Error: Username cannot be empty${NC}"
    exit 1
fi

REMOTE_DEST="${SSH_USER}@${SERVER}:${REMOTE_PATH}"

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Server:      $SERVER"
echo "  Remote Path: $REMOTE_PATH"
echo "  Local Build: $LOCAL_BUILD"
echo "  Excluded:    $EXCLUDE_DIRS"
echo "  PHP Files:   ${PHP_FILES[*]}"
echo ""

# Dry-run first
echo -e "${YELLOW}[DRY-RUN] Checking files to be transferred...${NC}"
echo ""

rsync -avzn --checksum --delete --exclude='bcwag' --exclude='.htaccess' "$LOCAL_BUILD" "$REMOTE_DEST"

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Above is a PREVIEW (no files transferred yet)${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Confirm deployment
read -p "Proceed with deployment? (y/N): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

# Execute deployment
echo ""
echo -e "${GREEN}[DEPLOYING] Transferring files...${NC}"
echo ""

rsync -avz --checksum --delete --exclude='bcwag' --exclude='.htaccess' "$LOCAL_BUILD" "$REMOTE_DEST"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Visit: ${GREEN}https://integrasi.brmpkementan.id${NC}"
