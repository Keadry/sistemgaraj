import Link from 'next/link';
import type { Build } from '@/lib/api';

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

export default function BuildCard({ build }: { build: Build }) {
  const { cpu, gpu } = getKeyParts(build);

  return (
    <Link
      href={`/sistemler/${build.id}`}
      className="block rounded-2xl border border-hairline bg-paper p-6 hover:border-trace transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              {build.name}
            </h3>
            {build.isFeatured && (
              <span className="text-trace" title="Öne çıkan sistem">
                ★
              </span>
            )}
          </div>
          <p className="text-sm text-ink-muted mt-1">
            {build.user.name ?? 'Anonim'} paylaştı
          </p>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-trace whitespace-nowrap">
          {formatPrice(build.totalPrice)}
        </span>
      </div>

      {(cpu || gpu) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {cpu && (
            <span className="font-[family-name:var(--font-mono)] text-xs bg-surface border border-hairline rounded-full px-3 py-1">
              {cpu.name}
            </span>
          )}
          {gpu && (
            <span className="font-[family-name:var(--font-mono)] text-xs bg-surface border border-hairline rounded-full px-3 py-1">
              {gpu.name}
            </span>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-5 text-sm text-ink-muted">
        <span className="flex items-center gap-1.5">
          <svg
            width="16"
            height="16"
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
            width="16"
            height="16"
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
    </Link>
  );
}
