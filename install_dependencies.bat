@echo off
REM HTE App Dependency Installation Script
REM Handles cross-platform dependency issues and ensures compatibility

echo 🔧 HTE App Dependency Installation Script
echo ========================================

REM Check Node.js version
echo 📋 Checking Node.js version...
node --version
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check npm version
echo 📋 Checking npm version...
npm --version
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm 8 or higher.
    pause
    exit /b 1
)

REM Clear npm cache
echo 🧹 Clearing npm cache...
npm cache clean --force

REM Clear node_modules and package-lock files
echo 🗑️ Removing existing node_modules...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del "package-lock.json"
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
if exist "frontend\package-lock.json" del "frontend\package-lock.json"

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install --legacy-peer-deps

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install --legacy-peer-deps
cd ..

REM Check Python installation
echo 📋 Checking Python installation...
python --version
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    echo    Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file...
    echo FLASK_ENV=development > .env
    echo FLASK_DEBUG=1 >> .env
)

echo.
echo ✅ Installation complete!
echo 🚀 You can now start the application:
echo    npm start
echo.
echo 📋 Troubleshooting tips:
echo    - If you encounter React Scripts issues, try: npm run clean
echo    - If proxy issues occur, check that backend is running on port 5000
echo    - For Python issues, ensure you have Python 3.8+ installed
echo.
pause 