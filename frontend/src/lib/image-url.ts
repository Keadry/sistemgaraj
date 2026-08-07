const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Veritabanındaki görsel referansını görüntülenebilir bir adrese çevirir.
 *
 * İki biçim bir arada bulunabiliyor:
 *   - `/uploads/abc.webp` — Supabase'e geçmeden önce yüklenmiş, API sunucusu
 *     tarafından servis edilen yerel dosyalar. Ayrıca Supabase değişkenleri
 *     tanımlı değilken yerel geliştirmede hâlâ bu biçim üretiliyor.
 *   - `https://...` — Supabase Storage'ın mutlak genel adresi.
 *
 * İkisini de desteklemek şart: geçiş sırasında eski satırlar olduğu gibi
 * kalıyor, tek tek taşınmıyor. Mutlak adrese API kökünü eklemek
 * `http://localhost:4000https://...` gibi bozuk bir adres üretirdi.
 */
export function imageUrl(reference: string | null | undefined): string {
  if (!reference) return '';
  if (reference.startsWith('http')) return reference;
  return `${API_URL}${reference}`;
}
