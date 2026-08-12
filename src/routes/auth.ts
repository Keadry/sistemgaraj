import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/mail.js';
import { isMailConfigured } from '../mailer.js';
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
} from '../services/tokens.js';

const router = Router();

/** Şifre kuralı üç yerde geçiyor (kayıt, sıfırlama, şifre değiştirme);
 *  tek yerde tanımlı olması üçünün ayrışmasını engelliyor. */
const MIN_PASSWORD_LENGTH = 6;

function isPasswordTooShort(password: unknown): boolean {
  return typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH;
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      res
        .status(400)
        .json({ error: 'E-posta, şifre ve kullanıcı adı zorunludur.' });
      return;
    }

    const trimmedUsername = String(username).trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      res.status(400).json({
        error:
          'Kullanıcı adı 3-20 karakter olmalı, sadece harf, rakam ve alt çizgi içerebilir.',
      });
      return;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
      return;
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: trimmedUsername, mode: 'insensitive' } },
    });
    if (existingUsername) {
      res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
      return;
    }

    if (isPasswordTooShort(password)) {
      res.status(400).json({
        error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: trimmedUsername,
      },
    });

    /* Mail gönderimi kaydın başarısını etkilemiyor (bkz. `mailer.ts`).
       Sağlayıcı yavaşladığı için 500 dönmek, hesabı açılmış kullanıcıya
       açılmamış gibi göstermek olurdu; doğrulama maili "tekrar gönder" ile
       her zaman yeniden istenebiliyor. */
    const token = await createEmailVerificationToken(user.id);
    const mailSent = await sendVerificationEmail(
      user.email,
      user.username,
      token,
    );

    res.status(201).json({
      /* Mesaj gerçekten olana göre: gönderilemediyse "gönderdik" demek
         kullanıcıyı hiç gelmeyecek bir maili beklerken bırakırdı. */
      message: mailSent
        ? 'Kayıt başarılı. E-posta adresine doğrulama bağlantısı gönderdik.'
        : 'Kayıt başarılı.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    // `email` hâlâ okunuyor: kayıt sonrası otomatik giriş ve açık sekmede
    // duran eski istemciler o adla gönderiyor.
    const { identifier, email, password } = req.body;
    const trimmedIdentifier = String(identifier ?? email ?? '').trim();

    if (!trimmedIdentifier || !password) {
      res
        .status(400)
        .json({ error: 'E-posta veya kullanıcı adı ile şifre zorunludur.' });
      return;
    }

    // Kullanıcı adları `[a-zA-Z0-9_]` ile sınırlı (bkz. kayıt), yani "@"
    // içeren bir girdi kesin e-postadır — ayrım için tahmine gerek yok.
    const user = trimmedIdentifier.includes('@')
      ? await prisma.user.findUnique({ where: { email: trimmedIdentifier } })
      : await prisma.user.findFirst({
          // Kayıtta çakışma kontrolü büyük/küçük harfe duyarsız yapılıyor;
          // giriş duyarlı kalırsa "Ahmet" diye kaydolan "ahmet" yazarak
          // hesabına giremez.
          where: {
            username: { equals: trimmedIdentifier, mode: 'insensitive' },
          },
        });

    // İki durumda da aynı mesaj: ayrı mesajlar hangi hesapların var olduğunu
    // sayıp çıkarmayı mümkün kılar.
    if (!user) {
      res
        .status(401)
        .json({ error: 'E-posta/kullanıcı adı veya şifre hatalı.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res
        .status(401)
        .json({ error: 'E-posta/kullanıcı adı veya şifre hatalı.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        /* Arayüz doğrulama şeridini buna bakarak gösteriyor.
           Mail gönderilemiyorken doğrulama zaten istenmiyor
           (bkz. `middleware/verified-email.ts`), o yüzden burada da
           doğrulanmış sayılıyor: kapatılması mümkün olmayan bir uyarı
           şeridi göstermenin kullanıcıya söyleyeceği bir şey yok. */
        emailVerified: isMailConfigured ? user.emailVerified : true,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// E-POSTA DOĞRULA
// ==============================
router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Doğrulama bağlantısı geçersiz.' });
      return;
    }

    const userId = await consumeEmailVerificationToken(token);
    if (!userId) {
      res.status(400).json({
        error:
          'Bağlantı geçersiz veya süresi dolmuş. Ayarlardan yeni bir doğrulama maili isteyebilirsin.',
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    res.json({
      message: 'E-posta adresin doğrulandı.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// DOĞRULAMA MAİLİNİ TEKRAR GÖNDER
// ==============================
router.post(
  '/resend-verification',
  authLimiter,
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
      });

      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        return;
      }

      /* Doğrulanmış hesap için token üretmiyoruz. Üretmek, elindeki
         bağlantıyla kimsenin bir şey yapamayacağı ama tablonun boşuna
         şiştiği bir uç nokta olurdu. */
      if (user.emailVerified) {
        res.json({ message: 'E-posta adresin zaten doğrulanmış.' });
        return;
      }

      const token = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(user.email, user.username, token);

      res.json({ message: 'Doğrulama maili tekrar gönderildi.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  },
);

// ==============================
// ŞİFREMİ UNUTTUM
// ==============================
router.post('/forgot-password', authLimiter, async (req, res) => {
  /* Yanıt, adres kayıtlı olsa da olmasa da aynı. Farklı yanıt vermek, bu uç
     noktayı "bu e-posta bu sitede kayıtlı mı" diye sorgulanabilir bir listeye
     çevirirdi — kimlik doğrulaması gerektirmeyen bir uç noktada bu, üye
     listesini dışarı vermek demek. */
  const genericResponse = {
    message:
      'Adres kayıtlıysa şifre sıfırlama bağlantısını gönderdik. Gelen kutunu kontrol et.',
  };

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'E-posta adresi zorunludur.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.json(genericResponse);
      return;
    }

    /* Askıya alınmış hesaba sıfırlama bağlantısı gönderilmiyor; şifresini
       değiştirmek yasağı kaldırmadığı için bu yalnızca yanlış bir umut
       verirdi. Yanıt yine aynı kalıyor. */
    if (user.isBanned) {
      res.json(genericResponse);
      return;
    }

    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, user.username, token);

    res.json(genericResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ==============================
// ŞİFREYİ SIFIRLA
// ==============================
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Sıfırlama bağlantısı geçersiz.' });
      return;
    }

    if (isPasswordTooShort(password)) {
      res.status(400).json({
        error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`,
      });
      return;
    }

    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      res.status(400).json({
        error:
          'Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyebilirsin.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    /* Adres bu noktada fiilen doğrulanmış oluyor: sıfırlama bağlantısına
       ulaşabilmek posta kutusuna erişebildiğini kanıtlıyor. Doğrulanmamış bir
       hesabın sahibinin şifresini sıfırlayıp yine "adresini doğrula"
       duvarına çarpması anlamsız olurdu.

       `updateMany`, `update` değil: zaten doğrulanmış bir hesapta koşul
       eşleşmiyor ve `update` bunu istisna fırlatarak bildiriyor. Ayrıca
       damgayı ezmiyor — aylar önce doğrulanmış birine "şimdi doğrulandı"
       yazmak, alanı yanlış bir iz haline getirirdi. */
    await prisma.user.updateMany({
      where: { id: userId, emailVerified: false },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    res.json({
      message: 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

export default router;
