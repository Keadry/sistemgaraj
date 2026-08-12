import crypto from 'crypto';
import { prisma } from '../db.js';
import { RESET_TOKEN_HOURS, VERIFY_TOKEN_HOURS } from './mail.js';

/**
 * Maildeki bağlantıların taşıdığı tek kullanımlık token'lar.
 *
 * Ham token yalnızca bir kez var oluyor: üretildiği anda maile yazılıyor,
 * veritabanına özeti gidiyor. Doğrulama, gelen ham token'ın özetini alıp
 * satırı ona göre arıyor. Bu yüzden "token'ı kaybettim" diye bir kurtarma
 * yolu yok — yenisi üretiliyor.
 */

/** 32 bayt = 256 bit. Tahmin edilebilirlik hesabına girmeye değmeyecek
 *  kadar geniş, URL'de taşımaya uygun kısa. */
const TOKEN_BYTES = 32;

function hash(rawToken: string): string {
  /* SHA-256 yeterli, bcrypt gerekmiyor: bcrypt'in yavaşlığı zayıf, insan
     seçimi şifreler için var. Buradaki değer 256 bit rastgele, yani kaba
     kuvvetle aranacak bir "sözlüğü" yok. */
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generate(): { raw: string; tokenHash: string } {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  return { raw, tokenHash: hash(raw) };
}

function expiryFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Doğrulama token'ı üretir ve **ham** halini döndürür (maile o gidecek).
 *
 * Kişinin bekleyen eski token'ları siliniyor. Aksi halde "tekrar gönder"e
 * birkaç kez basan birinin hepsi aynı anda geçerli kalırdı ve eski bir
 * maildeki bağlantı, yenisi istendikten sonra da çalışırdı.
 */
export async function createEmailVerificationToken(
  userId: string,
): Promise<string> {
  const { raw, tokenHash } = generate();

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt: expiryFromNow(VERIFY_TOKEN_HOURS) },
  });

  return raw;
}

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const { raw, tokenHash } = generate();

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: expiryFromNow(RESET_TOKEN_HOURS) },
  });

  return raw;
}

/**
 * Doğrulama token'ını tüketir: geçerliyse satırı silip kullanıcı id'sini
 * döndürüyor, değilse `null`.
 *
 * Silme ve okuma tek işlemde (`deleteMany` + sayaç) yapılamıyor çünkü hangi
 * kullanıcıya ait olduğunu da bilmemiz gerek. Aradaki yarış zararsız: iki
 * eşzamanlı istekten biri satırı siliyor, diğeri sildiği satır olmadığı için
 * sıfır sayıyor ve reddediliyor.
 */
export async function consumeEmailVerificationToken(
  rawToken: string,
): Promise<string | null> {
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hash(rawToken) },
  });

  if (!row) return null;

  // Süresi geçmiş satır da siliniyor: artık işe yaramıyor, durması yalnızca
  // tabloyu şişirir.
  const deleted = await prisma.emailVerificationToken.deleteMany({
    where: { id: row.id },
  });
  if (deleted.count === 0) return null;

  if (row.expiresAt < new Date()) return null;

  return row.userId;
}

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<string | null> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash(rawToken) },
  });

  if (!row) return null;

  const deleted = await prisma.passwordResetToken.deleteMany({
    where: { id: row.id },
  });
  if (deleted.count === 0) return null;

  if (row.expiresAt < new Date()) return null;

  return row.userId;
}
