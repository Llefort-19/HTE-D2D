@echo off
REM HTE App Installation Verification Script
REM Checks if all dependencies are properly installed

echo 🔍 HTE App Installation Verification
echo ===================================

echo.
echo 📋 Checking Node.js...
node --version
if errorlevel 1 (
    echo ❌ Node.js not found
) else (
    echo ✅ Node.js is installed
)

echo.
echo 📋 Checking npm...
npm --version
if errorlevel 1 (
    echo ❌ npm not found
) else (
    echo ✅ npm is installed
)

echo.
echo 📋 Checking Python...
python --version
if errorlevel 1 (
    echo ❌ Python not found
) else (
    echo ✅ Python is installed
)

echo.
echo 📋 Checking root node_modules...
if exist "node_modules" (
    echo ✅ Root node_modules found
) else (
    echo ❌ Root node_modules missing - run: npm install --legacy-peer-deps
)

echo.
echo 📋 Checking frontend node_modules...
if exist "frontend\node_modules" (
    echo ✅ Frontend node_modules found
) else (
    echo ❌ Frontend node_modules missing - run: cd frontend && npm install --legacy-peer-deps
)

echo.
echo 📋 Checking http-proxy-middleware...
if exist "frontend\node_modules\http-proxy-middleware" (
    echo ✅ http-proxy-middleware installed
) else (
    echo ❌ http-proxy-middleware missing - run: cd frontend && npm install --legacy-peer-deps
)

echo.
echo 📋 Checking Python packages...
python -c "import flask, pandas, openpyxl, numpy, rdkit" 2>nul
if errorlevel 1 (
    echo ❌ Some Python packages missing - run: pip install -r requirements.txt --no-cache-dir
) else (
    echo ✅ Python packages installed
)

echo.
echo 📋 Checking port 5000 availability...
netstat -an | findstr :5000 >nul
if errorlevel 1 (
    echo ✅ Port 5000 is available
) else (
    echo ⚠️ Port 5000 is in use - backend may already be running
)

echo.
echo ===================================
echo 📋 Summary:
echo    - Run 'npm start' to start the application
echo    - If issues found, run 'install_dependencies.bat'
echo    - Check 'DEPENDENCY_TROUBLESHOOTING.md' for help
echo.
pause 