@echo off
for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set VERSION=%%i
echo === Building QR Generator v%VERSION% ===

set TARGET=%1
if "%TARGET%"=="" set TARGET=win

if "%TARGET%"=="win"   goto build_win
if "%TARGET%"=="linux" goto build_linux
if "%TARGET%"=="all"   goto build_all

echo Usage: build.bat [win^|linux^|all]
exit /b 1

:build_win
npm run build:win
goto done

:build_linux
npm run build:linux
goto done

:build_all
npm run build:all
goto done

:done
echo.
echo Build complete. Artifacts in .\dist\
pause
