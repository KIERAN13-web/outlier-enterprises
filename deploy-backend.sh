#!/bin/bash

# Backend Deployment Script for Railway
# This script prepares the backend for deployment

echo "🚀 Starting Backend Deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env not found in backend directory${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${RED}❌ Please update .env with your production values${NC}"
    exit 1
fi

# Check if serviceAccountKey.json exists
if [ ! -f "serviceAccountKey.json" ]; then
    echo -e "${RED}❌ Error: serviceAccountKey.json not found${NC}"
    echo "Please place your Firebase service account key in the backend directory"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
fi

# Test if server starts
echo -e "${GREEN}🧪 Testing server startup...${NC}"
timeout 5 npm start > /dev/null 2>&1 &
sleep 2

# Check if port is listening
if lsof -i :4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server started successfully on port 4000${NC}"
    pkill -f "npm start" 2>/dev/null
else
    echo -e "${RED}⚠️  Could not verify server startup${NC}"
fi

echo ""
echo -e "${GREEN}✅ Backend is ready for deployment!${NC}"
echo ""
echo "Deployment options:"
echo ""
echo "1️⃣  Railway (Recommended):"
echo "   - Go to https://railway.app"
echo "   - Connect GitHub and deploy"
echo "   - Add environment variables in Railway dashboard"
echo ""
echo "2️⃣  Render:"
echo "   - Go to https://render.com"
echo "   - Create Web Service"
echo "   - Connect GitHub and deploy"
echo ""
echo "3️⃣  Manual push:"
echo "   - Ensure all files are committed"
echo "   - git push"
echo "   - Railway/Render will auto-deploy"
echo ""
echo "Environment variables to set:"
echo "  - PORT=4000"
echo "  - NODE_ENV=production"
echo "  - CORS_ORIGIN=https://your-frontend-url.vercel.app"
echo "  - FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json"
