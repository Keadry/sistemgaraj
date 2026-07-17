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

export default function LiveSidebar({
  selectedComponents,
}: {
  selectedComponents: Component[];
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
    <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-zinc-900">
          Mevcut Seçimlerin
        </h3>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
          {selectedComponents.length} Parça
        </span>
      </div>

      {selectedComponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
          <p className="text-xs font-medium text-zinc-400">
            Henüz parça seçimi yapmadın.
          </p>
          <p className="text-[11px] text-zinc-400/80 mt-0.5">
            Listeden bileşen ekleyerek başlayabilirsin.
          </p>
        </div>
      ) : (
        /* scrollbar-none ile kaydırma çubuğu gizlendi */
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedComponents.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/40 hover:border-zinc-200 transition-all duration-200 group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold font-[family-name:var(--font-mono)]">
                  {LABELS[c.type] ?? c.type}
                </p>
                <p className="text-xs font-semibold text-zinc-800 truncate mt-0.5 group-hover:text-zinc-950 transition-colors">
                  {c.brand} <span className="font-normal">{c.name}</span>
                </p>
              </div>
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-zinc-700 bg-white px-2 py-1 rounded-lg border border-zinc-200/60 shadow-2xs shrink-0">
                {formatPrice(c.price)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Toplam Bilgi Alanı */}
      <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Maliyet
        </span>
        <span className="font-[family-name:var(--font-mono)] text-lg font-extrabold text-zinc-900 tracking-tight">
          {formatPrice(totalPrice)}
        </span>
      </div>

      {/* Dinamik PSU Güç Durumu Kartı */}
      {psuStatus && (
        <div
          className={`mt-4 rounded-xl p-3 border text-xs transition-all duration-300 ${
            psuStatus === 'error'
              ? 'border-rose-200 text-rose-600 bg-rose-50/50'
              : psuStatus === 'warning'
                ? 'border-amber-200 text-amber-600 bg-amber-50/50'
                : 'border-emerald-200 text-emerald-600 bg-emerald-50/50'
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
