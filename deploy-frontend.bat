@echo off

REM Frontend Deployment Script for Windows
REM This script automates the frontend build process

echo 🚀 Starting Frontend Deployment...

REM Check if .env.production exists
if not exist ".env.production" (
    echo ❌ Error: .env.production not found
    echo Please create .env.production with your production environment variables
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    exit /b 1
)

REM Run linter
echo 🔍 Running linter...
call npm run lint
if errorlevel 1 (
    echo ❌ Linting failed (non-critical, continuing...)
)

REM Build the application
echo 🔨 Building application...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Frontend build successful!
echo 📁 Build output is in the 'dist' directory
echo.
echo Next steps:
echo 1. Ensure .env.production variables are set correctly
echo 2. Push to GitHub: git push
echo 3. Vercel will automatically deploy
echo.
echo To deploy manually to Vercel:
echo   npm install -g vercel
echo   vercel --prod
