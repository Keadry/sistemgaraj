'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { resendVerificationEmail } from '@/lib/api';

/**
 * Doğrulanmamış hesaplara gösterilen şerit.
 *
 * Gerekli çünkü kısıtlama sessiz: doğrulanmamış biri girebiliyor ve
 * gezebiliyor, ama yorum yazmaya çalıştığında bir hata alıyor. Şerit
 * olmasaydı o hata sebepsiz görünürdü — kısıtlamayı, ortaya çıktığı andan
 * önce söylemek gerekiyor.
 *
 * `emailVerified === false` şartı bilerek katı. Alan eklenmeden önce
 * kaydedilmiş oturumlarda değer `undefined` ve o durum "doğrulanmamış"
 * demiyor, "bilinmiyor" diyor; doğrulanmış kullanıcılara yanlışlıkla uyarı
 * göstermek, uyarıyı hiç göstermemekten kötü.
 */
export default function EmailVerifyBanner() {
  const { user, token, isLoading } = useAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !user || !token || user.emailVerified !== false) return null;

  async function handleResend() {
    if (!token) return;
    setState('sending');
    setError(null);
    try {
      await resendVerificationEmail(token);
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gönderilemedi.');
      setState('idle');
    }
  }

  return (
    <div
      role="status"
      className="border-b border-hairline bg-trace/5 px-4 py-2.5 text-center"
    >
      <p className="text-xs md:text-sm text-ink">
        <span aria-hidden="true">✉️ </span>
        <strong className="font-semibold">{user.email}</strong> adresini
        doğrulamadın. Sistem paylaşmak, yorum yapmak ve beğenmek için
        doğrulaman gerekiyor.{' '}
        {state === 'sent' ? (
          <span className="font-semibold text-trace">
            Mail tekrar gönderildi.
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={state === 'sending'}
            className="font-semibold text-trace hover:underline disabled:opacity-60 cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            {state === 'sending' ? 'Gönderiliyor...' : 'Tekrar gönder'}
          </button>
        )}
        {error && <span className="text-incompatible"> — {error}</span>}
      </p>
    </div>
  );
}
