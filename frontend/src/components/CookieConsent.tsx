'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'sistemgaraj_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] bg-ink text-paper px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-paper/80 flex-1">
          Sitemizde deneyimini iyileştirmek için oturum bilgilerini (giriş
          durumu, tercihlerin) tarayıcında saklıyoruz. Devam ederek{' '}
          <a href="/cerez-politikasi" className="underline hover:text-paper">
            Çerez Politikası
          </a>
          &apos;nı kabul etmiş olursun.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="text-sm text-paper/70 hover:text-paper transition-colors px-3 py-2"
          >
            Reddet
          </button>
          <button
            onClick={accept}
            className="text-sm font-medium bg-trace text-paper px-4 py-2 rounded-xl hover:bg-trace-dark transition-colors"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
