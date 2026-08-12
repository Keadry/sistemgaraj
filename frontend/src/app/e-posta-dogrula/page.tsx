'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { verifyEmail } from '@/lib/api';

/**
 * Maildeki doğrulama bağlantısının indiği sayfa.
 *
 * Token URL'de geliyor ve sayfa açılır açılmaz tüketiliyor — kullanıcıya
 * ayrıca "doğrula" butonu göstermek, tıkladığı bağlantının zaten o anlama
 * geldiği yerde fazladan bir adım olurdu.
 */
export default function EmailVerifyPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const { markEmailVerified } = useAuth();

  /* Token'sız durum efektte değil başlangıç değerinde: token URL'den geliyor
     ve sayfanın ömrü boyunca değişmiyor, yani "kod yok" ilk render'da zaten
     bilinen bir şey. Efektten setState çağırmak React 19'un uyardığı
     basamaklı render'ı üretirdi. */
  const [state, setState] = useState<'checking' | 'ok' | 'error'>(
    token ? 'checking' : 'error',
  );
  const [message, setMessage] = useState<string | null>(
    token ? null : 'Bağlantıda doğrulama kodu yok.',
  );

  /* Token tek kullanımlık, yani istek iki kez gitmemeli. React 19'un
     geliştirme modunda efektler iki kez çalışıyor; bu bayrak olmadan ikinci
     çağrı token'ı zaten tüketilmiş bulup hata gösteriyordu. */
  const consumed = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (consumed.current) return;
    consumed.current = true;

    let cancelled = false;

    verifyEmail(token)
      .then((data) => {
        if (cancelled) return;
        setState('ok');
        setMessage(data.message);
        // Oturum açıksa şerit hemen kalkıyor.
        markEmailVerified();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Bir hata oluştu.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="flex justify-center mb-6 transition-transform hover:scale-105 duration-200"
        >
          <Logo />
        </Link>

        <div className="bg-paper/80 backdrop-blur-md border border-hairline/80 rounded-3xl p-8 shadow-xl shadow-trace/5 text-center">
          {state === 'checking' && (
            <>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink mb-2">
                Doğrulanıyor...
              </h1>
              <p className="text-xs text-ink-muted">Bir saniye.</p>
            </>
          )}

          {state === 'ok' && (
            <>
              <p className="text-3xl mb-3" aria-hidden="true">
                ✅
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink mb-2">
                E-postan doğrulandı
              </h1>
              <p className="text-xs text-ink-muted mb-6">{message}</p>
              <Link
                href="/sistem-topla"
                className="inline-block rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-bold px-6 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                Sistem toplamaya başla
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <p className="text-3xl mb-3" aria-hidden="true">
                ⚠️
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink mb-2">
                Doğrulanamadı
              </h1>
              <p className="text-xs text-ink-muted mb-6">{message}</p>
              {/* Yeni mail isteği oturum gerektiriyor, o yüzden giriş
                  sayfasına yönlendiriliyor: giriş yapınca şeritteki "tekrar
                  gönder" düğmesi elinin altında oluyor. */}
              <Link
                href="/giris"
                className="inline-block rounded-xl border border-hairline hover:border-trace text-ink text-sm font-bold px-6 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                Giriş yap ve tekrar gönder
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
