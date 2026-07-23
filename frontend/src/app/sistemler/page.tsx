'use client';

import { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import { getFeed, type Build } from '@/lib/api';

export default function TumSistemlerPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getFeed()
      .then((data) => {
        // Öne çıkan sistemler en başta, geri kalanı tarihe göre devam eder
        const sorted = [...data].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });
        setBuilds(sorted);
      })
      .catch(() => setError('Sistemler yüklenirken bir hata oluştu.'))
      .finally(() => setIsLoading(false));
  }, []);

  // İsim veya kullanıcı adına göre dinamik arama
  const filteredBuilds = useMemo(() => {
    if (!searchQuery.trim()) return builds;
    const query = searchQuery.toLowerCase();
    return builds.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.user.username.toLowerCase().includes(query),
    );
  }, [builds, searchQuery]);

  return (
    <main className="min-h-screen bg-slate-50/50 text-slate-900 pb-24 relative overflow-hidden">
      {/* Arka plan yumuşak mor glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-gradient-to-b from-[#4e49f6]/10 via-[#4e49f6]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12 relative z-10">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200/80">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4e49f6]/10 border border-[#4e49f6]/20 text-[#4e49f6] text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#4e49f6]" />
              Katalog
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Tüm Sistemler
            </h1>
            <p className="text-slate-500 text-sm md:text-base max-w-xl">
              Paylaşılan tüm konfigürasyonlar — hepsi SistemGaraj uyumluluk
              kontrolünden geçti.
            </p>
          </div>

          {/* DİNAMİK ARAMA ÇUBUĞU */}
          {!isLoading && !error && builds.length > 0 && (
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sistem veya kullanıcı ara..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 text-slate-900 shadow-xs focus:outline-none focus:border-[#4e49f6] focus:ring-2 focus:ring-[#4e49f6]/15 transition-all"
              />
            </div>
          )}
        </div>

        {/* İÇERİK BÖLÜMÜ */}
        <div className="pt-8">
          {/* 1. SKELETON LOADING STATE */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3 space-y-3 animate-pulse"
                >
                  <div className="aspect-[4/3] bg-slate-100 rounded-xl" />
                  <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : /* 2. ERROR STATE */
          error ? (
            <div className="text-center py-16 px-4 bg-white border border-red-200/80 rounded-3xl space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">
                !
              </div>
              <p className="text-red-600 font-semibold text-base">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-semibold text-[#4e49f6] hover:underline cursor-pointer"
              >
                Yeniden Dene
              </button>
            </div>
          ) : /* 3. EMPTY STATE (HİÇ SİSTEM YOKSA) */
          builds.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white border border-slate-200/80 rounded-3xl space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#4e49f6]/10 border border-[#4e49f6]/20 text-[#4e49f6] flex items-center justify-center mx-auto text-xl shadow-xs">
                🖥️
              </div>
              <p className="text-slate-800 font-semibold text-base">
                Henüz paylaşılan bir sistem yok.
              </p>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                İlk sistemi sen topla ve toplulukta öne çık!
              </p>
            </div>
          ) : /* 4. ARAMA SONUCU BULUNAMADISA */
          filteredBuilds.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white border border-slate-200/80 rounded-3xl space-y-2 shadow-xs">
              <p className="text-slate-800 font-semibold text-base">
                Aramanızla eşleşen sistem bulunamadı.
              </p>
              <p className="text-slate-500 text-sm">
                "{searchQuery}" kelimesi ile kayıtlı bir sistem veya kullanıcı
                yok.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-[#4e49f6] hover:underline cursor-pointer"
              >
                Aramayı Temizle
              </button>
            </div>
          ) : (
            /* 5. GRID LISTING */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredBuilds.map((build) => (
                <div
                  key={build.id}
                  className="transition-transform duration-200 hover:-translate-y-1"
                >
                  <BuildCard build={build} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
