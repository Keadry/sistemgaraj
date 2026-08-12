'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import { requestPasswordReset } from '@/lib/api';

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAttempt, setErrorAttempt] = useState(0);
  const showLoading = useDelayedLoading(isSubmitting);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = await requestPasswordReset(email);
      setSent(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      setErrorAttempt((n) => n + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

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
          {sent ? (
            /* Sunucu, adres kayıtlı olsun ya da olmasın aynı yanıtı
               veriyor — bu yüzden buradaki metin de "gönderdik" diye kesin
               konuşmuyor. Kesin konuşmak, hangi adreslerin kayıtlı olduğunu
               arayüz üzerinden söylemek olurdu. */
            <div className="text-center">
              <p className="text-3xl mb-3" aria-hidden="true">
                📬
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink mb-2">
                Gelen kutunu kontrol et
              </h1>
              <p className="text-xs text-ink-muted leading-relaxed mb-6">
                {sent}
              </p>
              <Link
                href="/giris"
                className="text-trace text-sm font-bold hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1 mb-8">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">
                  Şifremi Unuttum
                </h1>
                <p className="text-xs text-ink-muted">
                  Hesabının e-posta adresini yaz, sıfırlama bağlantısını
                  gönderelim.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5 font-[family-name:var(--font-mono)]"
                  >
                    E-posta
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@domain.com"
                    required
                    className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm text-ink outline-none focus:border-trace focus:ring-2 focus:ring-trace/15 transition-all bg-surface/30 font-medium placeholder:text-ink-muted/50"
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
                  {showLoading ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-hairline/60 text-center">
                <p className="text-xs text-ink-muted">
                  Şifreni hatırladın mı?{' '}
                  <Link
                    href="/giris"
                    className="text-trace font-bold hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Giriş yap
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
