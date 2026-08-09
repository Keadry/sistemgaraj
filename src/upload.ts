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

/** Reddi kendi sınıfıyla bildiriyoruz; düz `Error` hata işleyicide gerçek bir
 *  çökmeden ayırt edilemez ve 500 olarak döner. */
export class UploadTypeError extends Error {
  constructor() {
    super('Sadece JPEG, PNG veya WEBP yükleyebilirsin.');
    this.name = 'UploadTypeError';
  }
}

/**
 * İlk kapı: istemcinin bildirdiği tür. Beyana güvenilmez, bu yüzden asıl
 * doğrulama içeriğe bakan `verifyImageContents` katmanında yapılıyor — ama
 * burada durdurmak, kabul edilmeyecek bir dosyanın 5 MB'a kadar belleğe
 * alınmasını baştan engelliyor.
 */
function fileFilter(
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new UploadTypeError());
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter,
});
