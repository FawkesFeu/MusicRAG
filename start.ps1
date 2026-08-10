# PowerShell Başlatma Scripti - Playable Factory RAG Platform
$Host.UI.RawUI.WindowTitle = "Playable Factory RAG Platform"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 Playable Factory - RAG Vector Search Platform" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "[1/4] 📄 .env dosyası bulunamadı, .env.example kopyalanıyor..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env dosyası başarıyla oluşturuldu." -ForegroundColor Green
} else {
    Write-Host "[1/4] ✅ .env dosyası mevcut." -ForegroundColor Green
}

# 2. Check pnpm and install dependencies
Write-Host ""
Write-Host "[2/4] 📦 Bağımlılıklar kontrol ediliyor (pnpm install)..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ pnpm install sırasında bir hata oluştu." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Migrate and Seed
Write-Host ""
Write-Host "[3/4] 🌱 Veritabanı ve Vektör Store hazırlanıyor (migrate & seed)..." -ForegroundColor Yellow
pnpm db:migrate
pnpm db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Veritabanı seed edilirken bir hata oluştu." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Start servers
Write-Host ""
Write-Host "[4/4] 🌟 Tüm servisler başlatılıyor (Next.js Frontend + Express API)..." -ForegroundColor Green
Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🌐 Web UI:     http://localhost:3000" -ForegroundColor White
Write-Host "📡 API Server: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "👤 Demo Admin: admin@example.com / admin123Password!" -ForegroundColor Green
Write-Host "👤 Demo User:  user@example.com  / user123Password!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

pnpm dev:all
