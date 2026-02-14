@echo off
echo ========================================
echo   Testing Model Detection
echo ========================================
echo.
echo This script will help debug why the model isn't detecting objects.
echo.

cd /d "%~dp0backend"

echo Starting backend with verbose logging...
echo.
echo Watch for these messages:
echo - "Number of boxes detected"
echo - "Detected: class_id=X, confidence=Y"
echo.
echo If you see "Number of boxes detected: 0", the model is not finding anything.
echo.
echo Press Ctrl+C to stop when done testing.
echo.

python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
