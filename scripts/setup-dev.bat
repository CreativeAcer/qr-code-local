@echo off
echo === QR Generator — Developer Setup ===

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js is not installed.
    echo Install via winget:
    echo   winget install OpenJS.NodeJS.LTS
    echo.
    echo Or download from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo Node.js: %NODE_VER%

for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo npm: %NPM_VER%

echo.
echo Installing dependencies...
npm install

echo.
echo Setup complete!
echo.
echo Run the app:
echo   npm start
echo.
pause
