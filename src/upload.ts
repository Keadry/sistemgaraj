import multer from 'multer';

/**
 * Dosyalar diske değil belleğe alınıyor; nereye yazılacağına `src/storage.ts`
 * karar veriyor. Bu ayrım, sunucusuz ortamlarda dosya sisteminin salt-okunur
 * olmasından geliyor — multer'ın diskStorage'ı orada çalışmıyor.
 *
 * Bellekte tutmanın bedeli: eşzamanlı yüklemeler RAM'de birikiyor. Sınırlar
 * bunu tutuyor — dosya başına 5 MB, istek başına en fazla 5 dosya.
 */
const storage = multer.memoryStorage();

function fileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece JPEG, PNG veya WEBP yükleyebilirsin.'));
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter,
});
