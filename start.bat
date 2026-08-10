@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo Playable Factory - RAG Vector Search Platform
echo ====================================================
echo.

REM 1. Check for .env file
if not exist ".env" (
    echo [1/4] .env dosyasi bulunamadi, .env.example kopyalaniyor...
    copy ".env.example" ".env" >nul
    echo [OK] .env dosyasi olusturuldu.
) else (
    echo [1/4] [OK] .env dosyasi mevcut.
)

REM 2. Install dependencies
echo.
echo [2/4] Bagimliliklar kontrol ediliyor (pnpm install)...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] pnpm install basarisiz oldu.
    pause
    exit /b %ERRORLEVEL%
)

REM 3. Run migrations and seed
echo.
echo [3/4] Veritabani hazirlaniyor ve seed ediliyor (pnpm db:seed)...
call pnpm db:migrate
call pnpm db:seed
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Seed islemi basarisiz oldu.
    pause
    exit /b %ERRORLEVEL%
)

REM 4. Start all services
echo.
echo [4/4] Servisler baslatiliyor...
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
