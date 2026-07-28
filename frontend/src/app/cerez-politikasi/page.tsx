import Navbar from '@/components/Navbar';

export default function CerezPolitikasiPage() {
  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight mb-8">
          Çerez Politikası
        </h1>

        <div className="prose prose-sm max-w-none text-ink space-y-6 leading-relaxed">
          <p className="text-ink-muted text-sm">
            Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
          </p>

          <section>
            <p>
              SistemGaraj, oturum yönetimi için tarayıcınızın{' '}
              <code className="text-xs bg-surface px-1.5 py-0.5 rounded">
                localStorage
              </code>{' '}
              alanında zorunlu teknik veri saklar. Bu, geleneksel anlamda bir
              &quot;çerez&quot; olmasa da benzer bir işleve sahiptir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              Kullandığımız Veriler
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Zorunlu:</strong> Giriş oturum token&apos;ı — hesabınıza
                giriş yapmış kalmanızı sağlar. Bu olmadan siteye giriş
                yapamazsınız.
              </li>
              <li>
                <strong>Zorunlu:</strong> Sistem Topla sayfasındaki taslak
                verisi — yarım bıraktığınız sistem seçimlerini tarayıcınızda
                saklar.
              </li>
              <li>
                <strong>Tercihe bağlı:</strong> Çerez izni tercihiniz — bu
                bildirimi tekrar görmemeniz için tercihinizi hatırlarız.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              Analitik / Takip Çerezleri
            </h2>
            <p>
              Şu anda üçüncü taraf analitik veya reklam takip çerezi
              kullanmıyoruz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">Yönetim</h2>
            <p>
              Tarayıcınızın ayarlarından localStorage verilerini
              temizleyebilirsiniz — ancak bu, oturumunuzun sonlanmasına neden
              olur.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
