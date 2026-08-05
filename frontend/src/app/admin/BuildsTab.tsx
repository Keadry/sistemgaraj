'use client';

import { useEffect, useState, useCallback } from 'react';
import { SkeletonLine } from '@/components/Skeleton';
import { useToast } from '@/lib/toast-context';
import { getAllBuildsAdmin, toggleFeatured, type Build } from '@/lib/api';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

const BUILDS_PAGE_SIZE = 20;

export default function BuildsTab({ token }: { token: string }) {
  const { showToast } = useToast();

  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      300,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const isSearching = debouncedSearch.length > 0;

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (isSearching) {
      getAllBuildsAdmin(token, { search: debouncedSearch, limit: 50 })
        .then((data) => {
          setBuilds(data);
          setHasMore(false);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    } else {
      getAllBuildsAdmin(token, { limit: BUILDS_PAGE_SIZE, offset: 0 })
        .then((data) => {
          setBuilds(data);
          setOffset(data.length);
          setHasMore(data.length === BUILDS_PAGE_SIZE);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [token, debouncedSearch, isSearching]);

  const loadMore = useCallback(async () => {
    if (isSearching || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await getAllBuildsAdmin(token, {
        limit: BUILDS_PAGE_SIZE,
        offset,
      });
      setBuilds((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === BUILDS_PAGE_SIZE);
    } catch {
      showToast('Daha fazla sistem yüklenemedi.', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isSearching, isLoadingMore, hasMore, offset, token, showToast]);

  async function handleToggle(buildId: string) {
    setActionId(buildId);
    try {
      const updated = await toggleFeatured(buildId, token);
      setBuilds((prev) =>
        prev.map((b) =>
          b.id === buildId ? { ...b, isFeatured: updated.isFeatured } : b,
        ),
      );
      showToast(
        updated.isFeatured
          ? 'Sistem öne çıkarıldı.'
          : 'Öne çıkarma kaldırıldı.',
        'success',
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Sistem veya kullanıcı ara..."
        className="w-full max-w-sm rounded-xl border border-hairline px-4 py-2 text-sm outline-none focus:border-trace transition-colors mb-4"
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLine key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-incompatible">{error}</p>
      ) : builds.length === 0 ? (
        <p className="text-ink-muted text-sm">
          {isSearching ? 'Aramayla eşleşen sistem yok.' : 'Henüz sistem yok.'}
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-hairline overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Sistem</th>
                  <th className="px-4 py-3 font-medium">Sahibi</th>
                  <th className="px-4 py-3 font-medium">Fiyat</th>
                  <th className="px-4 py-3 font-medium">Beğeni</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((b) => (
                  <tr key={b.id} className="border-t border-hairline">
                    <td className="px-4 py-3 font-medium">
                      <a
                        href={`/sistemler/${b.id}`}
                        target="_blank"
                        className="font-medium text-sm text-trace hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
                      >
                        {b.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">
                      <p className="font-medium">@{b.user.username}</p>
                    </td>
                    <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">
                      {formatPrice(b.totalPrice)}
                    </td>
                    <td className="px-4 py-3 text-xs">{b.likes.length}</td>
                    <td className="px-4 py-3">
                      <button
                        disabled={actionId === b.id}
                        onClick={() => handleToggle(b.id)}
                        className={`text-xs rounded-full border px-3 py-1 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                          b.isFeatured
                            ? 'border-trace bg-trace/10 text-trace'
                            : 'border-hairline hover:border-trace'
                        }`}
                      >
                        {b.isFeatured ? '★ Öne Çıkarıldı' : 'Öne Çıkar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isSearching && hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="rounded-xl border border-hairline px-6 py-2 text-sm font-medium hover:border-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                {isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
