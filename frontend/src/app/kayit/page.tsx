'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Logo from '@/components/Logo';

export default function KayitPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password, username);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-8">
          <Logo />
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-center mb-8">
          Hesap Oluştur
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-1.5"
            >
              Kullanıcı Adı
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="3-20 karakter, harf, rakam ve alt çizgi"
              placeholder="Username"
              className="w-full rounded-xl border border-hairline px-4 py-2.5 outline-none focus:border-trace transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              value={email}
              placeholder="E-Mail"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-hairline px-4 py-2.5 outline-none focus:border-trace transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
            >
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-hairline px-4 py-2.5 outline-none focus:border-trace transition-colors"
            />
          </div>

          {error && <p className="text-sm text-incompatible">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-ink text-paper text-sm font-medium px-6 py-3 hover:bg-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            {isSubmitting ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          Zaten hesabın var mı?{' '}
          <Link href="/giris" className="text-trace hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
