import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    /* React'in <ViewTransition> bileşenini açar. Rota değişimleri Next'te
       birer transition olduğu için, işaretlenmiş elemanlar gezinme sırasında
       kendiliğinden animasyona giriyor.

       Tarayıcı desteklemiyorsa uygulama normal çalışır, yalnızca geçiş
       animasyonu olmaz — yani bu bir ilerlemeli iyileştirme. */
    viewTransition: true,
  },
};

export default nextConfig;
