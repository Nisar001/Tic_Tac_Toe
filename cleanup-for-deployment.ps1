# PowerShell script to clean up unnecessary files for deployment
Write-Host "🧹 Cleaning up unnecessary files for deployment..." -ForegroundColor Green

# Root level cleanup
Write-Host "📁 Cleaning root directory..." -ForegroundColor Yellow

$rootFilesToRemove = @(
    "validate-oauth-config.js",
    "test-social-auth.js", 
    "debug-config.js",
    "install-frontend.bat",
    "install-frontend.sh",
    "deploy-backend-fixes.sh",
    "cors-test.html",
    "environment-config-template.txt",
    "package-lock.json",
    "SOCIAL_AUTH_FIX_SUMMARY.md",
    "FRONTEND_CONSOLE_CLEANUP.md", 
    "SOCIAL_AUTH_URGENT_FIX.md",
    "SOCIAL_AUTH_FIXES.md",
    "SOCIAL_AUTH_DEPLOYMENT_GUIDE.md",
    "RENDER_ENVIRONMENT_SETUP.md",
    "PRODUCTION_OAUTH_URLS.md",
    "OAUTH_REDIRECT_URLS.md",
    "OAUTH_REDIRECT_URIS_GUIDE.md",
    "NETLIFY_DEPLOYMENT.md",
    "INTEGRATION_COMPLETE.md",
    "FINAL_VERIFICATION_COMPLETE.md",
    "CORS_FIX_GUIDE.md",
    "CORS_FIX_COMPLETE.md",
    "BACKEND_CONSOLE_CLEANUP.md",
    "API_MAPPING_VERIFICATION.md"
)

foreach ($file in $rootFilesToRemove) {
    $fullPath = Join-Path "e:\Solulab\Tic_Tac_Toe" $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "  ✅ Removed: $file" -ForegroundColor Green
    }
}

# Backend cleanup
Write-Host "`n📁 Cleaning backend directory..." -ForegroundColor Yellow

$backendFilesToRemove = @(
    "test-auth-complete.js",
    "test-friends-api.js", 
    "quick-test.js",
    ".env.test",
    ".env.example",
    ".env.production.template",
    "ENV_VARIABLES.md",
    "DEPLOYMENT.md",
    "jest.config.js",
    "nodemon.json",
    ".eslintrc.json",
    ".prettierrc.json"
)

foreach ($file in $backendFilesToRemove) {
    $fullPath = Join-Path "e:\Solulab\Tic_Tac_Toe\backend" $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "  ✅ Removed: backend/$file" -ForegroundColor Green
    }
}

# Remove backend directories that aren't needed in production
$backendDirsToRemove = @(
    "logs",
    "scripts", 
    "docs",
    "types",
    ".vscode"
)

foreach ($dir in $backendDirsToRemove) {
    $fullPath = Join-Path "e:\Solulab\Tic_Tac_Toe\backend" $dir
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Recurse -Force
        Write-Host "  ✅ Removed directory: backend/$dir" -ForegroundColor Green
    }
}

# Frontend cleanup
Write-Host "`n📁 Cleaning frontend directory..." -ForegroundColor Yellow

$frontendFilesToRemove = @(
    ".env.example",
    "README.md"
)

foreach ($file in $frontendFilesToRemove) {
    $fullPath = Join-Path "e:\Solulab\Tic_Tac_Toe\frontend" $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "  ✅ Removed: frontend/$file" -ForegroundColor Green
    }
}

# Remove frontend test/debug utilities
$frontendTestFiles = @(
    "src\utils\apiTest.ts",
    "src\utils\socialAuthTest.ts",
    "src\components\debug\ConnectionTest.tsx"
)

foreach ($file in $frontendTestFiles) {
    $fullPath = Join-Path "e:\Solulab\Tic_Tac_Toe\frontend" $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        Write-Host "  ✅ Removed: frontend/$file" -ForegroundColor Green
    }
}

# Remove .github directory (development specific)
$githubDir = "e:\Solulab\Tic_Tac_Toe\.github"
if (Test-Path $githubDir) {
    Remove-Item $githubDir -Recurse -Force
    Write-Host "  ✅ Removed directory: .github" -ForegroundColor Green
}

Write-Host "`n🎉 Cleanup completed!" -ForegroundColor Green
Write-Host "📦 The following important files were preserved:" -ForegroundColor Cyan
Write-Host "  - README.md (root)" -ForegroundColor White
Write-Host "  - package.json files" -ForegroundColor White
Write-Host "  - .env (production environment files)" -ForegroundColor White
Write-Host "  - Source code (src/ directories)" -ForegroundColor White
Write-Host "  - Build configurations (tsconfig.json, tailwind.config.js, etc.)" -ForegroundColor White
Write-Host "  - Docker files (Dockerfile, .dockerignore)" -ForegroundColor White
Write-Host "  - Production deployment files (render.yaml, netlify.toml)" -ForegroundColor White

Write-Host "`n⚠️  Remember to:" -ForegroundColor Yellow
Write-Host "  1. Update .gitignore if needed" -ForegroundColor White
Write-Host "  2. Test the application after cleanup" -ForegroundColor White
Write-Host "  3. Ensure all environment variables are properly configured" -ForegroundColor White
