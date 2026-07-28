'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { deleteBuild } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
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

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { token, isLoading: isAuthLoading } = useAuth();
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
            <div className="sm:pb-2 bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-white w-fit shadow-xl flex items-center gap-4">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  {profile.username}
                </h1>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {formatDate(profile.createdAt)} tarihinde katıldı
                </p>
              </div>

              <div className="h-9 w-px bg-white/15" />
              <div className="text-center px-1">
                <span className="font-[family-name:var(--font-mono)] text-xl font-extrabold text-[#C084FC] block leading-none">
                  {builds.length}
                </span>
                <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">
                  Sistem
                </span>
              </div>
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
