import { ViewTransition } from 'react';
import Link from 'next/link';
import type { Build } from '@/lib/api';
import BuildImage from './BuildImage';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

function getKeyParts(build: Build) {
  const findByType = (type: string) =>
    build.components.find((bc) => bc.component.type === type)?.component;

  return {
    cpu: findByType('CPU'),
    gpu: findByType('GPU'),
  };
}

export default function FeaturedBuildCard({ build }: { build: Build }) {
  const { cpu, gpu } = getKeyParts(build);
  const mainImage =
    build.images.find((img) => img.isMain && img.status === 'APPROVED') ??
    build.images.find((img) => img.status === 'APPROVED') ??
    null;

  return (
    // Sıradan kartla aynı hareket dili; ayrımı mor kenarlık taşıyor.
    // Önceden `transition-colors` vardı, yani kalkış ve gölge animasyonsuzdu
    // ve iki kart yan yana durduğunda farklı ritimde tepki veriyorlardı.
    <Link
      href={`/sistemler/${build.id}`}
      className="trace-edge group relative block rounded-2xl overflow-hidden border border-trace/40 bg-paper hover:border-trace hover:shadow-lg hover:shadow-trace/10 hover:-translate-y-px transition-[transform,border-color,box-shadow] duration-200 ease-trace focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
    >
      <ViewTransition name={`build-image-${build.id}`}>
        <div className="aspect-[4/3] bg-surface relative overflow-hidden">
          <BuildImage imageUrl={mainImage?.url ?? null} />

          {/* `scrim`, `ink` değil: perde fotoğrafın üstünde duruyor ve
              fotoğraf temayla değişmiyor. `ink` kullanıldığında karanlık
              temada karartma yerine beyaz bir yıkama oluyordu. */}
          <div className="absolute inset-0 bg-gradient-to-t from-scrim/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-trace" />

          <span className="absolute top-3 left-3 flex items-center gap-1 text-[11px] font-semibold bg-trace text-paper rounded-full px-2.5 py-1 shadow-sm">
            ★ Öne Çıkan
          </span>
        </div>
      </ViewTransition>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight leading-snug text-ink group-hover:text-trace transition-colors line-clamp-1">
            {build.name}
          </h3>
          <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-trace whitespace-nowrap shrink-0">
            {formatPrice(build.totalPrice)}
          </span>
        </div>

        <p className="text-xs text-ink-muted mt-1">@{build.user.username}</p>

        {/* Yuvarlak mor haplar yerine teknik künye: tezgah dilinde parça
            adları veri gibi görünüyor, etiket gibi değil. */}
        {(cpu || gpu) && (
          <div className="mt-3 flex flex-wrap gap-1.5 font-[family-name:var(--font-mono)]">
            {cpu && (
              <span className="text-[10px] text-ink-muted border border-hairline rounded-md px-2 py-1 truncate max-w-full">
                {cpu.name}
              </span>
            )}
            {gpu && (
              <span className="text-[10px] text-ink-muted border border-hairline rounded-md px-2 py-1 truncate max-w-full">
                {gpu.name}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted pt-3 border-t border-hairline">
          <span className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {build.likes.length}
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            {build.comments.length}
          </span>
        </div>
      </div>
    </Link>
  );
}
