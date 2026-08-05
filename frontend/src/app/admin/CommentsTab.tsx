'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SkeletonLine } from '@/components/Skeleton';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  getAllComments,
  deleteComment,
  approveComment,
  rejectComment,
  type AdminComment,
} from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

const COMMENTS_PAGE_SIZE = 20;

export default function CommentsTab({ token }: { token: string }) {
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [comments, setComments] = useState<AdminComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');

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
      getAllComments(token, { search: debouncedSearch, limit: 50 })
        .then((data) => {
          setComments(data);
          setHasMore(false);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    } else {
      getAllComments(token, { limit: COMMENTS_PAGE_SIZE, offset: 0 })
        .then((data) => {
          setComments(data);
          setOffset(data.length);
          setHasMore(data.length === COMMENTS_PAGE_SIZE);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [token, debouncedSearch, isSearching]);

  const loadMore = useCallback(async () => {
    if (isSearching || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await getAllComments(token, {
        limit: COMMENTS_PAGE_SIZE,
        offset,
      });
      setComments((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === COMMENTS_PAGE_SIZE);
    } catch {
      showToast('Daha fazla yorum yüklenemedi.', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isSearching, isLoadingMore, hasMore, offset, token, showToast]);

  async function handleDelete(commentId: string) {
    const ok = await confirmDialog({
      title: 'Yorumu sil',
      description: 'Bu işlem geri alınamaz.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    setActionId(commentId);
    try {
      await deleteComment(commentId, token);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast('Yorum silindi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleApprove(commentId: string) {
    setActionId(commentId);
    try {
      await approveComment(commentId, token);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, status: 'APPROVED' as const } : c,
        ),
      );
      showToast('Yorum onaylandı.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(commentId: string) {
    setActionId(commentId);
    try {
      await rejectComment(commentId, token);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, status: 'REJECTED' as const } : c,
        ),
      );
      showToast('Yorum reddedildi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  if (error) return <p className="text-incompatible">{error}</p>;

  const pendingCount = comments.filter((c) => c.status === 'PENDING').length;
  const visibleComments =
    filter === 'PENDING'
      ? comments.filter((c) => c.status === 'PENDING')
      : comments;

  return (
    <div>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Yorum içeriği, kullanıcı veya sistem ara..."
        className="w-full max-w-sm rounded-xl border border-hairline px-4 py-2 text-sm outline-none focus:border-trace transition-colors mb-4"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`text-xs rounded-full px-3 py-1.5 border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
            filter === 'ALL'
              ? 'border-trace bg-trace/10 text-trace'
              : 'border-hairline text-ink-muted hover:border-trace'
          }`}
        >
          Tümü ({comments.length})
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`text-xs rounded-full px-3 py-1.5 border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
            filter === 'PENDING'
              ? 'border-trace bg-trace/10 text-trace'
              : 'border-hairline text-ink-muted hover:border-trace'
          }`}
        >
          Onay Bekleyen ({pendingCount})
        </button>
      </div>

      {isSearching && (
        <p className="text-xs text-ink-muted mb-3">
          Filtre, sadece arama sonuçları içinde uygulanır.
        </p>
      )}

      {visibleComments.length === 0 ? (
        <p className="text-ink-muted text-sm">Gösterilecek yorum yok.</p>
      ) : (
        <>
          <div className="space-y-3">
            {visibleComments.map((c) => {
              const isBusy = actionId === c.id;

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
                    c.status === 'PENDING'
                      ? 'border-trace bg-trace/5'
                      : c.status === 'REJECTED'
                        ? 'border-incompatible bg-incompatible/5'
                        : 'border-hairline'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-ink-muted flex-wrap">
                      <span className="font-medium text-ink">
                        @{c.user.username ?? c.user.email}
                      </span>
                      <span>·</span>
                      <Link
                        href={`/sistemler/${c.build.id}`}
                        target="_blank"
                        className="text-trace hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
                      >
                        {c.build.name}
                      </Link>
                      <span>·</span>
                      <span>{formatDate(c.createdAt)}</span>
                      {c.status === 'PENDING' && (
                        <span className="text-trace font-medium">
                          Onay Bekliyor
                        </span>
                      )}
                      {c.status === 'REJECTED' && (
                        <span className="text-incompatible font-medium">
                          Reddedildi
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink mt-1.5 break-words">
                      {c.content}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    {c.status === 'PENDING' && (
                      <>
                        <button
                          disabled={isBusy}
                          onClick={() => handleApprove(c.id)}
                          className="text-xs rounded-full border border-compatible text-compatible px-3 py-1.5 hover:bg-compatible/10 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-compatible"
                        >
                          Onayla
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => handleReject(c.id)}
                          className="text-xs rounded-full border border-incompatible text-incompatible px-3 py-1.5 hover:bg-incompatible/10 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
                        >
                          Reddet
                        </button>
                      </>
                    )}
                    <button
                      disabled={isBusy}
                      onClick={() => handleDelete(c.id)}
                      className="text-xs rounded-full border border-hairline text-ink-muted px-3 py-1.5 hover:border-incompatible hover:text-incompatible transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
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
