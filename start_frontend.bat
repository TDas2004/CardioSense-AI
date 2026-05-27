@echo off
echo ============================================================
echo   CardioSense AI - Starting React Frontend
echo   App → http://localhost:3000
echo ============================================================
cd /d "%~dp0\frontend"
call npm install
call npm run dev
