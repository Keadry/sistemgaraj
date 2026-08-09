/**
 * Parça türlerinin görünen adları.
 *
 * `ComponentType` enum'u veritabanında İngilizce (`CPU`, `PSU`); arayüzde
 * hiçbir yerde ham haliyle gösterilmemesi gerekiyor. Bilinmeyen bir tür
 * gelirse kendi kodu dönüyor — yeni bir parça türü eklendiğinde ekranda boş
 * bir yer değil, en azından tanınabilir bir şey görünsün.
 */
const COMPONENT_LABELS: Record<string, string> = {
  CPU: 'İşlemci',
  MOTHERBOARD: 'Anakart',
  RAM: 'RAM',
  GPU: 'Ekran Kartı',
  PSU: 'Güç Kaynağı',
  STORAGE: 'Depolama',
  CASE: 'Kasa',
  COOLER: 'Soğutucu',
};

export function componentTypeLabel(type: string): string {
  return COMPONENT_LABELS[type] ?? type;
}
