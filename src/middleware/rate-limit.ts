import rateLimit from 'express-rate-limit';
import { createRateLimitStore } from './rate-limit-store.js';

/**
 * Sayaçlar Upstash Redis'te tutuluyor — ortam değişkenleri tanımlıysa.
 * Tanımlı değilse `store` undefined kalıyor ve kütüphane kendi MemoryStore'unu
 * kullanıyor; yerel geliştirme hiçbir bulut hesabı istemeden çalışsın diye.
 *
 * Paylaşımlı depo sunucusuzda şart: her fonksiyon örneği kendi belleğiyle
 * açıldığı için MemoryStore'la 10'luk bir sınır fiilen "örnek sayısı × 10"
 * oluyor.
 *
 * İki limiter ayrı önek kullanıyor; aksi halde aynı IP'nin genel API sayacı
 * ile giriş denemesi sayacı tek anahtarda toplanırdı.
 */

/**
 * Tüm API için geniş bir tavan. Normal kullanımda kimse buna çarpmaz; amaç
 * kaçak scriptleri ve kazara döngüleri kesmek.
 *
 * Anahtar IP — kullanıcı bazlı saymak cazip ama bu middleware rotalardan
 * önce, yani kimlik doğrulamadan önce çalışıyor; `req.userId` burada hiçbir
 * zaman dolu olmaz. Sınırı kullanıcıya bağlamak isteseydik limiter'ı auth'un
 * arkasına almak gerekirdi. Sonucu: aynı çıkış IP'sini paylaşan kullanıcılar
 * (okul, iş yeri, mobil CGNAT) tek kovayı paylaşıyor — bu yüzden tavan
 * bilerek yüksek tutuldu.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRateLimitStore('rl:api:'),
  message: {
    error: 'Çok fazla istek gönderdin. Biraz bekleyip tekrar dene.',
  },
});

/**
 * Giriş ve kayıt için dar limit — şifre deneme saldırısının hedefi burası.
 *
 * `skipSuccessfulRequests` bilerek açık: sayaç yalnızca başarısız denemeleri
 * biriktiriyor. Şifresini doğru bilen biri, aynı IP'den art arda giriş yapsa
 * bile kilitlenmiyor; kilitlenen sadece deneme yanılma yapan oluyor.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: createRateLimitStore('rl:auth:'),
  message: {
    error:
      'Çok fazla başarısız deneme yapıldı. 15 dakika sonra tekrar dene.',
  },
});
