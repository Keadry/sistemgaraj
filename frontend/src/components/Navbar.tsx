'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Logo from './Logo';
import { useTheme } from '@/lib/theme-context';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
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
          <button
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'
            }
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-trace hover:bg-surface transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            {theme === 'dark' ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

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
