'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { deleteBuild } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import { blockUser } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProfileCover from '@/components/ProfileCover';
import { useAuth } from '@/lib/auth-context';
import ProfileWall from '@/components/ProfileWall';
import {
  SkeletonProfileHeader,
  SkeletonBuildGrid,
} from '@/components/Skeleton';
import {
  getUserProfileWithWall,
  type Build,
  type UserProfile,
  type WallComment,
} from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'az önce';
  if (diffMinutes < 60) return `${diffMinutes} dakika önce`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} gün önce`;

  return formatDate(dateString);
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { user: currentUser, token, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [wallComments, setWallComments] = useState<WallComment[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;

    getUserProfileWithWall(username, token)
      .then((data) => {
        setProfile(data.user);
        const sorted = [...data.builds].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });
        setBuilds(sorted);

        setIsOwner(data.isOwner);
        setWallComments(data.wallComments);
      })
      .catch(() => setNotFoundError(true))
      .finally(() => setIsLoading(false));
  }, [username, token, isAuthLoading]);

  if (notFoundError) {
    notFound();
  }

  if (isLoading || isAuthLoading) {
    return (
      <main className="min-h-screen pb-20">
        <Navbar />
        <div className="px-6 md:px-12 py-10">
          <SkeletonProfileHeader />
          <div className="mt-8">
            <SkeletonBuildGrid count={10} />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10 space-y-8">
        {/* KAPAK VE BÜYÜK AVATAR ALANI */}
        <div>
          <ProfileCover
            coverUrl={profile.coverUrl}
            isOwner={isOwner}
            token={token}
            onUploaded={(url) =>
              setProfile((prev) => (prev ? { ...prev, coverUrl: url } : prev))
            }
          />

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 px-2 relative z-10">
            <ProfileAvatar
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              isOwner={isOwner}
              token={token}
              onUploaded={(url) =>
                setProfile((prev) =>
                  prev ? { ...prev, avatarUrl: url } : prev,
                )
              }
            />

            {/* KULLANICI BİLGİ BARI */}
            <div className="sm:pb-2 bg-ink/70 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-paper/10 w-fit">
              <div className="flex items-center gap-2">
                <h1
                  className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-semibold tracking-tight text-paper"
                  style={{
                    textShadow:
                      '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {profile.username}
                </h1>
                {profile.isOnline === true && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-compatible shrink-0"
                    title="Çevrimiçi"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-paper/70">
                <span className="font-[family-name:var(--font-mono)]">
                  {builds.length} sistem
                </span>
                <span className="text-paper/30">·</span>
                <span>{formatDate(profile.createdAt)} tarihinde katıldı</span>
                {profile.isOnline === false && profile.lastActiveAt && (
                  <>
                    <span className="text-paper/30">·</span>
                    <span>
                      {formatRelativeTime(profile.lastActiveAt)} aktifti
                    </span>
                  </>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-paper/90 mt-2 max-w-md leading-relaxed">
                  {profile.bio}
                </p>
              )}
              {(profile.twitterUrl ||
                profile.githubUrl ||
                profile.steamUrl ||
                profile.discordUrl ||
                profile.websiteUrl) && (
                <div className="flex items-center gap-3 mt-2">
                  {profile.twitterUrl && (
                    <a
                      href={
                        profile.twitterUrl.startsWith('http')
                          ? profile.twitterUrl
                          : `https://${profile.twitterUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-paper/70 hover:text-paper transition-colors"
                    >
                      X
                    </a>
                  )}
                  {profile.githubUrl && (
                    <a
                      href={
                        profile.githubUrl.startsWith('http')
                          ? profile.githubUrl
                          : `https://${profile.githubUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-paper/70 hover:text-paper transition-colors"
                    >
                      GitHub
                    </a>
                  )}
                  {profile.steamUrl && (
                    <a
                      href={
                        profile.steamUrl.startsWith('http')
                          ? profile.steamUrl
                          : `https://${profile.steamUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-paper/70 hover:text-paper transition-colors"
                    >
                      Steam
                    </a>
                  )}
                  {profile.discordUrl && (
                    <span className="text-xs text-paper/70">
                      Discord: {profile.discordUrl}
                    </span>
                  )}
                  {profile.websiteUrl && (
                    <a
                      href={
                        profile.websiteUrl.startsWith('http')
                          ? profile.websiteUrl
                          : `https://${profile.websiteUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-paper/70 hover:text-paper transition-colors"
                    >
                      Website
                    </a>
                  )}
                </div>
              )}
              {!isOwner && currentUser && (
                <div className="mt-4 px-2">
                  <button
                    onClick={async () => {
                      if (!token) return;
                      const ok = await confirmDialog({
                        title: 'Kullanıcıyı engelle',
                        description: `@${profile.username} artık sana yorum/mesaj yazamayacak.`,
                        confirmLabel: 'Engelle',
                        danger: true,
                      });
                      if (!ok) return;

                      try {
                        await blockUser(profile.username, token);
                        showToast('Kullanıcı engellendi.', 'success');
                      } catch (err) {
                        showToast(
                          err instanceof Error
                            ? err.message
                            : 'Bir hata oluştu.',
                          'error',
                        );
                      }
                    }}
                    className="text-xs text-ink-muted hover:text-incompatible transition-colors rounded-lg px-3 py-1.5 border border-hairline hover:border-incompatible focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
                  >
                    Engelle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PROFiL SAHİBİ BİLGİLENDİRME */}
        {isOwner && (
          <div className="bg-[#4e49f6]/10 border border-[#4e49f6]/20 rounded-2xl p-3.5 text-xs font-semibold text-[#4e49f6] flex items-center gap-2">
            <span>🔒</span>
            <span>
              Özel sistemlerin de listede gösteriliyor — bunu sadece sen
              görebiliyorsun.
            </span>
          </div>
        )}

        {/* SİSTEM KARTLARI VEYA BOŞ DURUM */}
        {builds.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl mt-8 bg-white/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#4e49f6]/10 border border-[#4e49f6]/20 text-[#4e49f6] flex items-center justify-center mx-auto text-xl shadow-xs">
              🖥️
            </div>
            <p className="text-slate-800 font-bold text-base">
              {isOwner
                ? 'Henüz bir sistem oluşturmadın. Hemen ilk sistemini topla!'
                : 'Bu kullanıcı henüz bir sistem paylaşmamış.'}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-900 mb-4">
              Paylaşılan Sistemler
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {builds.map((build) => (
                <div key={build.id} className="relative group/card">
                  {/* ÖZEL ETİKETİ (SOL ÜST) */}
                  {isOwner && !build.isPublic && (
                    <span className="absolute top-3 left-3 z-10 text-[10px] bg-slate-900/80 backdrop-blur-md text-white font-bold rounded-lg px-2 py-0.5 border border-white/20 shadow-sm">
                      Özel
                    </span>
                  )}

                  {/* MODERN SİLME BUTONU (SAĞ ÜST - HOVER İLE BELİRİR) */}
                  {isOwner && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!token) return;
                        const ok = await confirmDialog({
                          title: 'Sistemi sil',
                          description: `"${build.name}" sistemini silmek istediğine emin misin? Bu işlem geri alınamaz.`,
                          confirmLabel: 'Sil',
                          danger: true,
                        });
                        if (!ok) return;

                        try {
                          await deleteBuild(build.id, token);
                          setBuilds((prev) =>
                            prev.filter((b) => b.id !== build.id),
                          );
                          showToast('Sistem silindi.', 'success');
                        } catch (err) {
                          showToast(
                            err instanceof Error
                              ? err.message
                              : 'Bir hata oluştu.',
                            'error',
                          );
                        }
                      }}
                      className="absolute top-3 right-3 z-20 opacity-0 group-hover/card:opacity-100 transition-all duration-200 bg-slate-900/80 hover:bg-red-600 backdrop-blur-md text-white/90 hover:text-white p-2 rounded-xl border border-white/20 hover:border-red-500/50 shadow-md cursor-pointer active:scale-95"
                      title="Sistemi Sil"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-.75.78l.417 6.25a.75.75 0 001.494-.1l-.417-6.25a.75.75 0 00-.744-.68zm3.59 0a.75.75 0 00-.744.68l-.417 6.25a.75.75 0 101.494.1l.417-6.25a.75.75 0 00-.75-.78z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}

                  <BuildCard build={build} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFiL DUVARI */}
        {profile && (
          <div className="mt-8">
            <ProfileWall
              username={profile.username}
              profileUserId={profile.id}
              initialComments={wallComments}
            />
          </div>
        )}
      </div>
    </main>
  );
}
