@echo off
echo Starting HTE App...
echo.

echo Starting Backend (Flask API)...
start "HTE Backend" cmd /k "cd backend && python app.py"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend (React App)...
start "HTE Frontend" cmd /k "cd frontend && npm start"

echo.
echo HTE App is starting...
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul 