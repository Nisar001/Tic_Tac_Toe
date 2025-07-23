$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Remove console.log statements
    $content = $content -replace 'console\.log\([^)]*\);\s*\n?', ''
    $content = $content -replace '\s*console\.log\([^)]*\);', ''
    
    # Remove console.info statements
    $content = $content -replace 'console\.info\([^)]*\);\s*\n?', ''
    $content = $content -replace '\s*console\.info\([^)]*\);', ''
    
    # Remove console.debug statements
    $content = $content -replace 'console\.debug\([^)]*\);\s*\n?', ''
    $content = $content -replace '\s*console\.debug\([^)]*\);', ''
    
    # Clean up empty lines
    $content = $content -replace '\n\s*\n\s*\n', "`n`n"
    
    Set-Content $file.FullName $content
}

Write-Host "Console.log statements removed from all TypeScript files"
