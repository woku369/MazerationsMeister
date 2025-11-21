# Start Electron in Development Mode
$env:NODE_ENV = "development"
Write-Host "🔧 Setting NODE_ENV=development" -ForegroundColor Green
Write-Host "📦 Compiling TypeScript..." -ForegroundColor Cyan
& npm run typecheck
if ($LASTEXITCODE -eq 0) {
    Write-Host "🚀 Starting Electron..." -ForegroundColor Green
    & npx electron .
} else {
    Write-Host "❌ TypeScript compilation failed" -ForegroundColor Red
}
