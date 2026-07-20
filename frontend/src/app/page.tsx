import { getFeed } from '@/lib/api';
import BuildCard from '@/components/BuildCard';
import Navbar from '@/components/Navbar';
import FeaturedBuildCard from '@/components/FeaturedBuildCard';
import Link from 'next/link';

export default async function Home() {
  const [featuredBuilds, allBuilds] = await Promise.all([
    getFeed({ featured: true }),
    getFeed(),
  ]);

  // Topluluk listesinde öne çıkanları tekrar göstermeyelim
  const featuredIds = new Set(featuredBuilds.map((b) => b.id));
  const communityBuilds = allBuilds.filter((b) => !featuredIds.has(b.id));

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* ÖNERİLEN SİSTEMLER */}
      {featuredBuilds.length > 0 && (
        <section className="px-6 md:px-12 pt-10 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-semibold tracking-tight">
              Önerilen Sistemler
            </h1>
          </div>
          <p className="text-ink-muted mb-6">
            Editör seçimi — SistemGaraj ekibinin öne çıkardığı sistemler.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {' '}
            {featuredBuilds.map((build) => (
              <FeaturedBuildCard key={build.id} build={build} />
            ))}
          </div>
        </section>
      )}

      {/* TOPLULUK SİSTEMLERİ */}
      <section className="px-6 md:px-12 pt-10 pb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-semibold tracking-tight">
            Topluluk Sistemleri
          </h2>
        </div>
        {communityBuilds.length > 8 && (
          <Link
            href="/sistemler"
            className="text-sm text-trace hover:underline whitespace-nowrap shrink-0"
          >
            Tümünü Gör →
          </Link>
        )}
      </section>

      <section className="px-6 md:px-12 pb-24">
        {communityBuilds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-hairline rounded-2xl">
            <p className="text-ink-muted">
              Henüz paylaşılan bir sistem yok. İlk sistemi sen topla!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {communityBuilds.slice(0, 10).map((build) => (
                <BuildCard key={build.id} build={build} />
              ))}
            </div>
            {communityBuilds.length > 8 && (
              <div className="flex justify-center mt-8">
                <Link
                  href="/sistemler"
                  className="rounded-lg border border-hairline px-6 py-2.5 text-sm font-medium hover:border-trace transition-colors"
                >
                  Tüm Sistemleri Gör
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
