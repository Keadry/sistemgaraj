import Navbar from '@/components/Navbar';

export default function KullanimKosullariPage() {
  return (
    <main className="min-h-screen pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight mb-8">
          Kullanım Koşulları
        </h1>

        <div className="prose prose-sm max-w-none text-ink space-y-6 leading-relaxed">
          <p className="text-ink-muted text-sm">
            Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
          </p>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">1. Kabul</h2>
            <p>
              SistemGaraj&apos;a kayıt olarak veya platformu kullanarak bu
              kullanım koşullarını kabul etmiş sayılırsınız.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              2. Kullanıcı Yükümlülükleri
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Doğru ve güncel bilgilerle kayıt olmayı kabul edersiniz.</li>
              <li>
                Yasa dışı, hakaret içeren, uygunsuz veya başkalarının haklarını
                ihlal eden içerik paylaşmamayı kabul edersiniz.
              </li>
              <li>
                Yüklediğiniz görsellerin telif hakkına sahip olduğunuzu veya
                paylaşma yetkiniz olduğunu beyan edersiniz.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              3. İçerik Moderasyonu
            </h2>
            <p>
              Paylaşılan içerikler (yorumlar, görseller, sistemler) topluluk
              kurallarına aykırılık durumunda moderatörler tarafından
              incelenebilir, reddedilebilir veya kaldırılabilir. Kural ihlali
              tekrarı durumunda hesabınız geçici olarak susturulabilir veya
              kalıcı olarak askıya alınabilir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              4. Sorumluluk Reddi
            </h2>
            <p>
              SistemGaraj&apos;daki uyumluluk kontrolü, mevcut ürün verilerine
              dayalı otomatik bir kontrol mekanizmasıdır ve kesin bir garanti
              teşkil etmez. Satın alma kararlarınızı vermeden önce ilgili
              ürünlerin resmi teknik özelliklerini doğrulamanızı öneririz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">
              5. Değişiklikler
            </h2>
            <p>
              Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişiklikler
              olması durumunda sizi bilgilendireceğiz.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">6. İletişim</h2>
            <p>
              Sorularınız için:{' '}
              <span className="text-trace">destek@sistemgarah.com</span>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
