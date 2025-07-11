@echo off
setlocal enabledelayedexpansion

echo "==================================="
echo "Tic Tac Toe API Test Runner"
echo "==================================="
echo.

REM Check if Newman is installed
newman --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Newman is not installed. Please install it first:
    echo npm install -g newman
    pause
    exit /b 1
)

REM Create reports directory if it doesn't exist
if not exist "reports" mkdir reports

REM Function to run tests
:run_tests
set "collection=Tic_Tac_Toe_API_Complete.postman_collection.json"
set "env_dev=Tic_Tac_Toe_Development.postman_environment.json"
set "env_staging=Tic_Tac_Toe_Staging.postman_environment.json"

echo Select test environment:
echo 1. Development (localhost:5000)
echo 2. Staging
echo 3. All Environments
echo 4. Specific Folder Tests
echo 5. Generate HTML Report
echo 6. Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto dev_tests
if "%choice%"=="2" goto staging_tests
if "%choice%"=="3" goto all_env_tests
if "%choice%"=="4" goto folder_tests
if "%choice%"=="5" goto generate_report
if "%choice%"=="6" goto end
echo Invalid choice. Please try again.
goto run_tests

:dev_tests
echo.
echo "Running tests against Development environment..."
newman run "%collection%" -e "%env_dev%" --color on
echo.
echo "Development tests completed!"
pause
goto run_tests

:staging_tests
echo.
echo "Running tests against Staging environment..."
newman run "%collection%" -e "%env_staging%" --color on
echo.
echo "Staging tests completed!"
pause
goto run_tests

:all_env_tests
echo.
echo "Running tests against all environments..."
echo.
echo "1. Development Environment:"
newman run "%collection%" -e "%env_dev%" --color on
echo.
echo "2. Staging Environment:"
newman run "%collection%" -e "%env_staging%" --color on
echo.
echo "All environment tests completed!"
pause
goto run_tests

:folder_tests
echo.
echo "Select folder to test:"
echo 1. Authentication
echo 2. Social Authentication
echo 3. Game Management
echo 4. Friend Management
echo 5. Chat System
echo 6. Health Check
echo 7. Back to main menu
echo.
set /p folder_choice="Enter your choice (1-7): "

if "%folder_choice%"=="1" set "folder_name=Authentication"
if "%folder_choice%"=="2" set "folder_name=Social Authentication"
if "%folder_choice%"=="3" set "folder_name=Game Management"
if "%folder_choice%"=="4" set "folder_name=Friend Management"
if "%folder_choice%"=="5" set "folder_name=Chat System"
if "%folder_choice%"=="6" set "folder_name=Health Check"
if "%folder_choice%"=="7" goto run_tests

if defined folder_name (
    echo.
    echo "Running tests for folder: !folder_name!"
    newman run "%collection%" -e "%env_dev%" --folder "!folder_name!" --color on
    echo.
    echo "Folder tests completed!"
    pause
)
goto run_tests

:generate_report
echo.
echo "Select report format:"
echo 1. HTML Report
echo 2. JSON Report
echo 3. JUnit XML Report
echo 4. All Reports
echo 5. Back to main menu
echo.
set /p report_choice="Enter your choice (1-5): "

if "%report_choice%"=="1" goto html_report
if "%report_choice%"=="2" goto json_report
if "%report_choice%"=="3" goto junit_report
if "%report_choice%"=="4" goto all_reports
if "%report_choice%"=="5" goto run_tests

:html_report
echo.
echo "Generating HTML report..."
newman run "%collection%" -e "%env_dev%" --reporters html --reporter-html-export reports/api-test-report.html --color on
echo.
echo "HTML report generated: reports/api-test-report.html"
pause
goto run_tests

:json_report
echo.
echo "Generating JSON report..."
newman run "%collection%" -e "%env_dev%" --reporters json --reporter-json-export reports/api-test-report.json --color on
echo.
echo "JSON report generated: reports/api-test-report.json"
pause
goto run_tests

:junit_report
echo.
echo "Generating JUnit XML report..."
newman run "%collection%" -e "%env_dev%" --reporters junit --reporter-junit-export reports/api-test-report.xml --color on
echo.
echo "JUnit XML report generated: reports/api-test-report.xml"
pause
goto run_tests

:all_reports
echo.
echo "Generating all report formats..."
newman run "%collection%" -e "%env_dev%" --reporters html,json,junit --reporter-html-export reports/api-test-report.html --reporter-json-export reports/api-test-report.json --reporter-junit-export reports/api-test-report.xml --color on
echo.
echo "All reports generated in the reports/ directory"
pause
goto run_tests

:end
echo.
echo "Thank you for using the Tic Tac Toe API Test Runner!"
echo "==================================="
pause
