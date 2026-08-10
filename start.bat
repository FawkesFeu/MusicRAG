@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo Playable Factory - RAG Vector Search Platform
echo ====================================================
echo.

REM 1. Check for .env file
if not exist ".env" (
    echo [1/5] .env dosyasi bulunamadi, .env.example kopyalaniyor...
    copy ".env.example" ".env" >nul
    echo [OK] .env dosyasi olusturuldu.
) else (
    echo [1/5] [OK] .env dosyasi mevcut.
)

REM 2. Start Docker Services (PostgreSQL pgvector & Redis)
echo.
echo [2/5] Docker servisleri baslatiliyor (PostgreSQL + pgvector ve Redis)...
call docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [UYARI] Docker Desktop su anda acik degil veya baslatilamadi.
    echo [BILGI] Lutfen Docker Desktop uygulamasini acin veya devam etmek icin bir tusa basin.
    echo [BILGI] Sistem PostgreSQL veya yerel yuksek hizli Vektor Store ile devam edecektir.
    echo.
    timeout /t 3 >nul
) else (
    echo [OK] Docker PostgreSQL (pgvector) ve Redis basariyla baslatildi.
)

REM 3. Install dependencies
echo.
echo [3/5] Bagimliliklar kontrol ediliyor (pnpm install)...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] pnpm install basarisiz oldu.
    pause
    exit /b %ERRORLEVEL%
)

REM 4. Run migrations and seed with Google Semantic Embeddings
echo.
echo [4/5] Vektor veritabani hazirlaniyor ve Google AI ile seed ediliyor...
call pnpm db:migrate
call pnpm db:seed
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Seed islemi basarisiz oldu.
    pause
    exit /b %ERRORLEVEL%
)

REM 5. Start all services
echo.
echo [5/5] Servisler baslatiliyor...
echo.
echo ====================================================
echo Web UI:     http://localhost:3000
echo API Server: http://localhost:3001
echo.
echo Demo Admin: admin@example.com / admin123Password!
echo Demo User:  user@example.com  / user123Password!
echo ====================================================
echo.

call pnpm dev:all
