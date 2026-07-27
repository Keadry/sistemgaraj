@echo off
chcp 65001 > nul
echo ==========================================
echo   SistemGarajı Başlatılıyor...
echo ==========================================

:: 1. Docker Konteynerini Başlat
echo [1/4] Docker veritabanı (sistemgaraj-db) başlatılıyor...
docker start sistemgaraj-db
timeout /t 5 /nobreak > nul

:: 2. Backend'i Yeni Pencerede Çalıştır
echo [2/4] Backend başlatılıyor...
start "SistemGarajı - Backend" cmd /k "cd /d D:\SistemGaraj && pnpm dev"
timeout /t 7 /nobreak > nul

:: 3. Frontend'i Yeni Pencerede Çalıştır
echo [3/4] Frontend başlatılıyor...
start "SistemGarajı - Frontend" cmd /k "cd /d D:\SistemGaraj\frontend && pnpm dev"
timeout /t 10 /nobreak > nul

:: 4. Servislerin Hazır Olmasını Bekle (5 Saniye)
echo [4/4] Sistemlerin hazır olması bekleniyor...
timeout /t 5 /nobreak > nul

:: 5. Tarayıcıda Localhost'u Aç
echo Tarayıcı açılıyor...
start http://localhost:3000

echo ==========================================
echo   Tüm servisler başarıyla tetiklendi!
echo ==========================================
pause