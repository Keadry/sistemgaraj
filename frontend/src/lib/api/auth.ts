import { API_URL } from './client';

/**
 * Oturum açmayı gerektirmeyen kimlik akışları: e-posta doğrulama ve şifre
 * sıfırlama.
 *
 * Giriş ve kayıt `auth-context` içinde duruyor çünkü onlar oturumu da
 * kuruyor; buradakiler yalnızca sunucuya bir şey söylüyor.
 */

async function post(
  path: string,
  body: unknown,
  token?: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'İşlem başarısız.');
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return post('verify-email', { token });
}

/** Oturum gerektiriyor: yalnızca kişinin kendi adresine gönderiliyor, yani
 *  kime gideceği istekte taşınmıyor. */
export async function resendVerificationEmail(
  authToken: string,
): Promise<{ message: string }> {
  return post('resend-verification', {}, authToken);
}

/** Adres kayıtlı olmasa da aynı yanıt dönüyor (bkz. `routes/auth.ts`), yani
 *  başarı mesajı "mail gitti" demiyor, "gitmiş olabilir" diyor. */
export async function requestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  return post('forgot-password', { email });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  return post('reset-password', { token, password });
}
