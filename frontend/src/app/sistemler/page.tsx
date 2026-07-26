'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import { getFeed, type Build } from '@/lib/api';

const PAGE_SIZE = 20;

export default function TumSistemlerPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Kullanıcı yazmayı bırakınca 300ms sonra aramayı tetikle (her tuş vuruşunda
  // sunucuya istek atmamak için)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const isSearching = debouncedSearch.length > 0;

  function sortFeatured(list: Build[]): Build[] {
    return [...list].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return 0;
    });
  }

  // Arama sorgusu değişince: temiz bir sayfa gibi baştan yükle
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (isSearching) {
      getFeed({ search: debouncedSearch, limit: 50 })
        .then((data) => {
          setBuilds(data);
          setHasMore(false);
        })
        .catch(() => setError('Sistemler yüklenirken bir hata oluştu.'))
        .finally(() => setIsLoading(false));
    } else {
      getFeed({ limit: PAGE_SIZE, offset: 0 })
        .then((data) => {
          setBuilds(sortFeatured(data));
          setOffset(data.length);
          setHasMore(data.length === PAGE_SIZE);
        })
        .catch(() => setError('Sistemler yüklenirken bir hata oluştu.'))
        .finally(() => setIsLoading(false));
    }
  }, [debouncedSearch, isSearching]);

  const loadMore = useCallback(async () => {
    if (isSearching || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const data = await getFeed({ limit: PAGE_SIZE, offset });
      setBuilds((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError('Daha fazla sistem yüklenemedi.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isSearching, isLoadingMore, hasMore, offset]);

  return (
    <main className="min-h-screen text-ink pb-24 relative overflow-hidden">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12 relative z-10">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-hairline/80">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trace/10 border border-trace/20 text-trace text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-trace" />
              Katalog
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold tracking-tight text-ink">
              Tüm Sistemler
            </h1>
            <p className="text-ink-muted text-sm md:text-base max-w-xl">
              Paylaşılan tüm konfigürasyonlar — hepsi SistemGaraj uyumluluk
              kontrolünden geçti.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Sistem veya kullanıcı ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-hairline rounded-xl text-sm font-medium placeholder:text-ink-muted text-ink shadow-xs focus:outline-none focus:border-trace focus:ring-2 focus:ring-trace/15 transition-all"
            />
          </div>
        </div>

        <div className="pt-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-hairline bg-paper p-3 space-y-3 animate-pulse"
                >
                  <div className="aspect-[4/3] bg-surface rounded-xl" />
                  <div className="h-4 bg-surface rounded-md w-3/4" />
                  <div className="h-3 bg-surface rounded-md w-1/2" />
                  <div className="h-8 bg-surface rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 px-4 bg-paper border border-incompatible/30 rounded-3xl space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-incompatible/10 text-incompatible flex items-center justify-center mx-auto text-xl font-bold">
                !
              </div>
              <p className="text-incompatible font-semibold text-base">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-semibold text-trace hover:underline cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
              >
                Yeniden Dene
              </button>
            </div>
          ) : builds.length === 0 ? (
            <div className="text-center py-16 px-4 bg-paper border border-hairline rounded-3xl space-y-2 shadow-xs">
              {isSearching ? (
                <>
                  <p className="text-ink font-semibold text-base">
                    Aramanızla eşleşen sistem bulunamadı.
                  </p>
                  <p className="text-ink-muted text-sm">
                    &quot;{debouncedSearch}&quot; kelimesi ile kayıtlı bir
                    sistem veya kullanıcı yok.
                  </p>
                  <button
                    onClick={() => setSearchInput('')}
                    className="mt-2 text-xs font-semibold text-trace hover:underline cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
                  >
                    Aramayı Temizle
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-trace/10 border border-trace/20 text-trace flex items-center justify-center mx-auto text-xl shadow-xs">
                    🖥️
                  </div>
                  <p className="text-ink font-semibold text-base">
                    Henüz paylaşılan bir sistem yok.
                  </p>
                  <p className="text-ink-muted text-sm max-w-sm mx-auto">
                    İlk sistemi sen topla ve toplulukta öne çık!
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {builds.map((build) => (
                  <div
                    key={build.id}
                    className="transition-transform duration-200 hover:-translate-y-1"
                  >
                    <BuildCard build={build} />
                  </div>
                ))}
              </div>

              {!isSearching && hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="rounded-xl border border-hairline px-6 py-2.5 text-sm font-medium hover:border-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    {isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
