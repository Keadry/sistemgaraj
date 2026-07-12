import { getBuild } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BuildInteractions from '@/components/BuildInteractions';

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

export default async function BuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let build;
  try {
    build = await getBuild(id);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper">
      {/* NAVBAR */}
      <Navbar />

      <div className="px-6 md:px-12 py-10 max-w-3xl">
        {/* BAŞLIK */}
        <Link
          href="/"
          className="text-sm text-ink-muted hover:text-trace transition-colors"
        >
          ← Tüm sistemler
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              {build.name}
            </h1>
            <p className="text-ink-muted mt-2">
              {build.user.name ?? 'Anonim'} tarafından{' '}
              {formatDate(build.createdAt)} tarihinde paylaşıldı
            </p>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-2xl font-semibold text-trace whitespace-nowrap">
            {formatPrice(build.totalPrice)}
          </span>
        </div>

        {build.description && (
          <p className="mt-6 text-ink leading-relaxed">{build.description}</p>
        )}

        {/* PARÇA LİSTESİ */}
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
            Parça Listesi
          </h2>
          <div className="rounded-2xl border border-hairline overflow-hidden">
            {build.components.map((bc, i) => (
              <div
                key={bc.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== 0 ? 'border-t border-hairline' : ''
                }`}
              >
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
            ))}
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
