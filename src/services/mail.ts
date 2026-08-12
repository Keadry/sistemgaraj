import { appUrl } from '../config.js';
import { sendMail } from '../mailer.js';

/**
 * Uygulamanın gönderdiği mailler.
 *
 * Şablonlar burada, taşıyıcıdan ayrı: `mailer.ts` "nasıl gönderilir"i,
 * burası "ne yazılır"ı biliyor.
 *
 * HTML bilerek sade ve gömülü stilli. Mail istemcileri harici stil
 * dosyalarını, `<style>` bloklarının çoğunu ve modern CSS'i yok sayıyor;
 * arayüzün token'larını buraya taşımaya çalışmak çalışmayan bir tasarım
 * üretirdi.
 */

const BRAND = '#7c3aed';

function layout(heading: string, body: string, button: { href: string; label: string }): string {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${BRAND};">SistemGaraj</p>
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#18181b;">${heading}</h1>
        <div style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${body}</div>
        <a href="${button.href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px;">${button.label}</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">Buton çalışmazsa bu adresi tarayıcına kopyalayabilirsin:<br />
          <span style="color:${BRAND};word-break:break-all;">${button.href}</span>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Doğrulama bağlantısının geçerlilik süresi, saat. Metinde de bu değer
 *  yazılıyor ki mail ile davranış ayrışmasın. */
export const VERIFY_TOKEN_HOURS = 24;

/** Sıfırlama bağlantısı daha kısa ömürlü: eline geçen biri doğrudan hesabı
 *  ele geçirebiliyor, doğrulama bağlantısı ise yalnızca bir adresi onaylıyor. */
export const RESET_TOKEN_HOURS = 1;

export async function sendVerificationEmail(
  to: string,
  username: string,
  token: string,
): Promise<boolean> {
  const href = `${appUrl}/e-posta-dogrula?token=${token}`;

  return sendMail({
    to,
    subject: 'SistemGaraj — e-posta adresini doğrula',
    text: `Merhaba ${username}, SistemGaraj hesabını doğrulamak için şu adrese git: ${href} (bağlantı ${VERIFY_TOKEN_HOURS} saat geçerli)`,
    html: layout(
      `Merhaba ${username}, hoş geldin`,
      `Hesabını kullanmaya başlamak için e-posta adresini doğrulaman gerekiyor.
       Bağlantı <strong>${VERIFY_TOKEN_HOURS} saat</strong> geçerli.`,
      { href, label: 'E-postamı doğrula' },
    ),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  username: string,
  token: string,
): Promise<boolean> {
  const href = `${appUrl}/sifre-sifirla?token=${token}`;

  return sendMail({
    to,
    subject: 'SistemGaraj — şifre sıfırlama',
    text: `Merhaba ${username}, şifreni sıfırlamak için şu adrese git: ${href} (bağlantı ${RESET_TOKEN_HOURS} saat geçerli). Bu isteği sen yapmadıysan bu maili yok sayabilirsin.`,
    html: layout(
      'Şifreni sıfırla',
      `Merhaba ${username}, hesabın için şifre sıfırlama istendi.
       Bağlantı <strong>${RESET_TOKEN_HOURS} saat</strong> geçerli ve yalnızca bir kez kullanılabiliyor.
       <br /><br />Bu isteği sen yapmadıysan bu maili yok sayman yeterli — şifren değişmedi.`,
      { href, label: 'Yeni şifre belirle' },
    ),
  });
}
