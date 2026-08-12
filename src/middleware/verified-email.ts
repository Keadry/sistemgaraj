import type { NextFunction, Response } from 'express';
import { prisma } from '../db.js';
import { isMailConfigured } from '../mailer.js';
import type { AuthRequest } from './auth.js';

/**
 * Dışa dönük yazma işlemlerini doğrulanmış e-posta arkasına alır.
 * `requireAuth`'tan **sonra** bağlanıyor; `req.userId`'ye ihtiyacı var.
 *
 * Çizgi şurada: bir işlem **başka kullanıcılara ulaşan içerik** üretiyorsa
 * doğrulama isteniyor. Kendi hesabını yönetmek istenmiyor.
 *
 *   Kapalı — sistem paylaşma, yorum, yanıt, beğeni, düzenleme isteği,
 *   profil duvarına yazma. Bunların hepsi başkasının ekranına düşüyor ve
 *   doğrulanmamış hesabın ucuz olması tam olarak bu yüzden sorun.
 *
 *   Açık — profil alanları, avatar, kapak, tercihler, gizlilik, şifre,
 *   e-posta ve kullanıcı adı değiştirme, hesap silme, işaretleme
 *   (yalnızca kendine görünür), engelleme (korunma aracı, kısıtlanamaz) ve
 *   kendi içeriğini silme. Doğrulama beklerken hesabını kuramamak,
 *   engelleyememek veya yazdığını geri alamamak kullanıcıyı cezalandırırdı.
 *
 * Ayrı bir HTTP kodu kullanılıyor: 403 "yetkin yok" demek ve arayüzde ban ile
 * karışıyor. 428 (Precondition Required) "önce şunu yap" diyor; istemci bu
 * kodu görünce doğrulama şeridini öne çıkarabiliyor.
 */
export async function requireVerifiedEmail(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  /* Mail gönderilemiyorsa kapı açık kalıyor.

     Kapının tek varsayımı kullanıcının doğrulamayı **tamamlayabilmesi**.
     SMTP tanımsızken bağlantı yalnızca sunucu günlüğüne yazılıyor (bkz.
     `mailer.ts`), yani kullanıcının eline hiç geçmiyor: kapıyı kapalı
     tutmak, kaydolan herkesi hiçbir zaman geçemeyeceği bir duvarın
     arkasında bırakmak olurdu. Özelliğin hiç olmadığı hale dönmek, kimseyi
     kilitlemekten iyi.

     Sağlayıcı ayarlandığı an kapı kendiliğinden kapanıyor; ayrıca bir
     bayrak yok ki biri açık kalmayı unutsun. */
  if (!isMailConfigured) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { emailVerified: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
      return;
    }

    if (!user.emailVerified) {
      res.status(428).json({
        error:
          'Bu işlem için e-posta adresini doğrulaman gerekiyor. Gelen kutunu kontrol et.',
        emailVerificationRequired: true,
      });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}
