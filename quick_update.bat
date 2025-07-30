@echo off
REM Quick Update Script for Existing HTE App Installations
REM Use this when you already have the app installed and want the latest code

echo 🚀 HTE App Quick Update
echo =====================

REM Pull latest code
echo 📥 Pulling latest code from GitHub...
git pull origin main

REM Check if dependencies need updating
echo 🔍 Checking for dependency changes...

REM Check frontend dependencies
git diff --name-only HEAD~1 | findstr "frontend/package.json" >nul
if not errorlevel 1 (
    echo 📦 Updating frontend dependencies...
    cd frontend
    npm install --no-audit
    cd ..
) else (
    echo ✅ Frontend dependencies unchanged
)

REM Check root dependencies
git diff --name-only HEAD~1 | findstr "package.json" >nul
if not errorlevel 1 (
    echo 📦 Updating root dependencies...
    npm install --no-audit
) else (
    echo ✅ Root dependencies unchanged
)

REM Check Python dependencies
git diff --name-only HEAD~1 | findstr "requirements.txt" >nul
if not errorlevel 1 (
    echo 📦 Updating Python dependencies...
    pip install -r requirements.txt --no-cache-dir
) else (
    echo ✅ Python dependencies unchanged
)

echo.
echo ✅ Update complete!
echo 🚀 Starting the application...
npm start 