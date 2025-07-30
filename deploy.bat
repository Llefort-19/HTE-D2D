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

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm 8 or higher.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

REM Install npm dependencies
echo 📦 Installing npm dependencies...
npm install

if errorlevel 1 (
    echo ❌ Failed to install npm dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo ✅ All dependencies installed successfully!
echo.
echo 🎉 Setup complete! You can now start the application:
echo    npm start
echo.
echo The application will be available at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
pause 