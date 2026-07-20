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
    <Link
      href={`/sistemler/${build.id}`}
      className="group block rounded-2xl overflow-hidden relative border-2 border-trace/30 bg-paper hover:border-trace transition-colors shadow-sm hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
    >
      <div className="aspect-[4/3] bg-surface relative overflow-hidden">
        <BuildImage imageUrl={mainImage?.url ?? null} />

        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-ink/0 opacity-0 group-hover:opacity-100 transition-opacity" />

        <span className="absolute top-3 left-3 flex items-center gap-1 text-[11px] font-semibold bg-trace text-paper rounded-full px-2.5 py-1 shadow-sm">
          ★ Önerilen
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight leading-snug">
            {build.name}
          </h3>
          <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-trace whitespace-nowrap shrink-0">
            {formatPrice(build.totalPrice)}
          </span>
        </div>

        <p className="text-xs text-ink-muted mt-1">@{build.user.username}</p>

        {(cpu || gpu) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cpu && (
              <span className="text-[11px] bg-trace/10 text-trace rounded-full px-2.5 py-1 font-medium">
                {cpu.name}
              </span>
            )}
            {gpu && (
              <span className="text-[11px] bg-trace/10 text-trace rounded-full px-2.5 py-1 font-medium">
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
