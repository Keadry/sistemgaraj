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

  const featuredIds = new Set(featuredBuilds.map((b) => b.id));
  const communityBuilds = allBuilds.filter((b) => !featuredIds.has(b.id));

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        {/* HERO SECTION */}
        <section className="pt-10 pb-8 md:pt-14 md:pb-12 border-b border-hairline/60">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trace/10 border border-trace/20 text-trace text-xs font-semibold tracking-wide shadow-sm">
                <span className="w-2 h-2 rounded-full bg-trace animate-pulse" />
                SistemGaraj
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-extrabold tracking-tight text-ink leading-[1.15]">
                Hayalindeki Sistemi <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-trace to-trace-dark bg-clip-text text-transparent">
                  Keşfet & Topla
                </span>
              </h1>
              <p className="text-ink-muted text-sm md:text-base max-w-xl font-normal">
                Geliştiriciler ve oyuncular için hazırlanmış performansı yüksek,
                özenle seçilmiş ve topluluk onaylı PC sistemleri.
              </p>
            </div>

            <div className="flex items-center gap-6 bg-paper/70 backdrop-blur-md p-4 rounded-2xl border border-hairline shadow-sm shrink-0">
              <div>
                <div className="text-2xl font-bold text-ink font-mono tracking-tight">
                  {allBuilds.length}+
                </div>
                <div className="text-xs text-ink-muted font-medium">
                  Paylaşılan Sistem
                </div>
              </div>
              <div className="h-8 w-px bg-hairline" />
              <div>
                <div className="text-2xl font-bold text-trace font-mono tracking-tight">
                  {featuredBuilds.length}
                </div>
                <div className="text-xs text-ink-muted font-medium">
                  Editör Seçimi
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ÖNERİLEN SİSTEMLER */}
        {featuredBuilds.length > 0 && (
          <section className="pt-10 pb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-trace shadow-sm shadow-trace/50" />
                  <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-bold tracking-tight text-ink">
                    Önerilen Sistemler
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-ink-muted">
                  Editör seçimi — SistemGaraj ekibinin öne çıkardığı sistemler.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featuredBuilds.map((build) => (
                <div
                  key={build.id}
                  className="transition-transform duration-200 hover:-translate-y-1"
                >
                  <FeaturedBuildCard build={build} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TOPLULUK SİSTEMLERİ */}
        <section className="pt-8 pb-24">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-bold tracking-tight text-ink">
                Topluluk Sistemleri
              </h2>
              <p className="text-xs md:text-sm text-ink-muted mt-0.5">
                Topluluk üyeleri tarafından paylaşılan konfigürasyonlar.
              </p>
            </div>
            {communityBuilds.length > 10 && (
              <Link
                href="/sistemler"
                className="group inline-flex items-center gap-1 text-sm font-semibold text-trace hover:text-trace-dark transition-colors whitespace-nowrap shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                Tümünü Gör
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            )}
          </div>

          {communityBuilds.length === 0 ? (
            <div className="text-center py-16 px-4 bg-paper/60 backdrop-blur-sm border-2 border-dashed border-hairline rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-trace/10 border border-trace/20 text-trace flex items-center justify-center mx-auto text-xl shadow-sm">
                🖥️
              </div>
              <p className="text-ink font-medium text-base">
                Henüz paylaşılan bir sistem yok.
              </p>
              <p className="text-ink-muted text-sm max-w-sm mx-auto">
                İlk sistemi sen topla ve toplulukta öne çık!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {communityBuilds.slice(0, 10).map((build) => (
                  <BuildCard key={build.id} build={build} />
                ))}
              </div>

              {communityBuilds.length > 10 && (
                <div className="flex justify-center mt-12">
                  <Link
                    href="/sistemler"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-paper hover:bg-trace/5 text-ink hover:text-trace border border-hairline hover:border-trace/40 font-medium text-sm transition-all shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
                  >
                    Tüm Sistemleri Gör
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
