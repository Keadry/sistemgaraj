'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import Logo from '@/components/Logo';

export default function GirisPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Her başarısız denemede artar. Hata kutusuna key olarak verilir; aynı hata
  // mesajı tekrarlansa bile kutu yeniden mount olup sallanma animasyonunu
  // baştan oynatır.
  const [errorAttempt, setErrorAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Hızlı isteklerde "Giriş yapılıyor..." yazısının bir göz kırpması kadar
  // görünüp kaybolmaması için gecikmeli gösterge.
  const showLoading = useDelayedLoading(isSubmitting);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Hatayı burada temizlemiyoruz — istek sürerken kutu ekranda kalsın,
    // yoksa her denemede kaybolup geri geliyormuş gibi titriyor.
    setIsSubmitting(true);

    try {
      await login(identifier, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      setErrorAttempt((n) => n + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {/* LOGO */}
        <Link
          href="/"
          className="flex justify-center mb-6 transition-transform hover:scale-105 duration-200"
        >
          <Logo />
        </Link>

        {/* AUTH CARD */}
        <div className="bg-paper/80 backdrop-blur-md border border-hairline/80 rounded-3xl p-8 shadow-xl shadow-trace/5">
          <div className="text-center space-y-1 mb-8">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">
              Tekrar Hoş Geldin
            </h1>
            <p className="text-xs text-ink-muted">
              SistemGaraj hesabına giriş yaparak devam et.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5 font-[family-name:var(--font-mono)]"
              >
                E-posta veya Kullanıcı Adı
              </label>
              <input
                id="identifier"
                // `type="email"` değil: alan artık kullanıcı adı da kabul
                // ediyor, o tür kullanıcı adını geçersiz sayıp formu bloklar.
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ornek@domain.com veya kullanici_adi"
                required
                className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm text-ink outline-none focus:border-trace focus:ring-2 focus:ring-trace/15 transition-all bg-surface/30 font-medium placeholder:text-ink-muted/50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-[family-name:var(--font-mono)]"
                >
                  Şifre
                </label>
                {/* Etiketin yanında: şifreyi hatırlamadığı anlaşıldığı yer
                    tam burası, formun altı değil. */}
                <Link
                  href="/sifremi-unuttum"
                  className="text-xs font-semibold text-trace hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                >
                  Şifremi unuttum
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {showLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-hairline/60 text-center">
            <p className="text-xs text-ink-muted">
              Hesabın yok mu?{' '}
              <Link
                href="/kayit"
                className="text-trace font-bold hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                Hesap oluştur
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
