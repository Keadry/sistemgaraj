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
 *
 * `outputDirectory: "public"` ise bir formalite: Vercel build komutundan sonra
 * statik çıktı klasörü arıyor, bulamazsa deploy'u başarısız sayıyor. Bu proje
 * statik dosya üretmediği için klasör boş duruyor — build komutunu
 * kaldıramayız, `prisma generate` orada çalışıyor.
 *
 * DİKKAT: kökteki `vercel.json` yalnızca bu API projesine ait olsa da aynı
 * depoyu kullanan frontend projesi de onu görüyor. Bu yüzden `frontend/`
 * altında ayrı bir `vercel.json` var — olmasaydı `outputDirectory: "public"`
 * oraya da uygulanır ve Next.js'in `.next` çıktısı bulunamazdı.
 */
export { default } from '../src/app.js';
