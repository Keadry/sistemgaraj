'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BanDialog from '@/components/BanDialog';
import { SkeletonLine } from '@/components/Skeleton';
import MuteDialog from '@/components/MuteDialog';
import UsernameDialog from '@/components/UsernameDialog';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { getMyReactions, type Reaction } from '@/lib/api';
import { useConfirm } from '@/lib/confirm-context';
import UserDetailPanel from '@/components/UserDetailPanel';
import {
  getUsers,
  muteUser,
  unmuteUser,
  banUser,
  unbanUser,
  changeUserRole,
  changeUsername,
  getAllBuildsAdmin,
  toggleFeatured,
  getAllComments,
  deleteComment,
  approveComment,
  rejectComment,
  getNewBuildsForReview,
  approveNewBuild,
  rejectNewBuild,
  getEditRequestsForReview,
  approveEditRequest,
  rejectEditRequest,
  type AdminUser,
  type Build,
  type AdminComment,
  type NewBuildForReview,
  type AdminEditRequest,
} from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

type Tab = 'users' | 'builds' | 'comments' | 'newBuilds' | 'editRequests';

export default function AdminPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('users');

  const isModerator = user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAuthLoading && !isModerator) {
      router.push('/');
    }
  }, [isAuthLoading, isModerator, router]);

  if (isAuthLoading || !isModerator || !token) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Yönetim Paneli
        </h1>

        {/* SEKME BAŞLIKLARI */}
        <div className="flex gap-2 mt-6 border-b border-hairline">
          {[
            { key: 'users' as Tab, label: 'Kullanıcılar' },
            { key: 'builds' as Tab, label: 'Sistemler' },
            { key: 'comments' as Tab, label: 'Yorumlar' },
            { key: 'newBuilds' as Tab, label: 'Yeni Sistem Onayları' },
            { key: 'editRequests' as Tab, label: 'Düzenleme İstekleri' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                tab === t.key
                  ? 'border-trace text-trace'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'users' && (
            <UsersTab
              token={token}
              isAdmin={isAdmin}
              currentUserId={user!.id}
            />
          )}
          {tab === 'builds' && <BuildsTab token={token} />}
          {tab === 'comments' && <CommentsTab token={token} />}
          {tab === 'newBuilds' && <NewBuildsTab token={token} />}
          {tab === 'editRequests' && <EditRequestsTab token={token} />}
        </div>
      </div>
    </main>
  );
}

// ==============================
// SEKME 1: KULLANICILAR
// ==============================
// ==============================
// SEKME 1: KULLANICILAR
// ==============================
// ==============================
// SEKME 1: KULLANICILAR
// ==============================
// ==============================
// SEKME 1: KULLANICILAR
// ==============================
const USERS_PAGE_SIZE = 20;

function UsersTab({
  token,
  isAdmin,
  currentUserId,
}: {
  token: string;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const [muteDialogUserId, setMuteDialogUserId] = useState<string | null>(null);
  const [banDialogUserId, setBanDialogUserId] = useState<string | null>(null);
  const [usernameDialogUser, setUsernameDialogUser] =
    useState<AdminUser | null>(null);

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
      getUsers(token, { search: debouncedSearch, limit: 50 })
        .then((data) => {
          setUsers(data);
          setHasMore(false);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    } else {
      getUsers(token, { limit: USERS_PAGE_SIZE, offset: 0 })
        .then((data) => {
          setUsers(data);
          setOffset(data.length);
          setHasMore(data.length === USERS_PAGE_SIZE);
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [token, debouncedSearch, isSearching]);

  const loadMore = useCallback(async () => {
    if (isSearching || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await getUsers(token, { limit: USERS_PAGE_SIZE, offset });
      setUsers((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === USERS_PAGE_SIZE);
    } catch {
      showToast('Daha fazla kullanıcı yüklenemedi.', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isSearching, isLoadingMore, hasMore, offset, token, showToast]);

  // Mute/ban/rol/username işlemleri kullanıcı sayısını değiştirmez, o yüzden
  // sadece görünen listeyi tazeliyoruz (offset/hasMore'a dokunmadan).
  async function refreshCurrent() {
    if (isSearching) {
      const fresh = await getUsers(token, {
        search: debouncedSearch,
        limit: 50,
      });
      setUsers(fresh);
    } else {
      const fresh = await getUsers(token, {
        limit: Math.max(users.length, USERS_PAGE_SIZE),
        offset: 0,
      });
      setUsers(fresh);
    }
  }

  async function handleMuteConfirm(hours: number, reason: string) {
    if (!muteDialogUserId) return;
    const userId = muteDialogUserId;
    setMuteDialogUserId(null);
    setActionUserId(userId);
    try {
      await muteUser(userId, hours, reason, token);
      await refreshCurrent();
      showToast('Kullanıcı susturuldu.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionUserId(null);
    }
  }

  async function handleUnmute(userId: string) {
    setActionUserId(userId);
    try {
      await unmuteUser(userId, token);
      await refreshCurrent();
      showToast('Susturma kaldırıldı.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionUserId(null);
    }
  }

  async function handleBanConfirm(reason: string) {
    if (!banDialogUserId) return;
    const userId = banDialogUserId;
    setBanDialogUserId(null);
    setActionUserId(userId);
    try {
      await banUser(userId, reason, token);
      await refreshCurrent();
      showToast('Kullanıcı banlandı.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionUserId(null);
    }
  }

  async function handleUnban(userId: string) {
    const ok = await confirmDialog({
      title: 'Banı kaldır',
      description: 'Bu kullanıcının hesabı tekrar aktif hale gelecek.',
      confirmLabel: 'Banı Kaldır',
    });
    if (!ok) return;

    setActionUserId(userId);
    try {
      await unbanUser(userId, token);
      await refreshCurrent();
      showToast('Ban kaldırıldı.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    setActionUserId(userId);
    try {
      await changeUserRole(userId, role, token);
      await refreshCurrent();
      showToast('Rol güncellendi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionUserId(null);
    }
  }

  async function handleUsernameConfirm(newUsername: string) {
    if (!usernameDialogUser) return;
    const userId = usernameDialogUser.id;
    setUsernameDialogUser(null);
    setActionUserId(userId);
    try {
      await changeUsername(userId, newUsername, token);
      await refreshCurrent();
      showToast('Kullanıcı adı güncellendi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Kullanıcı adı veya e-posta ara..."
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
      ) : users.length === 0 ? (
        <p className="text-ink-muted text-sm">
          {isSearching
            ? 'Aramayla eşleşen kullanıcı yok.'
            : 'Henüz kullanıcı yok.'}
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-hairline overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Kayıt</th>
                  <th className="px-4 py-3 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMuted =
                    u.mutedUntil && new Date(u.mutedUntil) > new Date();
                  const isBusy = actionUserId === u.id;

                  return (
                    <tr key={u.id} className="border-t border-hairline">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUserId(u.id)}
                            className="text-left hover:text-trace transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
                          >
                            <p className="font-medium">@{u.username}</p>
                            <p className="text-ink-muted text-xs">{u.email}</p>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setUsernameDialogUser(u)}
                              disabled={actionUserId === u.id}
                              title="Kullanıcı adını değiştir"
                              className="text-ink-muted hover:text-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && u.id !== currentUserId ? (
                          <select
                            value={u.role}
                            disabled={isBusy}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value)
                            }
                            className="rounded-xl border border-hairline px-2 py-1 text-xs bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span className="font-[family-name:var(--font-mono)] text-xs">
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.isBanned ? (
                          <span className="text-incompatible text-xs font-medium">
                            Banlı
                          </span>
                        ) : isMuted ? (
                          <span
                            className="text-xs font-medium"
                            style={{ color: '#c08a1e' }}
                          >
                            Susturulmuş
                          </span>
                        ) : (
                          <span className="text-compatible text-xs font-medium">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted text-xs">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {u.id === currentUserId ? (
                          <span className="text-ink-muted text-xs">Sen</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {isMuted ? (
                              <button
                                disabled={isBusy}
                                onClick={() => handleUnmute(u.id)}
                                className="text-xs rounded-full border border-hairline px-3 py-1 hover:border-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                              >
                                Susturmayı Kaldır
                              </button>
                            ) : (
                              <button
                                disabled={isBusy}
                                onClick={() => setMuteDialogUserId(u.id)}
                                className="text-xs rounded-full border border-hairline px-3 py-1 hover:border-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                              >
                                Sustur
                              </button>
                            )}

                            {isAdmin && (
                              <>
                                {u.isBanned ? (
                                  <button
                                    disabled={isBusy}
                                    onClick={() => handleUnban(u.id)}
                                    className="text-xs rounded-full border border-hairline px-3 py-1 hover:border-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                                  >
                                    Banı Kaldır
                                  </button>
                                ) : (
                                  <button
                                    disabled={isBusy}
                                    onClick={() => setBanDialogUserId(u.id)}
                                    className="text-xs rounded-full border border-incompatible text-incompatible px-3 py-1 hover:bg-incompatible/10 transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
                                  >
                                    Banla
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          token={token}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {muteDialogUserId && (
        <MuteDialog
          onConfirm={handleMuteConfirm}
          onCancel={() => setMuteDialogUserId(null)}
        />
      )}

      {banDialogUserId && (
        <BanDialog
          onConfirm={handleBanConfirm}
          onCancel={() => setBanDialogUserId(null)}
        />
      )}

      {usernameDialogUser && (
        <UsernameDialog
          currentUsername={usernameDialogUser.username ?? ''}
          onConfirm={handleUsernameConfirm}
          onCancel={() => setUsernameDialogUser(null)}
        />
      )}
    </div>
  );
}
// ==============================
// SEKME 2: SİSTEMLER
// ==============================
// ==============================
// SEKME 2: SİSTEMLER
// ==============================
const BUILDS_PAGE_SIZE = 20;

function BuildsTab({ token }: { token: string }) {
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
// ==============================
// SEKME 3: YORUMLAR
// ==============================
// ==============================
// SEKME 3: YORUMLAR
// ==============================
const COMMENTS_PAGE_SIZE = 20;

function CommentsTab({ token }: { token: string }) {
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
// ==============================
// SEKME: YENİ SİSTEM ONAYLARI
// ==============================
function NewBuildsTab({ token }: { token: string }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [builds, setBuilds] = useState<NewBuildForReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    getNewBuildsForReview(token)
      .then(setBuilds)
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await approveNewBuild(id, token);
      setBuilds((prev) => prev.filter((b) => b.id !== id));
      showToast('Sistem onaylandı.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    const ok = await confirmDialog({
      title: 'Sistemi reddet',
      description: 'Görseller silinecek, sistem yayınlanmayacak.',
      confirmLabel: 'Reddet',
      danger: true,
    });
    if (!ok) return;

    setActionId(id);
    try {
      await rejectNewBuild(id, token);
      setBuilds((prev) => prev.filter((b) => b.id !== id));
      showToast('Sistem reddedildi.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
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
  if (builds.length === 0)
    return <p className="text-ink-muted text-sm">Onay bekleyen sistem yok.</p>;

  return (
    <div className="space-y-4">
      {builds.map((build) => (
        <div key={build.id} className="rounded-xl border border-hairline p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{build.name}</p>
              <p className="text-xs text-ink-muted">@{build.user.username}</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={actionId === build.id}
                onClick={() => handleApprove(build.id)}
                className="text-xs rounded-full border border-compatible text-compatible px-3 py-1.5 hover:bg-compatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-compatible"
              >
                Onayla
              </button>
              <button
                disabled={actionId === build.id}
                onClick={() => handleReject(build.id)}
                className="text-xs rounded-full border border-incompatible text-incompatible px-3 py-1.5 hover:bg-incompatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
              >
                Reddet
              </button>
            </div>
          </div>
          {build.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {build.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={`${API_URL}${img.url}`}
                  alt=""
                  className="w-24 h-20 object-cover rounded-xl shrink-0"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==============================
// SEKME: DÜZENLEME İSTEKLERİ
// ==============================
function EditRequestsTab({ token }: { token: string }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [requests, setRequests] = useState<AdminEditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  useEffect(() => {
    getEditRequestsForReview(token)
      .then(setRequests)
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await approveEditRequest(id, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast('Düzenleme onaylandı.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    const ok = await confirmDialog({
      title: 'Düzenlemeyi reddet',
      confirmLabel: 'Reddet',
      danger: true,
    });
    if (!ok) return;

    setActionId(id);
    try {
      await rejectEditRequest(id, token);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast('Düzenleme isteği reddedildi.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Hata oluştu.', 'error');
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
  if (requests.length === 0)
    return (
      <p className="text-ink-muted text-sm">Onay bekleyen düzenleme yok.</p>
    );

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="rounded-xl border border-hairline p-4">
          <div className="flex items-center justify-between">
            <div>
              <a
                href={`/sistemler/${req.build.id}`}
                target="_blank"
                className="font-medium text-sm text-trace hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace rounded"
              >
                {req.build.name}
              </a>
              <p className="text-xs text-ink-muted">
                @{req.build.user.username}
              </p>
              {req.name && req.name !== req.build.name && (
                <p className="text-sm text-trace mt-1">
                  Yeni isim: <span className="font-medium">{req.name}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={actionId === req.id}
                onClick={() => handleApprove(req.id)}
                className="text-xs rounded-full border border-compatible text-compatible px-3 py-1.5 hover:bg-compatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-compatible"
              >
                Onayla
              </button>
              <button
                disabled={actionId === req.id}
                onClick={() => handleReject(req.id)}
                className="text-xs rounded-full border border-incompatible text-incompatible px-3 py-1.5 hover:bg-incompatible/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
              >
                Reddet
              </button>
            </div>
          </div>

          {req.description && (
            <p className="text-xs text-ink-muted mt-2">
              Açıklama: {req.description}
            </p>
          )}

          {req.notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {req.notes.map((n) => (
                <p key={n.id} className="text-xs text-ink-muted">
                  <span className="font-medium">{n.componentType}:</span>{' '}
                  {n.note}
                </p>
              ))}
            </div>
          )}

          {req.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {req.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={`${API_URL}${img.url}`}
                  alt=""
                  className="w-24 h-20 object-cover rounded-xl shrink-0"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
