'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-hairline">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
      >
        Sistem<span className="text-trace">Garaj</span>
      </Link>

      <div className="flex items-center gap-4">
        {!isLoading && (
          <>
            {user ? (
              <>
                <span className="text-sm text-ink-muted hidden sm:inline">
                  Merhaba, {user.name ?? user.email}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-ink-muted hover:text-incompatible transition-colors"
                >
                  Çıkış Yap
                </button>
                <Link
                  href="/sistem-topla"
                  className="rounded-full bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                >
                  Sistem Topla
                </Link>
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
                  className="rounded-full bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-trace transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
