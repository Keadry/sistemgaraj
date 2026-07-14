'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import { useAuth } from '@/lib/auth-context';
import { getMyBuilds, type Build } from '@/lib/api';

export default function ProfilimPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/giris');
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    getMyBuilds(token)
      .then(setBuilds)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isAuthLoading || !user) return null;

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Sistemlerim
        </h1>
        <p className="text-ink-muted mt-2">
          {builds.length} sistem — herkese açık ve özel sistemlerin burada.
        </p>

        {isLoading ? (
          <p className="text-ink-muted mt-8">Yükleniyor...</p>
        ) : error ? (
          <p className="text-incompatible mt-8">{error}</p>
        ) : builds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-hairline rounded-2xl mt-8">
            <p className="text-ink-muted">
              Henüz bir sistem oluşturmadın. Hemen ilk sistemini topla!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-8">
            {builds.map((build) => (
              <div key={build.id} className="relative">
                {!build.isPublic && (
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
