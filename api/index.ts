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
 *
 * `vercel.json`'daki `regions: ["fra1"]` de buraya ait bir karar: Prisma bir
 * isteği ilişki başına birer sorguya bölüyor ve fonksiyon–veritabanı gecikmesi
 * her turda yeniden ödeniyor. İkisi ayrı bölgedeyken bu çarpan birkaç sorguyu
 * saniyelere çıkarıyor (Mumbai'ye 285ms turla ölçüldüğünde feed 5 saniye
 * sürüyordu). Veritabanı bölgesi değişirse burası da değişmeli.
 * JSON yorum satırı desteklemediği için not burada duruyor.
 */
export { default } from '../src/app.js';
