/**
 * Vercel sunucusuz giriş noktası.
 *
 * Vercel `api/` altındaki dosyaları fonksiyon olarak çalıştırıyor. Bir Express
 * uygulaması zaten `(req, res)` imzasına sahip olduğu için doğrudan handler
 * olarak dışa verilebiliyor; ayrı bir adaptör gerekmiyor.
 *
 * Bütün yolların bu tek fonksiyona düşmesini `vercel.json` sağlıyor —
 * yönlendirmeyi Vercel'in dosya tabanlı router'ı değil, Express kendi
 * yapıyor.
 */
export { default } from '../src/app.js';
