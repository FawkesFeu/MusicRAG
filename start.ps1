# PowerShell Başlatma Scripti - Music Industry RAG Platform
$Host.UI.RawUI.WindowTitle = "Music Industry RAG Platform"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "🚀 Music Industry - RAG Vector Search Platform" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "[1/5] 📄 .env dosyası bulunamadı, .env.example kopyalanıyor..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env dosyası başarıyla oluşturuldu." -ForegroundColor Green
} else {
    Write-Host "[1/5] ✅ .env dosyası mevcut." -ForegroundColor Green
}

# 2. Start Docker Services
Write-Host ""
Write-Host "[2/5] 🐳 Docker servisleri başlatılıyor (PostgreSQL + pgvector ve Redis)..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Docker Desktop açık değil. PostgreSQL + pgvector için Docker Desktop'ı açabilirsiniz." -ForegroundColor Yellow
} else {
    Write-Host "✅ Docker PostgreSQL (pgvector) ve Redis konteynerleri çalışıyor." -ForegroundColor Green
}

# 3. Check pnpm and install dependencies
Write-Host ""
Write-Host "[3/5] 📦 Bağımlılıklar kontrol ediliyor (pnpm install)..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ pnpm install sırasında bir hata oluştu." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Migrate and Seed
Write-Host ""
Write-Host "[4/5] 🌱 Vektör veritabanı hazırlanıyor ve Google AI ile seed ediliyor..." -ForegroundColor Yellow
pnpm db:migrate
pnpm db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Veritabanı seed edilirken bir hata oluştu." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 5. Start servers
Write-Host ""
Write-Host "[5/5] 🌟 Tüm servisler başlatılıyor (Next.js Frontend + Express API)..." -ForegroundColor Green
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
