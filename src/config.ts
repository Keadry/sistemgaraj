import 'dotenv/config';

/**
 * Birden fazla modülün paylaştığı ortam okumaları.
 *
 * Buraya taşınmalarının sebebi döngüsel içe alma: `app.ts` rotaları içe
 * alıyor, rotalar mail katmanını, mail katmanı da bağlantı üretmek için
 * arayüzün adresine ihtiyaç duyuyor. O adres `app.ts`'te kalsaydı zincir
 * kendine dönerdi.
 */

// Virgülle ayrılmış izinli origin listesi. Tanımsızsa yerel geliştirmeye
// düşüyor; üretimde CORS_ORIGINS ayarlanmazsa tarayıcı istekleri reddedilir,
// bu bilinçli — sessizce herkese açık kalmasındansa gürültülü şekilde kapalı
// olsun.
export const allowedOrigins = (
  process.env.CORS_ORIGINS ?? 'http://localhost:3000'
)
  .split(',')
  // Tarayıcı `Origin` başlığını şema + host olarak, sonunda eğik çizgi
  // olmadan gönderiyor. Ortam değişkenine adres yapıştırılırken sonuna
  // çizgi gelmesi çok yaygın; karşılaştırma tam eşleşme olduğu için bu
  // sessizce her isteği reddettiriyordu. Normalleştirip o tuzağı kapatıyoruz.
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

/**
 * Maillerdeki bağlantıların işaret ettiği adres — API'nin değil **arayüzün**
 * adresi, çünkü kullanıcı bağlantıya tarayıcıda tıklıyor.
 *
 * `APP_URL` yoksa izinli origin listesinin ilkine düşüyor: ikisi neredeyse
 * her zaman aynı adres, ve ayrı bir değişken daha istemek üretimde yanlış
 * ayarlanacak bir yer daha demek.
 */
export const appUrl = (
  process.env.APP_URL?.trim() ||
  allowedOrigins[0] ||
  'http://localhost:3000'
).replace(/\/+$/, '');
