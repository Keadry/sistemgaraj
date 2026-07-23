'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Logo from './Logo';

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div className="sticky top-4 z-50 px-4 md:px-8">
      {/* Opak Beyaz + İnce Gri Çerçeve + Mor Süzülen Gölge */}
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/90 px-6 py-3.5 shadow-[0_12px_30px_-8px_rgba(78,73,246,0.12)] transition-all">
        {/* LOGO */}
        <Link
          href="/"
          className="shrink-0 transition-transform active:scale-95"
        >
          <Logo />
        </Link>

        {/* ORTA NAVİGASYON */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-sm font-medium text-slate-600 border border-slate-200/40">
          <Link
            href="/"
            className="px-4 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
          >
            Keşfet
          </Link>
          <Link
            href="/sistemler"
            className="px-4 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
          >
            Sistemler
          </Link>
          <Link
            href="/sistem-topla"
            className="px-4 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
          >
            Sistem Topla
          </Link>
        </div>

        {/* SAĞ AKSİYON BÖLÜMÜ */}
        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && (
            <>
              {user ? (
                <>
                  <Link
                    href={`/kullanici/${user.username}`}
                    className="text-sm font-semibold text-slate-800 hover:text-[#4e49f6] transition-colors hidden sm:inline px-2"
                  >
                    @{user.username}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-2 py-1 cursor-pointer"
                  >
                    Çıkış
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/giris"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    className="rounded-xl bg-[#4e49f6] hover:bg-[#3d39c4] text-white text-sm font-semibold px-4 py-2 transition-all shadow-md shadow-[#4e49f6]/25 active:scale-95"
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
