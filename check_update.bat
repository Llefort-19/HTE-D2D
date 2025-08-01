@echo off
REM Check if local clone is up to date with remote repository

echo 🔍 HTE App Update Check
echo ======================

REM Fetch latest info from remote
echo 📥 Fetching latest info from GitHub...
git fetch origin

REM Check if we're up to date
echo 🔍 Checking update status...

git rev-list --count HEAD..origin/main > temp_count.txt
set /p BEHIND_COUNT=<temp_count.txt
del temp_count.txt

if %BEHIND_COUNT% GTR 0 (
    echo ❌ Your local clone is BEHIND by %BEHIND_COUNT% commits
    echo.
    echo 📋 Missing commits:
    git log HEAD..origin/main --oneline
    echo.
    echo 💡 To update, run: quick_update.bat
) else (
    echo ✅ Your local clone is UP TO DATE!
    echo.
    echo 📋 Latest commits:
    git log --oneline -3
)

echo.
echo 🔗 Remote URL: https://github.com/Llefort-19/HTE-design-app.git
echo 📅 Last fetch: %date% %time%
echo.
pause 