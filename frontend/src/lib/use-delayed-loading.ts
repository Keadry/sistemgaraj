'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Yükleme göstergelerinin göz kırpması gibi geçip gitmesini engeller.
 *
 * Sorun: istek 200ms'de bitince "Yükleniyor..." yazısı belirip hemen kayboluyor.
 * Kullanıcı onu okuyamıyor, sadece bir şeyin titrediğini görüyor — bilgi
 * vermeyen, rahatsız edici bir hareket.
 *
 * Çözüm iki kurallı:
 *   1. `delay` dolmadan gösterme. Hızlı istekler hiç gösterge açmaz.
 *   2. Bir kere gösterildiyse en az `minDuration` kadar ekranda kalsın.
 *      Yoksa 260ms'de biten bir istekte gösterge yine 10ms görünüp kaybolur.
 *
 * Dönen değer sadece *görsel* göstergeyi kontrol eder. Butonu devre dışı
 * bırakmak gibi işlevsel şeyler için ham `isLoading` kullanılmalı — çift
 * gönderim koruması ilk milisaniyeden itibaren aktif olmalı.
 */
export function useDelayedLoading(
  isLoading: boolean,
  delay = 250,
  minDuration = 500,
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        // Effect `isVisible` değişince tekrar çalışır; zaten görünürken
        // shownAt'i ileri kaydırıp minDuration'ı uzatmayalım.
        if (shownAt.current === null) shownAt.current = Date.now();
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timeout);
    }

    if (!isVisible) return;

    const elapsed = Date.now() - (shownAt.current ?? 0);
    const timeout = setTimeout(
      () => {
        shownAt.current = null;
        setIsVisible(false);
      },
      Math.max(0, minDuration - elapsed),
    );
    return () => clearTimeout(timeout);
  }, [isLoading, isVisible, delay, minDuration]);

  return isVisible;
}
