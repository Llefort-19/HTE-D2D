@echo off
REM HTE Design App Deployment Script for Windows
REM This script sets up the application on a new Windows machine

echo 🚀 HTE Design App Deployment Script
echo ==================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python version: %PYTHON_VERSION%

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm 8 or higher.
    pause
    exit /b 1
)

REM Check npm version
for /f "tokens=1" %%i in ('npm --version 2^>^&1') do set NPM_VERSION=%%i
echo ✅ npm version: %NPM_VERSION%

echo ✅ Prerequisites check passed

REM Upgrade pip to latest version
echo 📦 Upgrading pip...
python -m pip install --upgrade pip

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt --no-cache-dir

if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    echo 💡 Try running: pip install --upgrade setuptools wheel
    pause
    exit /b 1
)

REM Install npm dependencies
echo 📦 Installing npm dependencies...
npm install --no-audit

if errorlevel 1 (
    echo ❌ Failed to install npm dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install --no-audit
cd ..

if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Run security audit and fix non-breaking issues
echo 🔒 Running security audit...
cd frontend
npm audit fix --force
cd ..

echo ✅ All dependencies installed successfully!
echo.
echo 🎉 Setup complete! You can now start the application:
echo    npm start
echo.
echo The application will be available at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo ⚠️  Note: Some security warnings may remain. Run 'npm audit' in frontend/ to check.
echo.
echo 🔧 React Scripts Fix: If you encounter 'onAfterSetupMiddleware' errors:
echo    - The setupProxy.js file has been added to handle proxy configuration
echo    - This resolves the deprecated middleware issue in react-scripts 5.0.1
pause 