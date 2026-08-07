import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { Redis } from '@upstash/redis';

/**
 * `express-rate-limit` için Upstash Redis destekli sayaç deposu.
 *
 * Varsayılan MemoryStore sayaçları süreç belleğinde tutuyor. Sunucusuz
 * ortamda her fonksiyon örneği kendi belleğiyle açıldığı ve trafik örneklere
 * dağıldığı için sayaçlar bölünür, soğuk başlangıçta sıfırlanır — 10'luk bir
 * sınır fiilen "örnek sayısı × 10" olur. Paylaşımlı bir depo bunu kapatıyor.
 *
 * Upstash'in REST arayüzü bilinçli tercih: kalıcı TCP bağlantısı gerektirmiyor,
 * dolayısıyla her istekte açılıp kapanan sunucusuz fonksiyonlarla uyumlu.
 */
export class UpstashStore implements Store {
  /** Sayaçlar paylaşımlı; kütüphanenin çift sayım uyarısı bunu bilmeli. */
  localKeys = false;

  prefix: string;

  private redis: Redis;
  private windowMs = 60_000;

  constructor(redis: Redis, prefix: string) {
    this.redis = redis;
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private redisKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.redisKey(key);

    try {
      // INCR ve PTTL tek gidiş-dönüşte: sunucusuzda her tur gecikme demek.
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.pttl(redisKey);
      const [totalHits, pttl] = await pipeline.exec<[number, number]>();

      // pttl negatifse anahtarın ömrü tanımlı değil, yani bu pencerenin ilk
      // vuruşu. Süreyi INCR'dan sonra veriyoruz: önce verseydik eşzamanlı
      // isteklerden biri pencereyi baştan başlatabilirdi.
      if (pttl < 0) {
        await this.redis.pexpire(redisKey, this.windowMs);
        return {
          totalHits,
          resetTime: new Date(Date.now() + this.windowMs),
        };
      }

      return { totalHits, resetTime: new Date(Date.now() + pttl) };
    } catch (error) {
      // Depoya ulaşılamıyorsa isteği geçiriyoruz. Bilinçli bir denge: hız
      // sınırı savunmanın tek katmanı değil, ama Redis kesintisinde kapıyı
      // kapatmak siteyi tamamen erişilemez yapardı. Sessiz kalmıyoruz ki
      // kesinti fark edilmeden sürmesin.
      console.error(
        '[rate-limit] Upstash erişilemedi, istek sınırsız geçiriliyor:',
        error instanceof Error ? error.message : error,
      );
      return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  /** `skipSuccessfulRequests` başarılı isteklerin sayacını geri alır. */
  async decrement(key: string): Promise<void> {
    try {
      await this.redis.decr(this.redisKey(key));
    } catch (error) {
      console.error(
        '[rate-limit] Sayaç geri alınamadı:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.redisKey(key));
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const redisKey = this.redisKey(key);
    const pipeline = this.redis.pipeline();
    pipeline.get<number>(redisKey);
    pipeline.pttl(redisKey);
    const [hits, pttl] = await pipeline.exec<[number | null, number]>();

    if (hits === null) return undefined;

    return {
      totalHits: Number(hits),
      resetTime: pttl >= 0 ? new Date(Date.now() + pttl) : undefined,
    };
  }
}

/**
 * Upstash ortam değişkenleri tanımlıysa paylaşımlı depo döner, değilse
 * undefined — o zaman `express-rate-limit` kendi MemoryStore'unu kullanır.
 *
 * Depolama katmanındaki mantığın aynısı: yerel geliştirme hiçbir bulut
 * hesabı gerektirmeden çalışsın.
 */
export function createRateLimitStore(prefix: string): Store | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return undefined;

  return new UpstashStore(new Redis({ url, token }), prefix);
}

export const isSharedRateLimitStore = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
