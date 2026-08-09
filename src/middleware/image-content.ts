import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { UploadTypeError } from '../upload.js';

/**
 * Yüklenen dosyanın gerçekten görsel olduğunu **içeriğine** bakarak doğrular.
 *
 * multer'ın `fileFilter`'ı yalnızca istemcinin bildirdiği `Content-Type`
 * başlığına bakıyor, o başlığı da gönderen taraf yazıyor: bir betiği
 * `image/png` diye etiketleyip geçirmek tek satırlık bir curl işi. Dosyanın
 * ilk baytları ise biçimin kendisinden geliyor, beyandan değil.
 *
 * Kontrol multer'dan **sonra** çalışmak zorunda. `fileFilter` akış henüz
 * okunmadan çağrılıyor; o anda `file.buffer` yok.
 */

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Yalnızca depolamanın uzantıya çevirebildiği üç biçim var (bkz.
 * `storage.ts`). Listeye biçim eklenirse orayı da güncellemek gerekiyor,
 * yoksa dosya `.bin` uzantısıyla kaydedilir.
 */
const SIGNATURES: { mime: string; matches: (bytes: Buffer) => boolean }[] = [
  {
    mime: 'image/jpeg',
    matches: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(PNG_MAGIC),
  },
  {
    // WEBP bir RIFF kabı: ilk dört bayt "RIFF", 4-8 arası uzunluk, 8-12
    // arası biçim etiketi. Sadece "RIFF" aramak WAV ve AVI'yi de geçirirdi.
    mime: 'image/webp',
    matches: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/** Tanınmayan içerik için `null`. */
export function sniffImageMime(bytes: Buffer): string | null {
  return SIGNATURES.find((signature) => signature.matches(bytes))?.mime ?? null;
}

/** İstekteki dosyaları tek bir listede toplar; multer bunları çağrılan
 *  yardımcıya göre üç ayrı yere koyuyor (`single`, `array`, `fields`). */
function collectFiles(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files) return Object.values(req.files).flat();
  return [];
}

/**
 * `upload.single`/`upload.array`'den **sonra** bağlanır.
 *
 * Tanınmayan içerikte isteği reddeder. Tanınan ama beyanla uyuşmayan
 * içerikte ise reddetmiyor, `file.mimetype`'ı gerçek biçimle değiştiriyor:
 * depolama katmanı uzantıyı ve `contentType`'ı bu alandan türetiyor, yani
 * düzeltilmezse gerçek bir JPEG sunucuda `.png` adıyla ve yanlış başlıkla
 * durur. Tarayıcıların yanlış etiketlemesi nadir de olsa oluyor; bunu hata
 * saymak kullanıcıyı bir şey yapamadığı bir duvara çarptırırdı.
 */
export function verifyImageContents(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  for (const file of collectFiles(req)) {
    // Bellek deposu kullanılmıyorsa buffer boş gelir. Sessizce geçmek
    // doğrulamayı fiilen kapatmak olurdu.
    if (!file.buffer) {
      res.status(400).json({ error: 'Görsel okunamadı, tekrar dener misin?' });
      return;
    }

    const actualMime = sniffImageMime(file.buffer);
    if (!actualMime) {
      res.status(400).json({
        error:
          'Dosya geçerli bir JPEG, PNG veya WEBP görseli değil. Uzantısını değiştirmek yetmiyor.',
      });
      return;
    }

    file.mimetype = actualMime;
  }

  next();
}

/**
 * multer'ın reddettiği yüklemeleri JSON hataya çevirir.
 *
 * Bu olmadan multer'ın hataları Express'in kendi işleyicisine düşüyor ve
 * HTML gövdeli 500 dönüyordu. Frontend her yanıtta `res.json()` çağırdığı
 * için kullanıcı gerçek sebebi ("görsel 5 MB'ı geçiyor") değil, bir ayrıştırma
 * hatası görüyordu — telefon fotoğrafları o sınırı sık sık aşıyor.
 */
export function uploadErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof UploadTypeError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Her görsel en fazla 5 MB olabilir.' });
      return;
    }

    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({ error: 'En fazla 5 görsel yükleyebilirsin.' });
      return;
    }

    res.status(400).json({ error: 'Görsel yüklenemedi.' });
    return;
  }

  next(err);
}
