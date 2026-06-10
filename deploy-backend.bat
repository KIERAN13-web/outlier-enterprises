@echo off

REM Backend Deployment Script for Windows
REM This script prepares the backend for deployment

echo 🚀 Starting Backend Deployment...

cd backend

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env not found in backend directory
    echo Creating .env from .env.example...
    copy .env.example .env
    echo ❌ Please update .env with your production values
    exit /b 1
)

REM Check if serviceAccountKey.json exists OR FIREBASE_SERVICE_ACCOUNT_JSON is provided
if "%FIREBASE_SERVICE_ACCOUNT_JSON%"=="" if not exist "serviceAccountKey.json" (
    echo ❌ Error: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT_JSON is not set
    echo Provide the Firebase service account via the FIREBASE_SERVICE_ACCOUNT_JSON environment variable (Railway) or place serviceAccountKey.json in the backend directory
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    exit /b 1
)

echo.
echo ✅ Backend is ready for deployment!
echo.
echo Deployment options:
echo.
echo 1️⃣  Railway (Recommended):
echo    - Go to https://railway.app
echo    - Connect GitHub and deploy
echo    - Add environment variables in Railway dashboard
echo.
echo 2️⃣  Render:
echo    - Go to https://render.com
echo    - Create Web Service
echo    - Connect GitHub and deploy
echo.
echo 3️⃣  Manual push:
echo    - Ensure all files are committed
echo    - git push
echo    - Railway/Render will auto-deploy
echo.
echo Environment variables to set:
echo   - PORT=4000
echo   - NODE_ENV=production
echo   - CORS_ORIGIN=https://your-frontend-url.vercel.app
echo   - FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
