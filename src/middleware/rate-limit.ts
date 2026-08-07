import rateLimit from 'express-rate-limit';

/**
 * DİKKAT — serverless'a taşındığında bu yetmez.
 *
 * express-rate-limit varsayılan olarak sayaçları süreç belleğinde tutar. Tek
 * bir uzun ömürlü sunucuda bu doğru çalışır. Vercel'de her fonksiyon örneği
 * kendi belleğiyle açılır ve trafik birden çok örneğe dağılır; sayaçlar
 * bölünür, soğuk başlangıçta sıfırlanır. O aşamada Upstash Redis / Vercel KV
 * gibi paylaşımlı bir store bağlanmalı — limitler ve mesajlar aynı kalır,
 * sadece `store` alanı eklenir.
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
  message: {
    error:
      'Çok fazla başarısız deneme yapıldı. 15 dakika sonra tekrar dene.',
  },
});
