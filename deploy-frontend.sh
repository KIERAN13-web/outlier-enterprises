#!/bin/bash

# Frontend Deployment Script for Vercel
# This script automates the frontend build and deployment process

echo "🚀 Starting Frontend Deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    echo "Please create .env.production with your production environment variables"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
fi

# Run linter
echo -e "${GREEN}🔍 Running linter...${NC}"
npm run lint
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Linting failed${NC}"
    exit 1
fi

# Build the application
echo -e "${GREEN}🔨 Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build successful!${NC}"
echo "📁 Build output is in the 'dist' directory"
echo ""
echo "Next steps:"
echo "1. Ensure .env.production variables are set correctly"
echo "2. Push to GitHub: git push"
echo "3. Vercel will automatically deploy"
echo ""
echo "To deploy manually to Vercel:"
echo "  npm install -g vercel"
echo "  vercel --prod"
