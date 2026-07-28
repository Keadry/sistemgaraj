import Navbar from '@/components/Navbar';

export default function KvkkPage() {
  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight mb-8">
          KVKK Aydınlatma Metni
        </h1>

        <div className="prose prose-sm max-w-none text-ink space-y-6 leading-relaxed">
          <p className="text-ink-muted text-sm">
            Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
          </p>

          <section>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
              uyarınca, veri sorumlusu sıfatıyla{' '}
              <span className="text-trace">Bolat Bilgisayar LTD.şti</span>{' '}
              (&quot;SistemGaraj&quot;) olarak, kişisel verilerinizin
              işlenmesine ilişkin sizi bilgilendirmek isteriz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              İşlenen Kişisel Veriler
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kimlik bilgileri: kullanıcı adı</li>
              <li>İletişim bilgileri: e-posta adresi</li>
              <li>
                Görsel veriler: profil/kapak fotoğrafı, paylaşılan sistem
                görselleri
              </li>
              <li>
                İşlem güvenliği bilgileri: şifre (şifrelenmiş olarak), oturum
                bilgileri
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">İşleme Amaçları</h2>
            <p>
              Kişisel verileriniz; hesap oluşturma ve yönetimi, platform
              hizmetlerinin sunulması, topluluk etkileşiminin sağlanması ve
              yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">Hukuki Sebep</h2>
            <p>
              Verileriniz, KVKK m.5/2 kapsamında sözleşmenin kurulması ve ifası
              ile meşru menfaat hukuki sebeplerine dayanılarak işlenmektedir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              KVKK m.11 Kapsamındaki Haklarınız
            </h2>
            <p>
              KVKK&apos;nın 11. maddesi uyarınca kişisel verilerinizin işlenip
              işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,
              işlenme amacını öğrenme, yurt içinde/yurt dışında aktarıldığı
              üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini
              isteme ve KVKK&apos;da öngörülen şartlarda silinmesini/yok
              edilmesini isteme haklarına sahipsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">Başvuru</h2>
            <p>
              Haklarınızı kullanmak için{' '}
              <span className="text-trace">destek@sistemgaraj.com</span>{' '}
              üzerinden bize ulaşabilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
