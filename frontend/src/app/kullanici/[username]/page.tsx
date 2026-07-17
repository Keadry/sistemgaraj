'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { use } from 'react';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProfileCover from '@/components/ProfileCover';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, type Build, type UserProfile } from '@/lib/api';

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

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;

    getUserProfile(username, token)
      .then((data) => {
        setProfile(data.user);
        setBuilds(data.builds);
        setIsOwner(data.isOwner);
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
          <p className="text-ink-muted">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10">
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
              setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev))
            }
          />
          <div className="sm:pb-2 bg-ink/70 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-paper/10 w-fit">
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-2xl font-semibold tracking-tight text-paper">
              {profile.username}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-paper/70">
              <span className="font-[family-name:var(--font-mono)]">
                {builds.length} sistem
              </span>
              <span className="text-paper/30">·</span>
              <span>{formatDate(profile.createdAt)} tarihinde katıldı</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <p className="text-xs text-ink-muted mt-3 px-2">
            Özel sistemlerin de dahil edilerek gösteriliyor — sadece sen
            görebiliyorsun.
          </p>
        )}

        {builds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-hairline rounded-2xl mt-8">
            <p className="text-ink-muted">
              {isOwner
                ? 'Henüz bir sistem oluşturmadın. Hemen ilk sistemini topla!'
                : 'Bu kullanıcı henüz bir sistem paylaşmamış.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-8">
            {builds.map((build) => (
              <div key={build.id} className="relative">
                {isOwner && !build.isPublic && (
                  <span className="absolute top-3 right-3 z-10 text-xs bg-ink text-paper rounded-full px-2.5 py-1">
                    Özel
                  </span>
                )}
                <BuildCard build={build} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
