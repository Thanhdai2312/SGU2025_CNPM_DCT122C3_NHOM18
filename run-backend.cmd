@echo off
REM Build and start backend server.
cd backend
echo Building TypeScript...
call npm run build || goto :error
echo Starting server (Ctrl+C to stop)...
node dist/server.js
goto :eof

:error
echo Build failed.
exit /b 1