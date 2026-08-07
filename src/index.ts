import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth.js';
import buildRoutes from './routes/builds/index.js';
import cors from 'cors';
import componentRoutes from './routes/components.js';
import adminRoutes from './routes/admin.js';
import path from 'path';
import userRoutes from './routes/users.js';
import { apiLimiter } from './middleware/rate-limit.js';

const app = express();
const PORT = process.env.PORT || 3000;

// JWT_SECRET olmadan token imzalanamaz; eksikse jsonwebtoken çalışma anında
// patlar ve bu her istekte 500 olarak görünür. Açılışta durmak, sebebi
// belirsiz hatalarla üretimde debug etmekten iyi.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET tanımlı değil. .env dosyanı kontrol et.');
}

// Vercel/Railway gibi ortamlarda istek bir proxy'den geçiyor. Bu ayar olmadan
// req.ip herkes için proxy'nin adresini döndürür ve IP başına çalışan hız
// sınırı tek bir kovaya dönüşür — yani fiilen çalışmaz.
app.set('trust proxy', 1);

// Virgülle ayrılmış izinli origin listesi. Tanımsızsa yerel geliştirmeye
// düşüyor; üretimde CORS_ORIGINS ayarlanmazsa tarayıcı istekleri reddedilir,
// bu bilinçli — sessizce herkese açık kalmasındansa gürültülü şekilde kapalı
// olsun.
const allowedOrigins = (
  process.env.CORS_ORIGINS ?? 'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** cors paketi reddi hata fırlatarak bildiriyor. Kendi sınıfımızı
 *  kullanmazsak bu, aşağıdaki hata yakalayıcıda gerçek bir çökmeden
 *  ayırt edilemez ve 500 olarak döner. */
class CorsError extends Error {
  constructor(origin: string) {
    super(`CORS: ${origin} izinli değil.`);
    this.name = 'CorsError';
  }
}

app.use(
  cors({
    origin(origin, callback) {
      // origin yoksa istek tarayıcıdan gelmiyor (curl, sunucudan sunucuya,
      // sağlık kontrolü). CORS bu istekleri zaten korumuyor, engellemek de
      // bir şey kazandırmaz.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new CorsError(origin));
    },
  }),
);

app.use(express.json());
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'SistemGaraj API çalışıyor 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// CORS reddi bir yetki kararı, sunucu arızası değil — 500 dönerse izlemede
// gerçek hatalarla karışır. Diğer hatalar Express'in kendi işleyicisine
// gitsin diye next() ile devrediliyor.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof CorsError) {
      res.status(403).json({ error: err.message });
      return;
    }
    next(err);
  },
);

app.listen(PORT, () => {
  console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`   İzinli origin'ler: ${allowedOrigins.join(', ')}`);
});
