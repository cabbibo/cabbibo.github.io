@echo off
REM Clinical Trial Atlas - local static server
cd /d "%~dp0"
echo.
echo   Clinical Trial Atlas
echo   http://127.0.0.1:8731
echo   Ctrl+C to stop
echo.
start "" http://127.0.0.1:8731
python -m http.server 8731 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo   Python not found. Trying Node...
  npx --yes http-server -p 8731 -a 127.0.0.1
)
