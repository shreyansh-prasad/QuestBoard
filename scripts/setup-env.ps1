# PowerShell script to help set up environment variables
# Run with: .\scripts\setup-env.ps1

Write-Host "QuestBoard Environment Variables Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envLocalPath = ".env.local"
$envExamplePath = "env.example"

# Check if .env.local already exists
if (Test-Path $envLocalPath) {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Exiting. No changes made." -ForegroundColor Yellow
        exit 0
    }
}

# Check if env.example exists
if (-not (Test-Path $envExamplePath)) {
    Write-Host "❌ env.example file not found!" -ForegroundColor Red
    Write-Host "Please create it first or manually create .env.local" -ForegroundColor Red
    exit 1
}

# Copy env.example to .env.local
Copy-Item $envExamplePath $envLocalPath -Force

Write-Host ""
Write-Host "✅ Created .env.local from env.example" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open .env.local in your editor" -ForegroundColor White
Write-Host "2. Get your Supabase credentials from: https://app.supabase.com → Settings → API" -ForegroundColor White
Write-Host "3. Replace the placeholder values with your actual credentials" -ForegroundColor White
Write-Host "4. Restart your dev server (npm run dev)" -ForegroundColor White
Write-Host ""
Write-Host "Required variables:" -ForegroundColor Yellow
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host ""
