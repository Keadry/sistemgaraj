import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-hairline mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="text-xs text-ink-muted mt-3 leading-relaxed">
              Türkçe PC parça uyumluluk kontrolü ve topluluk platformu.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">
              Keşfet
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link
                  href="/sistemler"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  Tüm Sistemler
                </Link>
              </li>
              <li>
                <Link
                  href="/sistem-topla"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  Sistem Topla
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">
              Yasal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/gizlilik-politikasi"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/kvkk"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  KVKK Aydınlatma Metni
                </Link>
              </li>
              <li>
                <Link
                  href="/cerez-politikasi"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  Çerez Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/kullanim-kosullari"
                  className="text-ink-muted hover:text-trace transition-colors"
                >
                  Kullanım Koşulları
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">
              İletişim
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="text-ink-muted">destek@sistemgaraj.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} SistemGaraj. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}
