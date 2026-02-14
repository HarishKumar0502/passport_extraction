@echo off
echo ========================================
echo   Passport Extraction Application
echo ========================================
echo.
echo This will start the backend server and open the frontend.
echo.
echo Starting backend server...
start "Passport Backend" cmd /k "cd /d "%~dp0backend" && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Opening frontend in browser...
start "" "frontend\index.html"

echo.
echo ========================================
echo Application started successfully!
echo Backend: http://localhost:8000
echo Frontend: Opened in your default browser
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
