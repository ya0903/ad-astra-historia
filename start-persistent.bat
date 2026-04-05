@echo off
echo Checking for PM2...
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 not found. Installing globally...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo Failed to install PM2. Falling back to standard start...
        call npm start
        exit /b
    )
)

echo Stopping any existing processes...
pm2 delete aah-server >nul 2>&1
pm2 delete aah-client >nul 2>&1

echo Starting Ad Astra Historia via PM2...
pm2 start ecosystem.config.cjs

echo.
echo ==========================================
echo  Ad Astra Historia is running via PM2
echo  Processes persist after terminal closes.
echo.
echo  Server: http://localhost:3001
echo  Client: http://localhost:3000
echo.
echo  pm2 logs        - view logs
echo  pm2 stop all    - stop
echo  pm2 restart all - restart
echo ==========================================
