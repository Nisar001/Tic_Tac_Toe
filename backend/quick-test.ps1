# Quick API Test Script
# Run this after your server is started

$baseUrl = "http://localhost:5000"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Tic Tac Toe API - Quick Test" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[1/5] Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Health Check: SUCCESS" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Database: $($response.database)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: API Documentation
Write-Host "[2/5] Testing API Documentation..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api" -Method GET
    Write-Host "✅ API Documentation: SUCCESS" -ForegroundColor Green
    Write-Host "   Version: $($response.version)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API Documentation: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: User Registration
Write-Host "[3/5] Testing User Registration..." -ForegroundColor Yellow
$testUser = @{
    username = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')"
    email = "test$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "TestPassword123!"
    displayName = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $testUser -ContentType "application/json"
    Write-Host "✅ User Registration: SUCCESS" -ForegroundColor Green
    Write-Host "   User ID: $($response.data.user.id)" -ForegroundColor Gray
    
    # Store token for next test
    $global:authToken = $response.data.token
    $global:userId = $response.data.user.id
    
} catch {
    Write-Host "❌ User Registration: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Get User Profile (requires authentication)
Write-Host "[4/5] Testing Get Profile..." -ForegroundColor Yellow
if ($global:authToken) {
    try {
        $headers = @{ "Authorization" = "Bearer $global:authToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/profile" -Method GET -Headers $headers
        Write-Host "✅ Get Profile: SUCCESS" -ForegroundColor Green
        Write-Host "   Username: $($response.data.username)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Get Profile: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️  Get Profile: SKIPPED (no auth token)" -ForegroundColor Yellow
}

Write-Host ""

# Test 5: Create Custom Game (requires authentication)
Write-Host "[5/5] Testing Create Game..." -ForegroundColor Yellow
if ($global:authToken) {
    $gameData = @{
        isPrivate = $false
        timeLimit = 300
        difficulty = "medium"
    } | ConvertTo-Json
    
    try {
        $headers = @{ "Authorization" = "Bearer $global:authToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/game/create-custom" -Method POST -Body $gameData -ContentType "application/json" -Headers $headers
        Write-Host "✅ Create Game: SUCCESS" -ForegroundColor Green
        Write-Host "   Game ID: $($response.data.id)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Create Game: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️  Create Game: SKIPPED (no auth token)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Quick Test Completed!" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Use Postman for comprehensive testing" -ForegroundColor Gray
Write-Host "2. Run: newman for automated testing" -ForegroundColor Gray
Write-Host "3. Check the postman/ directory for full test suite" -ForegroundColor Gray
