@echo off
REM HTE App Update Script
REM Updates code from GitHub and installs only new dependencies

echo 🔄 HTE App Update Script
echo ======================

REM Check if we're in a git repository
git status >nul 2>&1
if errorlevel 1 (
    echo ❌ Not in a git repository. Please run this from the HTE App directory.
    pause
    exit /b 1
)

REM Stash any local changes
echo 📦 Stashing local changes...
git stash

REM Pull latest changes
echo 🔄 Pulling latest changes from GitHub...
git pull origin main

REM Pop stashed changes (if any)
echo 📦 Restoring local changes...
git stash pop

REM Check if package.json files changed
echo 🔍 Checking for dependency changes...

REM Check if frontend package.json changed
git diff --name-only HEAD~1 | findstr "frontend/package.json" >nul
if not errorlevel 1 (
    echo 📦 Frontend dependencies changed, updating...
    cd frontend
    npm install --legacy-peer-deps --no-audit
    cd ..
) else (
    echo ✅ Frontend dependencies unchanged
)

REM Check if root package.json changed
git diff --name-only HEAD~1 | findstr "package.json" >nul
if not errorlevel 1 (
    echo 📦 Root dependencies changed, updating...
    npm install --legacy-peer-deps --no-audit
) else (
    echo ✅ Root dependencies unchanged
)

REM Check if requirements.txt changed
git diff --name-only HEAD~1 | findstr "requirements.txt" >nul
if not errorlevel 1 (
    echo 📦 Python dependencies changed, updating...
    pip install -r requirements.txt --no-cache-dir
) else (
    echo ✅ Python dependencies unchanged
)

REM Check if setupProxy.js changed
git diff --name-only HEAD~1 | findstr "setupProxy.js" >nul
if not errorlevel 1 (
    echo 📦 Proxy configuration changed, reinstalling frontend dependencies...
    cd frontend
    npm install --legacy-peer-deps --no-audit
    cd ..
)

echo.
echo ✅ Update complete!
echo 🚀 You can now start the application:
echo    npm start
echo.
echo 📋 If you encounter issues, run: install_dependencies.bat
echo.
pause 