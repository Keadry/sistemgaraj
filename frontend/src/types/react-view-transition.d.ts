import type { ComponentType, ReactNode } from 'react';

/**
 * `<ViewTransition>` React'in canary/experimental kanalında bulunuyor.
 * `experimental.viewTransition` açıkken Next `react` importlarını kendi
 * paketlediği experimental sürüme yönlendiriyor, dolayısıyla bileşen çalışma
 * anında mevcut — ama projede kurulu olan kararlı `react@19.2.4` tipleri onu
 * bilmiyor ve TypeScript "no exported member" diyor.
 *
 * Bu bildirim tip tarafındaki boşluğu kapatıyor. React kararlı sürümde
 * `ViewTransition`ı yayınladığında dosya silinebilir — kendi tipleri devreye
 * girer ve burası gereksizleşir.
 */
declare module 'react' {
  export const ViewTransition: ComponentType<{
    /** Eski ve yeni sayfadaki karşılıkları eşleştiren ad. Aynı anda ekranda
     *  yalnızca bir eleman bu adı taşıyabilir. */
    name?: string;
    children?: ReactNode;
  }>;
}
