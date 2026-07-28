import Navbar from '@/components/Navbar';

export default function GizlilikPolitikasiPage() {
  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight mb-8">
          Gizlilik Politikası
        </h1>

        <div className="prose prose-sm max-w-none text-ink space-y-6 leading-relaxed">
          <p className="text-ink-muted text-sm">
            Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
          </p>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              1. Toplanan Bilgiler
            </h2>
            <p>
              SistemGaraj (&quot;biz&quot;, &quot;platform&quot;) olarak,
              hesabınızı oluşturduğunuzda e-posta adresinizi ve kullanıcı
              adınızı; profilinizi düzenlediğinizde profil fotoğrafı ve kapak
              fotoğrafınızı; sistem paylaşırken oluşturduğunuz içerikleri
              (sistem bilgileri, görseller, yorumlar) topluyoruz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              2. Bilgilerin Kullanımı
            </h2>
            <p>
              Topladığımız bilgileri yalnızca platformun temel işlevlerini
              (hesap yönetimi, içerik paylaşımı, topluluk etkileşimi) sağlamak
              amacıyla kullanırız. Bilgileriniz üçüncü taraflarla pazarlama
              amacıyla paylaşılmaz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">3. Çerezler</h2>
            <p>
              Oturumunuzu açık tutmak için tarayıcınızda zorunlu teknik veri
              (giriş token&apos;ı) saklarız. Detaylar için{' '}
              <a
                href="/cerez-politikasi"
                className="text-trace hover:underline"
              >
                Çerez Politikamıza
              </a>{' '}
              bakabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              4. Veri Güvenliği
            </h2>
            <p>
              Şifreleriniz geri döndürülemez şekilde şifrelenerek (hash)
              saklanır. Yüklediğiniz görseller sunucumuzda güvenli şekilde
              tutulur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">5. Haklarınız</h2>
            <p>
              Hesabınızı ve ilişkili verilerinizi istediğiniz zaman profil
              ayarlarınızdan silebilir, veya bizimle{' '}
              <span className="text-trace">destek@sistemgaraj.com</span>{' '}
              üzerinden iletişime geçerek verilerinizin silinmesini talep
              edebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">6. İletişim</h2>
            <p>
              Bu politika hakkında sorularınız için:{' '}
              <span className="text-trace">SistemGaraj</span>,{' '}
              <span className="text-trace">İstanbul / Pendik</span>,{' '}
              <span className="text-trace">destek@sistemgaraj.com</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
