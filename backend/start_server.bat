@echo off
echo ========================================
echo   Passport Extraction Backend Server
echo ========================================
echo.
echo Starting FastAPI server...
echo Backend will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
