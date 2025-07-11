@echo off
echo ===============================================
echo Tic Tac Toe API Testing
echo ===============================================

REM Check if Newman is installed
newman --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Newman is not installed. Installing...
    npm install -g newman
    if %errorlevel% neq 0 (
        echo Failed to install Newman. Please install manually: npm install -g newman
        pause
        exit /b 1
    )
)

REM Create reports directory
if not exist "postman\reports" mkdir postman\reports

echo Testing server connectivity...
curl -f http://localhost:5000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Server is not running on http://localhost:5000
    echo Please start the server first with: npm run dev
    pause
    exit /b 1
)

echo Server is running! Starting API tests...
echo.

REM Run health check tests
echo [1/6] Testing Health Check endpoints...
newman run postman\Tic_Tac_Toe_API.postman_collection.json -e postman\Tic_Tac_Toe_Development.postman_environment.json --folder "Health Check" --color on

REM Run authentication tests
echo.
echo [2/6] Testing Authentication endpoints...
newman run postman\Tic_Tac_Toe_API.postman_collection.json -e postman\Tic_Tac_Toe_Development.postman_environment.json --folder "Authentication" --color on

REM Run game management tests
echo.
echo [3/6] Testing Game Management endpoints...
newman run postman\Tic_Tac_Toe_API.postman_collection.json -e postman\Tic_Tac_Toe_Development.postman_environment.json --folder "Game Management" --color on

REM Run friend management tests
echo.
echo [4/6] Testing Friend Management endpoints...
newman run postman\Tic_Tac_Toe_API.postman_collection.json -e postman\Tic_Tac_Toe_Development.postman_environment.json --folder "Friend Management" --color on

REM Run chat system tests
echo.
echo [5/6] Testing Chat System endpoints...
newman run postman\Tic_Tac_Toe_API.postman_collection.json -e postman\Tic_Tac_Toe_Development.postman_environment.json --folder "Chat System" --color on

REM Generate comprehensive report
echo.
echo [6/6] Generating comprehensive test report...
newman run postman\Tic_Tac_Toe_API.postman_collection.json -e postman\Tic_Tac_Tac_Development.postman_environment.json --reporters html --reporter-html-export postman\reports\api-test-report.html --color on

echo.
echo ===============================================
echo API Testing Completed!
echo ===============================================
echo.
echo Reports generated:
echo - HTML Report: postman\reports\api-test-report.html
echo.
echo Open the HTML report in your browser to see detailed results.
pause
