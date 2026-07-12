import Navbar from '@/components/Navbar';
import { getFeed } from '@/lib/api';
import BuildCard from '@/components/BuildCard';

export default async function Home() {
  const builds = await getFeed();

  return (
    <main className="min-h-screen bg-paper">
      {/* NAVBAR */}
      <Navbar />

      {/* BAŞLIK */}
      <section className="px-6 md:px-12 pt-10 pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-semibold tracking-tight">
          Topluluk Sistemleri
        </h1>
        <p className="text-ink-muted mt-2">
          {builds.length} sistem paylaşıldı — hepsi uyumluluk kontrolünden
          geçti.
        </p>
      </section>

      {/* FEED */}
      <section className="px-6 md:px-12 pb-24">
        {builds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-hairline rounded-2xl">
            <p className="text-ink-muted">
              Henüz paylaşılan bir sistem yok. İlk sistemi sen topla!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {builds.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
