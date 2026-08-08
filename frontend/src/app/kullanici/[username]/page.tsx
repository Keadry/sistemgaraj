'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { deleteBuild } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import { blockUser, unblockUser } from '@/lib/api';
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

// Kullanıcılar adresi "github.com/foo" gibi şemasız girebiliyor; href'e
// olduğu gibi konursa tarayıcı bunu göreli yol sayıp site içinde arıyor.
function normalizeUrl(value: string): string {
  return value.startsWith('http') ? value : `https://${value}`;
}

const SOCIAL_ICONS: Record<string, React.ReactElement> = {
  twitter: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.725-1.335-1.725-1.087-.731.084-.716.084-.716 1.205.082 1.838 1.215 1.838 1.215 1.07 1.803 2.809 1.282 3.495.98.108-.762.417-1.282.76-1.577-2.665-.295-5.466-1.309-5.466-5.827 0-1.287.465-2.339 1.235-3.164-.135-.298-.54-1.497.105-3.121 0 0 1.005-.316 3.3 1.209.96-.262 1.98-.392 3-.398 1.02.006 2.04.136 3 .398 2.28-1.525 3.285-1.209 3.285-1.209.645 1.624.24 2.823.12 3.121.765.825 1.23 1.877 1.23 3.164 0 4.53-2.805 5.527-5.475 5.817.42.354.81 1.077.81 2.182 0 1.578-.015 2.846-.015 3.229 0 .309.21.678.825.561C20.565 21.917 24 17.502 24 12.292 24 5.78 18.627.5 12 .5z" />
    </svg>
  ),
  steam: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  ),
  discord: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  website: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
    </svg>
  ),
};

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
  const [isBlockPending, setIsBlockPending] = useState(false);

  async function handleBlockToggle() {
    if (!token || !profile) return;

    const isBlocking = !profile.hasBlocked;

    if (isBlocking) {
      const ok = await confirmDialog({
        title: 'Kullanıcıyı engelle',
        description: `@${profile.username} artık sistemlerine ve profiline yorum yazamayacak.`,
        confirmLabel: 'Engelle',
        danger: true,
      });
      if (!ok) return;
    }

    setIsBlockPending(true);
    try {
      if (isBlocking) {
        await blockUser(profile.username, token);
      } else {
        await unblockUser(profile.username, token);
      }

      /* Durumu yerelde güncelliyoruz. Eskiden istek gönderiliyor ama profil
         hiç tazelenmiyordu, dolayısıyla buton "Engelle" olarak kalıyor ve
         işlem olmamış gibi görünüyordu. */
      setProfile((prev) => (prev ? { ...prev, hasBlocked: isBlocking } : prev));
      showToast(
        isBlocking ? 'Kullanıcı engellendi.' : 'Engel kaldırıldı.',
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bir hata oluştu.', 'error');
    } finally {
      setIsBlockPending(false);
    }
  }

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
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <SkeletonProfileHeader />
          <div className="mt-8">
            <SkeletonBuildGrid count={10} />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  // Discord burada yok: adres değil, kullanıcı adı — ayrı bir etiket olarak
  // gösteriliyor.
  const socialLinks = [
    { label: 'X', url: profile.twitterUrl, icon: SOCIAL_ICONS.twitter },
    { label: 'GitHub', url: profile.githubUrl, icon: SOCIAL_ICONS.github },
    { label: 'Steam', url: profile.steamUrl, icon: SOCIAL_ICONS.steam },
    { label: 'Web sitesi', url: profile.websiteUrl, icon: SOCIAL_ICONS.website },
  ].filter((link): link is typeof link & { url: string } => Boolean(link.url));

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8">
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
              isOnline={profile.isOnline}
              token={token}
              onUploaded={(url) =>
                setProfile((prev) =>
                  prev ? { ...prev, avatarUrl: url } : prev,
                )
              }
            />

            {/* KULLANICI BİLGİ BARI */}
            <div className="sm:pb-2 bg-scrim/75 backdrop-blur-md rounded-2xl px-4 py-3 border border-on-scrim/10 shadow-lg w-full sm:w-96">
              {/* Çevrimiçi rozeti artık avatarın sağ alt köşesinde. */}
              <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-semibold tracking-tight text-on-scrim truncate">
                {profile.username}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm text-on-scrim/70">
                <span className="font-[family-name:var(--font-mono)]">
                  {builds.length} sistem
                </span>
                <span className="text-on-scrim/30">·</span>
                <span>{formatDate(profile.createdAt)} tarihinde katıldı</span>
                {profile.isOnline === false && profile.lastActiveAt && (
                  <>
                    <span className="text-on-scrim/30">·</span>
                    <span>
                      {formatRelativeTime(profile.lastActiveAt)} aktifti
                    </span>
                  </>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-on-scrim/90 mt-2 leading-relaxed">
                  {profile.bio}
                </p>
              )}
              {(socialLinks.length > 0 || profile.discordUrl) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={normalizeUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.label}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-scrim/70 hover:text-on-scrim hover:bg-on-scrim/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-scrim"
                    >
                      <span className="sr-only">{link.label}</span>
                      {link.icon}
                    </a>
                  ))}
                  {profile.discordUrl && (
                    /* Discord bir adres değil, kullanıcı adı — link olamaz,
                       o yüzden kopyalanabilir bir etiket olarak duruyor. */
                    <span
                      title="Discord kullanıcı adı"
                      className="inline-flex items-center gap-1.5 h-8 rounded-lg px-2.5 bg-on-scrim/10 text-on-scrim/80 text-xs font-medium max-w-full"
                    >
                      {SOCIAL_ICONS.discord}
                      <span className="truncate">{profile.discordUrl}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Engelleme kimlik bilgisinin parçası değil, bir eylem — cam
                kutunun içinde dururken bio ve sosyal bağlantılarla aynı
                seviyedeymiş gibi okunuyordu. Kutunun dışına, satırın sonuna
                alındı. */}
            {!isOwner && currentUser && (
              <div className="sm:ml-auto sm:pb-2 shrink-0">
                <button
                  onClick={handleBlockToggle}
                  disabled={isBlockPending}
                  className={`text-xs font-medium rounded-lg px-3.5 py-2 border transition-colors duration-200 ease-trace cursor-pointer disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    profile.hasBlocked
                      ? 'border-incompatible/40 bg-incompatible/10 text-incompatible hover:bg-incompatible/20 focus-visible:outline-incompatible'
                      : 'border-hairline text-ink-muted hover:border-incompatible hover:text-incompatible focus-visible:outline-incompatible'
                  }`}
                >
                  {profile.hasBlocked ? 'Engeli Kaldır' : 'Engelle'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Engellenen kullanıcının profilinde ne olduğunu açıkça söylemek
            gerekiyor: eskiden engelle'ye basınca görünürde hiçbir şey
            değişmiyordu, işlem gerçekleşmiş mi belli olmuyordu. */}
        {profile.hasBlocked && (
          <div className="bg-incompatible/10 border border-incompatible/20 rounded-2xl p-3.5 text-xs font-semibold text-incompatible flex items-center gap-2">
            <span>🚫</span>
            <span>
              Bu kullanıcıyı engelledin — sistemlerine ve profiline yorum
              yazamaz.
            </span>
          </div>
        )}

        {/* PROFiL SAHİBİ BİLGİLENDİRME */}
        {isOwner && (
          <div className="bg-trace/10 border border-trace/20 rounded-2xl p-3.5 text-xs font-semibold text-trace flex items-center gap-2">
            <span>🔒</span>
            <span>
              Özel sistemlerin de listede gösteriliyor — bunu sadece sen
              görebiliyorsun.
            </span>
          </div>
        )}

        {/* SİSTEM KARTLARI VEYA BOŞ DURUM */}
        {builds.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-hairline rounded-3xl mt-8 bg-surface/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-trace/10 border border-trace/20 text-trace flex items-center justify-center mx-auto text-xl shadow-xs">
              🖥️
            </div>
            <p className="text-ink font-bold text-base">
              {isOwner
                ? 'Henüz bir sistem oluşturmadın. Hemen ilk sistemini topla!'
                : 'Bu kullanıcı henüz bir sistem paylaşmamış.'}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink mb-4">
              Paylaşılan Sistemler
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {builds.map((build) => (
                <div key={build.id} className="relative group/card">
                  {/* ÖZEL ETİKETİ (SOL ÜST) */}
                  {isOwner && !build.isPublic && (
                    <span className="absolute top-3 left-3 z-10 text-[10px] bg-scrim/80 backdrop-blur-md text-on-scrim font-bold rounded-lg px-2 py-0.5 border border-on-scrim/20 shadow-sm">
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
                      className="absolute top-3 right-3 z-20 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-all duration-200 bg-scrim/80 hover:bg-incompatible backdrop-blur-md text-on-scrim/90 hover:text-on-scrim p-2 rounded-xl border border-on-scrim/20 hover:border-incompatible shadow-md cursor-pointer active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
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
