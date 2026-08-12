import app, { allowedOrigins } from './app.js';
import { isRemoteStorage } from './storage.js';
import { isSharedRateLimitStore } from './middleware/rate-limit-store.js';
import { isMailConfigured } from './mailer.js';

/**
 * Yerel geliştirme girişi. Sunucusuz dağıtımda bu dosya hiç çalıştırılmaz;
 * orada uygulamayı `api/index.ts` her istekte doğrudan çağırıyor.
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`   İzinli origin'ler: ${allowedOrigins.join(', ')}`);
  console.log(
    `   Görsel depolama: ${isRemoteStorage ? 'Supabase Storage' : 'yerel uploads/ klasörü'}`,
  );
  console.log(
    `   Hız sınırı deposu: ${isSharedRateLimitStore ? 'Upstash Redis (paylaşımlı)' : 'bellek (tek süreç)'}`,
  );
  console.log(
    `   Mail: ${
      isMailConfigured
        ? 'SMTP'
        : 'yapılandırılmadı — bağlantılar bu günlüğe yazılıyor, e-posta doğrulama zorunlu DEĞİL'
    }`,
  );
});
