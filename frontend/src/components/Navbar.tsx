'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Logo from './Logo';

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div className="sticky top-4 z-40 px-4 md:px-6">
      <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-paper border border-hairline text-ink px-5 py-3.5 shadow-lg shadow-ink/5">
        {' '}
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            Keşfet
          </Link>
          <Link
            href="/sistem-topla"
            className="hover:text-ink transition-colors"
          >
            Sistem Topla
          </Link>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && (
            <>
              {user ? (
                <>
                  <span className="text-sm text-ink-muted hidden sm:inline">
                    <Link
                      href={`/kullanici/${user.username}`}
                      className="hover:text-ink transition-colors"
                    >
                      {user.username}
                    </Link>
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-ink-muted hover:text-incompatible transition-colors"
                  >
                    Çıkış
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/giris"
                    className="text-sm text-ink-muted hover:text-ink transition-colors"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    className="rounded-lg bg-trace text-paper text-sm font-medium px-5 py-2 hover:bg-trace-dark transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Kayıt Ol
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
