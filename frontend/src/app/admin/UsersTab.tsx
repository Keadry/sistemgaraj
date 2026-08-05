'use client';

import { useEffect, useState, useCallback } from 'react';
import BanDialog from '@/components/BanDialog';
import { SkeletonLine } from '@/components/Skeleton';
import MuteDialog from '@/components/MuteDialog';
import UsernameDialog from '@/components/UsernameDialog';
import { useToast } from '@/lib/toast-context';
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
  type AdminUser,
} from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

const USERS_PAGE_SIZE = 20;

export default function UsersTab({
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
