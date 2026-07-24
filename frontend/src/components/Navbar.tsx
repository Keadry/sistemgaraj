'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Logo from './Logo';

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div className="sticky top-4 z-50 px-4 md:px-8">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-paper border border-hairline px-6 py-3.5 shadow-[0_12px_30px_-8px_rgba(var(--color-trace-rgb),0.12)] transition-all">
        <Link
          href="/"
          className="shrink-0 transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded-lg"
        >
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-1 bg-surface p-1 rounded-xl text-sm font-medium text-ink-muted border border-hairline/60">
          <Link
            href="/"
            className="px-4 py-1.5 rounded-lg hover:text-ink hover:bg-paper transition-all shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            Keşfet
          </Link>
          <Link
            href="/sistemler"
            className="px-4 py-1.5 rounded-lg hover:text-ink hover:bg-paper transition-all shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            Sistemler
          </Link>
          <Link
            href="/sistem-topla"
            className="px-4 py-1.5 rounded-lg hover:text-ink hover:bg-paper transition-all shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            Sistem Topla
          </Link>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && (
            <>
              {user ? (
                <>
                  <Link
                    href={`/kullanici/${user.username}`}
                    className="text-sm font-semibold text-ink hover:text-trace transition-colors hidden sm:inline px-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    {user.username}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-ink-muted hover:text-incompatible transition-colors px-2 py-1 rounded-lg cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
                  >
                    Çıkış
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/giris"
                    className="text-sm font-medium text-ink-muted hover:text-ink transition-colors px-3 py-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    className="rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-semibold px-4 py-2 transition-all shadow-[0_8px_16px_-4px_rgba(var(--color-trace-rgb),0.25)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
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
