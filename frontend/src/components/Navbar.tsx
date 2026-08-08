'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useTheme } from '@/lib/theme-context';

const NAV_LINKS = [
  { href: '/', label: 'Keşfet' },
  { href: '/sistemler', label: 'Sistemler' },
  { href: '/sistem-topla', label: 'Sistem Topla' },
];

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // '/' her yola önek olduğu için tam eşleşme ister. Diğerleri alt yolları da
  // kapsasın: /sistemler/<id> açıkken "Sistemler" aktif görünmeli.
  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  // Bir linke basıldığında rota değişir ve menü kendiliğinden kapanır.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setIsMenuOpen(false);
      // Odak menüdeki bir linkteyken menü kapanırsa odak body'ye düşer.
      // Kullanıcıyı açtığı butona geri koy.
      menuButtonRef.current?.focus();
    }

    // Menü açıkken tarayıcı masaüstü genişliğine geçerse panel md:hidden ile
    // gizlenir ama state açık kalır — scroll kilidi de üstünde takılı kalırdı.
    const desktop = window.matchMedia('(min-width: 768px)');
    function onBreakpointChange(e: MediaQueryListEvent) {
      if (e.matches) setIsMenuOpen(false);
    }

    // Kilidin kendisi globals.css'te ve sadece md altında geçerli — buradaki
    // iş yalnızca bayrağı koymak.
    document.body.dataset.menuOpen = 'true';
    document.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onBreakpointChange);

    return () => {
      delete document.body.dataset.menuOpen;
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpointChange);
    };
  }, [isMenuOpen]);

  return (
    <div className="sticky top-4 z-50 px-4 md:px-8">
      <nav className="relative z-10 max-w-7xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-paper border border-hairline px-4 md:px-6 py-3.5 shadow-[0_12px_30px_-8px_rgba(var(--color-trace-rgb),0.12)] transition-all">
        <Link
          href="/"
          className={`shrink-0 transition-transform active:scale-95 rounded-lg ${FOCUS_RING}`}
        >
          <Logo />
        </Link>

        {/* MASAÜSTÜ NAVİGASYON */}
        <div className="hidden md:flex items-center gap-1 bg-surface p-1 rounded-xl text-sm font-medium text-ink-muted border border-hairline/60">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`px-4 py-1.5 rounded-lg transition-all shadow-2xs ${FOCUS_RING} ${
                isActive(link.href)
                  ? 'bg-paper text-trace'
                  : 'hover:text-ink hover:bg-paper'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Çan hamburgerin dışında kalıyor: bildirim menüye gömülürse
              okunmamış sayısı görünmez olur ve varlık sebebi kalmaz. */}
          {!isLoading && user && <NotificationBell />}

          <button
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'
            }
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-trace hover:bg-surface transition-colors ${FOCUS_RING}`}
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

          {/* MASAÜSTÜ HESAP BÖLÜMÜ */}
          {!isLoading && (
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    href={`/kullanici/${user.username}`}
                    className={`text-sm font-semibold text-ink hover:text-trace transition-colors px-2 rounded-lg ${FOCUS_RING}`}
                  >
                    {user.username}
                  </Link>
                  <Link
                    href="/ayarlar"
                    className={`text-sm font-medium text-ink-muted hover:text-trace transition-colors px-2 rounded-lg ${FOCUS_RING}`}
                    title="Ayarlar"
                  >
                    ⚙
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
                    className={`text-sm font-medium text-ink-muted hover:text-ink transition-colors px-3 py-2 rounded-lg ${FOCUS_RING}`}
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    className={`rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-semibold px-4 py-2 transition-all shadow-[0_8px_16px_-4px_rgba(var(--color-trace-rgb),0.25)] active:scale-95 ${FOCUS_RING}`}
                  >
                    Kayıt Ol
                  </Link>
                </>
              )}
            </div>
          )}

          {/* MOBİL MENÜ BUTONU */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobil-menu"
            aria-label={isMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-ink hover:text-trace hover:bg-surface transition-colors cursor-pointer ${FOCUS_RING}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* MOBİL MENÜ */}
      {isMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-ink/40 backdrop-blur-xs"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          <div
            id="mobil-menu"
            className="md:hidden relative z-10 max-w-7xl mx-auto mt-2 rounded-2xl bg-paper border border-hairline p-2 shadow-[0_12px_30px_-8px_rgba(var(--color-trace-rgb),0.2)] animate-[slideDown_180ms_ease-out]"
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${FOCUS_RING} ${
                    isActive(link.href)
                      ? 'bg-trace/10 text-trace'
                      : 'text-ink hover:bg-surface'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {!isLoading && (
              <div className="mt-2 pt-2 border-t border-hairline flex flex-col gap-1">
                {user ? (
                  <>
                    <Link
                      href={`/kullanici/${user.username}`}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold text-ink hover:bg-surface transition-colors ${FOCUS_RING}`}
                    >
                      {user.username}
                    </Link>
                    <Link
                      href="/ayarlar"
                      className={`px-4 py-3 rounded-xl text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink transition-colors ${FOCUS_RING}`}
                    >
                      Ayarlar
                    </Link>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                      }}
                      className="px-4 py-3 rounded-xl text-sm font-medium text-left text-ink-muted hover:bg-surface hover:text-incompatible transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
                    >
                      Çıkış
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/giris"
                      className={`px-4 py-3 rounded-xl text-sm font-medium text-ink hover:bg-surface transition-colors ${FOCUS_RING}`}
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/kayit"
                      className={`px-4 py-3 rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-semibold text-center transition-colors ${FOCUS_RING}`}
                    >
                      Kayıt Ol
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
