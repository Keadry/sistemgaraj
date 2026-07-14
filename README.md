# 🛠️ SistemGaraj

**Türkçe PC parça, sistem paylaşma ve topluluk platformu.** SistemGaraj, kullanıcıların PC sistemlerini uyumluluk kontrolünden geçirerek toplamasını, paylaşmasını ve topluluktan geri bildirim almasını sağlar.

## ✨ Özellikler

### 🔧 Uyum Zekası Motoru

- CPU-Anakart soket uyumu (AM5, AM4, LGA1700)
- RAM nesli uyumu (DDR4/DDR5)
- Güç kaynağı yeterlilik kontrolü (%20 güvenlik payı ile)
- Kasa-Anakart fiziksel boyut uyumu
- Parça seçim ekranında uyumsuz seçenekler otomatik soluklaşır

### 👥 Topluluk

- Sistem paylaşma, keşfetme, beğenme ve yorum yapma
- **Önerilen Sistemler** — editör seçimi öne çıkan sistemler
- Otomatik + manuel yorum moderasyonu (yasaklı kelime filtresi + onay kuyruğu)
- Yorum spam engeli (bekleme süresi + tekrar mesaj engeli)

### 🛡️ Yönetim Paneli

- Rol tabanlı yetkilendirme (User / Moderatör / Admin)
- Kullanıcı susturma (geçici) ve banlama (kalıcı)
- Yorum onaylama/reddetme/silme
- Sistemleri öne çıkarma
- Kullanıcı bazlı aktivite geçmişi (beğeniler + yorumlar)

### 🔐 Kimlik Doğrulama

- JWT tabanlı kayıt/giriş sistemi
- bcrypt ile şifreleme

## 🧱 Teknoloji Yığını

**Backend**

- Node.js + TypeScript + Express 5
- PostgreSQL 16 (Docker)
- Prisma 6 ORM
- JWT + bcryptjs

**Frontend**

- Next.js 15 (App Router)
- Tailwind CSS 4
- TypeScript

## 📁 Proje Yapısı

```
SistemGaraj/
├── src/                       # Backend kaynak kodu
│   ├── routes/                 # API rotaları (auth, builds, admin, components)
│   ├── middleware/               # Auth & yetkilendirme ara katmanları
│   ├── services/                   # Uyum algoritması & moderasyon
│   └── index.ts                      # Express giriş noktası
├── prisma/
│   └── schema.prisma                   # Veritabanı şeması
├── frontend/                    # Next.js uygulaması
│   └── src/
│       ├── app/                   # Sayfalar (feed, sistem detay, admin, auth)
│       ├── components/               # UI bileşenleri
│       └── lib/                        # API istemcisi & auth context
└── requests.http                  # API test istekleri (REST Client)
```

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- Docker Desktop

### 1. Veritabanını Başlat

```bash
docker run --name sistemgaraj-db \
  -e POSTGRES_USER=sistemgaraj_user \
  -e POSTGRES_PASSWORD=sistemgaraj_pass \
  -e POSTGRES_DB=sistemgaraj_db \
  -p 5432:5432 -d postgres:16
```

### 2. Backend

```bash
npm install
# .env dosyasını oluştur (DATABASE_URL, JWT_SECRET, PORT=4000)
npx prisma migrate dev
npm run seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
# .env.local dosyasını oluştur (NEXT_PUBLIC_API_URL=http://localhost:4000)
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🗺️ Yol Haritası

- [x] Uyum kontrol motoru
- [x] Backend API (auth, builds, moderasyon)
- [x] Topluluk özellikleri (beğeni, yorum, paylaşım)
- [x] Yönetim paneli
- [ ] Fiyat/parça verisi için otomatik veri kazıma (scraper)
- [ ] AI destekli sistem önerisi (bütçeye göre otomatik build)
- [ ] Kullanıcı profil sayfaları

## 📄 Lisans

Bu proje kişisel/eğitim amaçlı geliştirilmektedir.
