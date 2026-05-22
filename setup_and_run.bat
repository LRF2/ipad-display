@echo off
title iPad Display - Setup ^& Launch
color 0A

echo.
echo  ================================================
echo   iPad Display Server - Setup
echo  ================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found. Install from python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Install from nodejs.org
    pause
    exit /b 1
)

:: Install Python deps
echo  [1/3] Installing Python dependencies...
pip install -r server\requirements.txt -q
if errorlevel 1 (
    echo  [ERROR] pip install failed
    pause
    exit /b 1
)
echo       Done.

:: Install and build React PWA
echo  [2/3] Installing Node dependencies...
cd client
call npm install --silent
if errorlevel 1 (
    echo  [ERROR] npm install failed
    pause
    exit /b 1
)

echo  [3/3] Building React PWA...
call npm run build
if errorlevel 1 (
    echo  [ERROR] npm build failed
    pause
    exit /b 1
)
cd ..

echo.
echo  ================================================
echo   Setup complete! Starting server...
echo  ================================================
echo.

:: Launch server
python server\main.py

pause
