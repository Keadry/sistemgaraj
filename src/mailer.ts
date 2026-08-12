import nodemailer from 'nodemailer';

/**
 * Mail gönderen katman.
 *
 * `storage.ts` ile aynı deseni izliyor: sağlayıcı ortam değişkenlerinden
 * seçiliyor, tanımlı değilse yerel bir karşılığa düşüyor. Buradaki karşılık
 * **konsol** — mail gönderilmiyor, içindeki bağlantı sunucu günlüğüne
 * yazılıyor.
 *
 * Bu geri düşüş bir kolaylık değil, geliştirmenin ön koşulu: doğrulama ve
 * şifre sıfırlama akışlarının ikisi de tıklanacak bir bağlantı üretiyor.
 * Konsola yazılmasa, bir SMTP hesabı açmadan bu akışları hiç deneyemezdik.
 *
 * SMTP üzerinden gidiliyor, sağlayıcının kendi SDK'sı üzerinden değil:
 * Resend, Gmail ve SendGrid'in üçü de SMTP konuşuyor, yani sağlayıcı
 * değiştirmek kod değil ortam değişkeni işi.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/** Gönderen adresi. Resend'de alan adı doğrulanana kadar
 *  `onboarding@resend.dev` kullanılabiliyor. */
const MAIL_FROM = process.env.MAIL_FROM ?? 'SistemGaraj <onboarding@resend.dev>';

export const isMailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isMailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 465 örtük TLS; 587 düz başlayıp STARTTLS ile yükseliyor. Porta göre
      // karar vermek, iki sağlayıcı arasında geçerken tek değişkenle
      // yetinmeyi sağlıyor.
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

type Mail = {
  to: string;
  subject: string;
  html: string;
  /** Düz metin karşılığı. HTML'i kapatan istemciler ve spam filtreleri için
   *  şart — yalnızca HTML gönderen mailler daha sık spam'e düşüyor. */
  text: string;
};

/**
 * Maili gönderir. Hata **fırlatmıyor**: mail bir yan etki, gönderilememesi
 * onu tetikleyen işlemi (kayıt olma, şifre sıfırlama isteği) bozmamalı.
 * Kayıt olurken SMTP sağlayıcısı yavaşladığı için 500 almak, kullanıcının
 * hesabı açılmışken açılmamış gibi görünmesi demek.
 *
 * Dönen değer gönderilip gönderilmediğini söylüyor; çağıran taraf isterse
 * kullanıcıya farklı bir mesaj gösterebilir.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!transporter) {
    // Geliştirme karşılığı. Bağlantıyı ayıklanabilir biçimde yazıyoruz;
    // gövdenin tamamını dökmek günlüğü okunmaz hale getiriyor.
    console.log(
      [
        '',
        '📧 [mail] SMTP ayarlı değil, gönderilmedi. İçerik:',
        `   Kime : ${mail.to}`,
        `   Konu : ${mail.subject}`,
        `   Metin: ${mail.text.replace(/\n+/g, ' ')}`,
        '',
      ].join('\n'),
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return true;
  } catch (error) {
    console.error('[mail] gönderilemedi:', error);
    return false;
  }
}
