@echo off
REM HTE Design App Production Deployment Script
REM This script sets up the application with security fixes and production optimizations

echo 🚀 HTE Design App Production Deployment
echo ======================================

REM Check if running as administrator (recommended for production)
net session >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Warning: Not running as administrator. Some operations may fail.
    echo    Consider running this script as administrator for best results.
    pause
)

REM Check Python version and compatibility
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.9-3.11 for best compatibility.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python version: %PYTHON_VERSION%

REM Check Node.js version
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Check npm version
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm 9 or higher.
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('npm --version 2^>^&1') do set NPM_VERSION=%%i
echo ✅ npm version: %NPM_VERSION%

echo ✅ Prerequisites check passed

REM Clean existing installations
echo 🧹 Cleaning existing installations...
if exist node_modules rmdir /s /q node_modules
if exist frontend\node_modules rmdir /s /q frontend\node_modules
if exist package-lock.json del package-lock.json
if exist frontend\package-lock.json del frontend\package-lock.json

REM Upgrade pip and install build tools
echo 📦 Upgrading pip and build tools...
python -m pip install --upgrade pip setuptools wheel

REM Install Python dependencies with specific versions
echo 📦 Installing Python dependencies...
pip install -r requirements.txt --no-cache-dir --force-reinstall

if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    echo 💡 Try installing RDKit separately: conda install -c conda-forge rdkit
    pause
    exit /b 1
)

REM Install root npm dependencies
echo 📦 Installing root npm dependencies...
npm install --no-audit --production

if errorlevel 1 (
    echo ❌ Failed to install root npm dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies with security fixes
echo 📦 Installing frontend dependencies...
cd frontend
npm install --no-audit

REM Apply security fixes
echo 🔒 Applying security fixes...
npm audit fix --force

REM Remove development dependencies for production
echo 🧹 Removing development dependencies...
npm prune --production

cd ..

if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Create production build
echo 🏗️  Creating production build...
cd frontend
npm run build
cd ..

if errorlevel 1 (
    echo ❌ Failed to create production build
    pause
    exit /b 1
)

REM Set up environment variables
echo 🔧 Setting up environment variables...
if not exist .env (
    echo FLASK_ENV=production > .env
    echo FLASK_DEBUG=False >> .env
    echo NODE_ENV=production >> .env
)

echo ✅ Production deployment complete!
echo.
echo 🎉 Your application is ready for production!
echo.
echo 📋 Next steps:
echo    1. Configure your web server (nginx/Apache)
echo    2. Set up SSL certificates
echo    3. Configure environment variables
echo    4. Set up database if needed
echo.
echo 🔗 Application URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo ⚠️  Security Notes:
echo    - Run 'npm run audit' regularly to check for vulnerabilities
echo    - Keep dependencies updated
echo    - Monitor application logs
echo.
pause 