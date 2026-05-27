@echo off
echo ============================================================
echo   CardioSense AI - Starting FastAPI Backend
echo   API → http://localhost:8000
echo   Docs → http://localhost:8000/docs
echo ============================================================
cd /d "%~dp0"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
