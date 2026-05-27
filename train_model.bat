@echo off
echo ============================================================
echo   CardioSense AI - Heart Disease Prediction System
echo   STEP 1: Training ML Model
echo ============================================================
echo.

cd /d "%~dp0"

REM Check Python
python --version >nul 2>&1 || (echo [ERROR] Python not found! Please install Python 3.10+ && pause && exit /b 1)

REM Install backend deps
echo [1/4] Installing Python dependencies...
pip install -r backend\requirements.txt --quiet

REM Ensure DB and reports dirs exist
if not exist database\heart_predictions.db (
    echo [2/4] Initializing database...
    python -c "import sys; sys.path.insert(0,''); from database.database import init_db; init_db(); print('[DB] Database initialized.')"
)

REM Train model
echo [3/4] Training ML model (this may take 2-5 minutes)...
python utils\train_model.py

echo.
echo [4/4] Model training complete!
echo.
echo ============================================================
echo   Now run:  start_backend.bat
echo             start_frontend.bat
echo ============================================================
pause
