'use client';

import type { Component } from '@/lib/api';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

const LABELS: Record<string, string> = {
  CPU: 'İşlemci',
  MOTHERBOARD: 'Anakart',
  RAM: 'RAM',
  GPU: 'Ekran Kartı',
  PSU: 'Güç Kaynağı',
  STORAGE: 'Depolama',
  CASE: 'Kasa',
};

// Kapsayıcının görünümünü çağıran belirler: masaüstünde sağ sütunda duran bir
// kart, mobilde alttan açılan sayfanın içi. Konumlandırma (sticky vb.) da
// çağıranın işi — burada tutulursa iki kullanım birbirini eziyor.
const DEFAULT_SHELL = 'rounded-2xl border border-hairline bg-paper p-5 shadow-sm';

export default function LiveSidebar({
  selectedComponents,
  className = DEFAULT_SHELL,
}: {
  selectedComponents: Component[];
  className?: string;
}) {
  const totalPrice = selectedComponents.reduce((sum, c) => sum + c.price, 0);

  const cpu = selectedComponents.find((c) => c.type === 'CPU');
  const gpu = selectedComponents.find((c) => c.type === 'GPU');
  const psu = selectedComponents.find((c) => c.type === 'PSU');

  let psuStatus: 'ok' | 'warning' | 'error' | null = null;
  let psuMessage = '';

  if (psu && (cpu || gpu)) {
    const required = (cpu?.wattage ?? 0) + (gpu?.wattage ?? 0) + 100;
    const recommended = Math.ceil(required * 1.2);

    if (psu.wattage! < required) {
      psuStatus = 'error';
      psuMessage = `Sistem ~${required}W çekiyor, PSU ${psu.wattage}W sağlıyor.`;
    } else if (psu.wattage! < recommended) {
      psuStatus = 'warning';
      psuMessage = `Sınırda — güvenli pay için ${recommended}W önerilir (mevcut: ${psu.wattage}W).`;
    } else {
      psuStatus = 'ok';
      psuMessage = `~${required}W ihtiyaç, ${psu.wattage}W sağlanıyor.`;
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-ink">
          Mevcut Seçimlerin
        </h3>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-muted">
          {selectedComponents.length} Parça
        </span>
      </div>

      {selectedComponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-hairline rounded-xl bg-surface/50">
          <p className="text-xs font-medium text-ink-muted">
            Henüz parça seçimi yapmadın.
          </p>
          <p className="text-[11px] text-ink-muted/80 mt-0.5">
            Listeden bileşen ekleyerek başlayabilirsin.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedComponents.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-hairline bg-surface/40 hover:border-trace/40 transition-all duration-200 group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold font-[family-name:var(--font-mono)]">
                  {LABELS[c.type] ?? c.type}
                </p>
                <p className="text-xs font-semibold text-ink truncate mt-0.5 group-hover:text-trace transition-colors">
                  {c.brand} <span className="font-normal">{c.name}</span>
                </p>
              </div>
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-ink bg-paper px-2 py-1 rounded-lg border border-hairline shadow-sm shrink-0">
                {formatPrice(c.price)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-hairline flex items-center justify-between">
        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
          Maliyet
        </span>
        <span className="font-[family-name:var(--font-mono)] text-lg font-extrabold text-trace tracking-tight">
          {formatPrice(totalPrice)}
        </span>
      </div>

      {psuStatus && (
        <div
          className={`mt-4 rounded-xl p-3 border text-xs transition-all duration-300 ${
            psuStatus === 'error'
              ? 'border-incompatible/30 text-incompatible bg-incompatible/5'
              : psuStatus === 'warning'
                ? 'border-trace/30 text-trace bg-trace/5'
                : 'border-compatible/30 text-compatible bg-compatible/5'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[10px]">
            <span>
              {psuStatus === 'error'
                ? '🛑 PSU Yetersiz'
                : psuStatus === 'warning'
                  ? '⚠️ PSU Sınırda'
                  : '✅ PSU Dengesi Uygun'}
            </span>
          </div>
          <p className="mt-1.5 font-medium leading-relaxed opacity-95">
            {psuMessage}
          </p>
        </div>
      )}
    </div>
  );
}
