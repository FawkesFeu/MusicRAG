@echo off
chcp 65001 > nul
echo ====================================================
echo 🚀 Playable Factory - RAG Vector Search Platform
echo ====================================================
echo.

:: 1. Check for .env file
if not exist .env (
    echo [1/4] .env dosyasi bulunamadi, .env.example kopyalaniyor...
    copy .env.example .env > nul
    echo ✅ .env dosyasi olusturuldu.
) else (
    echo [1/4] ✅ .env dosyasi mevcut.
)

:: 2. Install dependencies
echo.
echo [2/4] Bagimliliklar kontrol ediliyor (pnpm install)...
call pnpm install
if %ERRORLEVEL% neq 0 (
    echo ❌ pnpm install sirasinda bir hata olustu.
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Run migrations and seed
echo.
echo [3/4] Veritabani / Vektor Store hazirlaniyor ve seed ediliyor...
call pnpm db:migrate
call pnpm db:seed
if %ERRORLEVEL% neq 0 (
    echo ❌ Veritabani seed edilirken hata olustu.
    pause
    exit /b %ERRORLEVEL%
)

:: 4. Start all services
echo.
echo [4/4] 🌟 Tum servisler baslatiliyor (Frontend + Backend API)...
echo.
echo ====================================================
echo 🌐 Web UI:     http://localhost:3000
echo 📡 API Server: http://localhost:3001
echo.
echo 👤 Demo Admin: admin@example.com / admin123Password!
echo 👤 Demo User:  user@example.com  / user123Password!
echo ====================================================
echo.

call pnpm dev:all
