'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import { resetPassword } from '@/lib/api';

/** Sunucudaki kuralla aynı (bkz. `routes/auth.ts`). Ayrışsalardı kullanıcı
 *  sınırı ancak gönderdikten sonra hata mesajıyla öğrenirdi. */
const MIN_PASSWORD_LENGTH = 6;

export default function SifreSifirlaPage() {
  const router = useRouter();
  const token = useSearchParams().get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAttempt, setErrorAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const showLoading = useDelayedLoading(isSubmitting);

  function fail(message: string) {
    setError(message);
    setErrorAttempt((n) => n + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      fail('Bağlantıda sıfırlama kodu yok.');
      return;
    }

    /* İki alanın eşitliği burada kontrol ediliyor, sunucuda değil: sunucu
       yalnızca bir şifre alıyor ve onaylama alanı bir arayüz önlemi —
       yanlış yazılmış bir şifreyi kaydettikten sonra fark etmemek için. */
    if (password !== confirm) {
      fail('Şifreler birbiriyle uyuşmuyor.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      fail(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      // Yeni şifreyle girmesi gerekiyor; token tüketildi, oturum açılmadı.
      setTimeout(() => router.push('/giris'), 2000);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-hairline px-4 py-2.5 text-sm text-ink outline-none focus:border-trace focus:ring-2 focus:ring-trace/15 transition-all bg-surface/30 font-medium placeholder:text-ink-muted/50';
  const labelClass =
    'block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5 font-[family-name:var(--font-mono)]';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="flex justify-center mb-6 transition-transform hover:scale-105 duration-200"
        >
          <Logo />
        </Link>

        <div className="bg-paper/80 backdrop-blur-md border border-hairline/80 rounded-3xl p-8 shadow-xl shadow-trace/5">
          {done ? (
            <div className="text-center">
              <p className="text-3xl mb-3" aria-hidden="true">
                ✅
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink mb-2">
                Şifren güncellendi
              </h1>
              <p className="text-xs text-ink-muted">
                Giriş sayfasına yönlendiriliyorsun...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1 mb-8">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">
                  Yeni Şifre Belirle
                </h1>
                <p className="text-xs text-ink-muted">
                  En az {MIN_PASSWORD_LENGTH} karakter olsun.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className={labelClass}>
                    Yeni şifre
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className={labelClass}>
                    Yeni şifre (tekrar)
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div
                    key={errorAttempt}
                    role="alert"
                    className="p-3.5 rounded-xl bg-incompatible/10 border border-incompatible/20 text-incompatible text-xs font-semibold animate-shake"
                  >
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full mt-2 rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-bold px-6 py-3 transition-all shadow-md shadow-trace/25 cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                    showLoading ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {showLoading ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-hairline/60 text-center">
                <p className="text-xs text-ink-muted">
                  Bağlantının süresi mi doldu?{' '}
                  <Link
                    href="/sifremi-unuttum"
                    className="text-trace font-bold hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Yenisini iste
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
