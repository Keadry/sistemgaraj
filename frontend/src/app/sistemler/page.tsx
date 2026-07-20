'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import BuildCard from '@/components/BuildCard';
import { getFeed, type Build } from '@/lib/api';

export default function TumSistemlerPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeed()
      .then((data) => {
        // Öne çıkan sistemler en başta, geri kalanı tarihe göre (zaten backend sıralı) devam eder
        const sorted = [...data].sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });
        setBuilds(sorted);
      })
      .catch(() => setError('Sistemler yüklenirken bir hata oluştu.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Tüm Sistemler
        </h1>
        <p className="text-ink-muted mt-2">
          {builds.length} sistem paylaşıldı — hepsi uyumluluk kontrolünden
          geçti.
        </p>

        {isLoading ? (
          <p className="text-ink-muted mt-8">Yükleniyor...</p>
        ) : error ? (
          <p className="text-incompatible mt-8">{error}</p>
        ) : builds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-hairline rounded-2xl mt-8">
            <p className="text-ink-muted">
              Henüz paylaşılan bir sistem yok. İlk sistemi sen topla!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-8">
            {builds.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
