'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Logo from '@/components/Logo';

export default function GirisPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
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
        <div className="bg-paper/80 backdrop-blur-md border border-hairline/80 rounded-3xl p-8 shadow-xl shadow-[#4e49f6]/5">
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
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5 font-[family-name:var(--font-mono)]"
              >
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@domain.com"
                required
                className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-[#4e49f6] focus:ring-2 focus:ring-[#4e49f6]/15 transition-all bg-surface/30 font-medium placeholder:text-ink-muted/50"
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
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-[#4e49f6] focus:ring-2 focus:ring-[#4e49f6]/15 transition-all bg-surface/30 font-medium placeholder:text-ink-muted/50"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-incompatible/10 border border-incompatible/20 text-incompatible text-xs font-semibold animate-shake">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 rounded-xl bg-[#4e49f6] hover:bg-[#3d39c4] text-paper text-sm font-bold px-6 py-3 transition-all shadow-md shadow-[#4e49f6]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-hairline/60 text-center">
            <p className="text-xs text-ink-muted">
              Hesabın yok mu?{' '}
              <Link
                href="/kayit"
                className="text-[#4e49f6] font-bold hover:underline"
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
