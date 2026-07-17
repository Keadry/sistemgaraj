'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BuildGallery from '@/components/BuildGallery';
import BuildInteractions from '@/components/BuildInteractions';
import EditPanel from '@/components/EditPanel';
import { useAuth } from '@/lib/auth-context';
import { getBuild, type Build } from '@/lib/api';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default function BuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token, isLoading: isAuthLoading } = useAuth();

  const [build, setBuild] = useState<Build | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  function reload() {
    setIsLoading(true);
    getBuild(id, token)
      .then((data) => {
        setBuild(data.build);
        setIsOwner(data.isOwner);
      })
      .catch(() => setNotFoundError(true))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (isAuthLoading) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, isAuthLoading]);

  if (notFoundError) {
    notFound();
  }

  if (isLoading || isAuthLoading || !build) {
    return (
      <main className="min-h-screen pb-20">
        <Navbar />
        <div className="px-6 md:px-12 py-10">
          <p className="text-ink-muted">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="px-6 md:px-12 py-10 max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-ink-muted hover:text-trace transition-colors"
        >
          ← Tüm sistemler
        </Link>

        {isOwner && build.reviewStatus === 'PENDING' && (
          <div className="mt-4 rounded-xl border border-trace bg-trace/5 px-4 py-3">
            <p className="text-sm text-trace font-medium">
              İncelemede — görsellerin admin tarafından onaylanmasını bekliyor.
              Onaylanana kadar bu sistem sadece sana görünüyor.
            </p>
          </div>
        )}

        {isOwner && build.reviewStatus === 'REJECTED' && (
          <div className="mt-4 rounded-xl border border-incompatible bg-incompatible/5 px-4 py-3">
            <p className="text-sm text-incompatible font-medium">
              Görsellerin reddedildi, bu yüzden sistem yayınlanmadı. Düzenle
              butonuyla yeni görsel yükleyip tekrar gönderebilirsin.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              {build.name}
            </h1>
            <p className="text-ink-muted mt-2">
              <a
                href={`/kullanici/${build.user.username}`}
                className="text-trace hover:underline"
              >
                @{build.user.username}
              </a>{' '}
              tarafından {formatDate(build.createdAt)} tarihinde paylaşıldı
            </p>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-2xl font-semibold text-trace whitespace-nowrap">
            {formatPrice(build.totalPrice)}
          </span>
        </div>

        {build.description && (
          <p className="mt-6 text-ink leading-relaxed">{build.description}</p>
        )}

        {isOwner && (
          <button
            onClick={() => setIsEditing((v) => !v)}
            className="mt-6 rounded-lg border border-hairline px-4 py-2 text-sm font-medium hover:border-trace transition-colors"
          >
            {isEditing ? 'Düzenlemeyi Kapat' : 'Düzenle'}
          </button>
        )}

        {isEditing && (
          <EditPanel
            build={build}
            onDone={() => {
              setIsEditing(false);
              reload();
            }}
            onImagesChanged={reload}
          />
        )}

        <div className="mt-6">
          <BuildGallery images={build.images} />
        </div>

        {/* PARÇA LİSTESİ */}
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
            Parça Listesi
          </h2>
          <div className="rounded-2xl border border-hairline overflow-hidden">
            {build.components.map((bc, i) => {
              const visibleNote =
                isOwner || bc.noteStatus === 'APPROVED' ? bc.note : null;

              return (
                <div
                  key={bc.id}
                  className={`px-5 py-4 ${
                    i !== 0 ? 'border-t border-hairline' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-ink-muted uppercase tracking-wide">
                        {bc.component.type}
                      </span>
                      <p className="font-medium mt-0.5">
                        {bc.component.brand} {bc.component.name}
                      </p>
                    </div>
                    <span className="font-[family-name:var(--font-mono)] text-sm text-ink-muted">
                      {formatPrice(bc.component.price)}
                    </span>
                  </div>
                  {visibleNote && (
                    <p className="text-xs text-ink-muted bg-surface rounded-lg px-3 py-2 mt-2 leading-relaxed">
                      💬 {visibleNote}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <BuildInteractions
          buildId={build.id}
          initialLikes={build.likes}
          initialComments={build.comments}
        />
      </div>
    </main>
  );
}
