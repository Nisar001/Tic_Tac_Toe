# Tic Tac Toe API Test Runner - PowerShell Version
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod", "all")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Folder = "",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("html", "json", "junit", "all")]
    [string]$Report = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

function Show-Help {
    Write-Host "==================================="
    Write-Host "Tic Tac Toe API Test Runner"
    Write-Host "==================================="
    Write-Host ""
    Write-Host "Usage: .\run-tests.ps1 [parameters]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Environment    Target environment (dev, staging, prod, all). Default: dev"
    Write-Host "  -Folder         Specific folder to test (Authentication, Game Management, etc.)"
    Write-Host "  -Report         Generate report (html, json, junit, all)"
    Write-Host "  -Help           Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run-tests.ps1                                    # Run all tests on dev"
    Write-Host "  .\run-tests.ps1 -Environment staging               # Run tests on staging"
    Write-Host "  .\run-tests.ps1 -Folder 'Authentication'          # Test only auth endpoints"
    Write-Host "  .\run-tests.ps1 -Report html                      # Generate HTML report"
    Write-Host "  .\run-tests.ps1 -Environment all -Report all      # Test all envs, all reports"
    Write-Host ""
}

function Test-Newman {
    try {
        $version = newman --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Newman version: $version" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "ERROR: Newman is not installed or not in PATH" -ForegroundColor Red
        Write-Host "Please install Newman first: npm install -g newman" -ForegroundColor Yellow
        return $false
    }
}

function New-ReportsDirectory {
    if (!(Test-Path "reports")) {
        New-Item -ItemType Directory -Path "reports" -Force | Out-Null
        Write-Host "Created reports directory" -ForegroundColor Green
    }
}

function Invoke-ApiTests {
    param(
        [string]$Environment,
        [string]$Folder = "",
        [string]$Report = ""
    )
    
    $collection = "Tic_Tac_Toe_API_Complete.postman_collection.json"
    $envFile = ""
    
    switch ($Environment) {
        "dev" { $envFile = "Tic_Tac_Toe_Development.postman_environment.json" }
        "staging" { $envFile = "Tic_Tac_Toe_Staging.postman_environment.json" }
        "prod" { $envFile = "Tic_Tac_Toe_Production.postman_environment.json" }
    }
    
    # Base Newman command
    $newmanCmd = "newman run `"$collection`" -e `"$envFile`" --color on"
    
    # Add folder filter if specified
    if ($Folder) {
        $newmanCmd += " --folder `"$Folder`""
        Write-Host "Running tests for folder: $Folder on $Environment environment..." -ForegroundColor Cyan
    } else {
        Write-Host "Running all tests on $Environment environment..." -ForegroundColor Cyan
    }
    
    # Add report generation if specified
    if ($Report) {
        New-ReportsDirectory
        switch ($Report) {
            "html" {
                $newmanCmd += " --reporters html --reporter-html-export reports/api-test-report-$Environment.html"
            }
            "json" {
                $newmanCmd += " --reporters json --reporter-json-export reports/api-test-report-$Environment.json"
            }
            "junit" {
                $newmanCmd += " --reporters junit --reporter-junit-export reports/api-test-report-$Environment.xml"
            }
            "all" {
                $newmanCmd += " --reporters html,json,junit"
                $newmanCmd += " --reporter-html-export reports/api-test-report-$Environment.html"
                $newmanCmd += " --reporter-json-export reports/api-test-report-$Environment.json"
                $newmanCmd += " --reporter-junit-export reports/api-test-report-$Environment.xml"
            }
        }
    }
    
    Write-Host "Executing: $newmanCmd" -ForegroundColor Gray
    Write-Host ""
    
    # Execute the command
    Invoke-Expression $newmanCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Tests completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Some tests failed. Check the output above for details." -ForegroundColor Red
    }
    
    if ($Report) {
        Write-Host ""
        Write-Host "📊 Reports generated in the reports/ directory:" -ForegroundColor Yellow
        Get-ChildItem "reports/*$Environment*" | ForEach-Object {
            Write-Host "  - $($_.Name)" -ForegroundColor Cyan
        }
    }
}

# Main execution
Clear-Host

if ($Help) {
    Show-Help
    exit 0
}

Write-Host "==================================="
Write-Host "Tic Tac Toe API Test Runner"
Write-Host "==================================="
Write-Host ""

# Check if Newman is installed
if (!(Test-Newman)) {
    exit 1
}

# Check if collection file exists
if (!(Test-Path "Tic_Tac_Toe_API_Complete.postman_collection.json")) {
    Write-Host "ERROR: Collection file not found in current directory" -ForegroundColor Red
    Write-Host "Make sure you're running this script from the postman/ directory" -ForegroundColor Yellow
    exit 1
}

# Execute tests based on parameters
if ($Environment -eq "all") {
    Write-Host "Running tests on all environments..." -ForegroundColor Magenta
    Write-Host ""
    
    @("dev", "staging") | ForEach-Object {
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host "Environment: $_" -ForegroundColor Magenta
        Write-Host "========================================" -ForegroundColor Magenta
        Invoke-ApiTests -Environment $_ -Folder $Folder -Report $Report
        Write-Host ""
    }
} else {
    Invoke-ApiTests -Environment $Environment -Folder $Folder -Report $Report
}

Write-Host ""
Write-Host "==================================="
Write-Host "Test execution completed!"
Write-Host "==================================="
