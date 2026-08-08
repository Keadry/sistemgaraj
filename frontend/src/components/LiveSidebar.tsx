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

/* Zincirin sırası. `sistem-topla` sayfasındaki STEP_ORDER ile aynı: kullanıcı
   akordeonlarda hangi sırayla ilerliyorsa özet de o sırayı gösteriyor, yoksa
   iki liste birbirini tutmuyor gibi okunuyor. */
const SLOT_ORDER = [
  'CPU',
  'MOTHERBOARD',
  'RAM',
  'GPU',
  'PSU',
  'STORAGE',
  'CASE',
] as const;

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

  /* Parça sayısı değil yuva sayısı: dört RAM çubuğu seçmek "4 parça" ama tek
     yuva. Kullanıcının merak ettiği şey sistemin ne kadarının tamamlandığı. */
  const filledSlotCount = SLOT_ORDER.filter((type) =>
    selectedComponents.some((c) => c.type === type),
  ).length;

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-ink">
          Mevcut Seçimlerin
        </h3>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-muted font-[family-name:var(--font-mono)]">
          {filledSlotCount} / {SLOT_ORDER.length}
        </span>
      </div>

      {/* Yedi yuvanın hepsi listede: eskiden yalnızca seçilenler görünüyordu,
          dolayısıyla neyin eksik olduğunu görmek için akordeonları tek tek
          açmak gerekiyordu. Dolu yuvalar mor izle bağlanıyor, boşlar kesikli
          kalıyor — zincir tamamlandıkça görünür oluyor. */}
      <ol className="max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {SLOT_ORDER.map((type, index) => {
          const parts = selectedComponents.filter((c) => c.type === type);
          const isFilled = parts.length > 0;
          const isLast = index === SLOT_ORDER.length - 1;

          return (
            <li key={type} className="relative pl-6 pb-3.5 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[5px] top-4 bottom-0 border-l transition-colors duration-200 ${
                    isFilled ? 'border-trace' : 'border-dashed border-hairline'
                  }`}
                />
              )}

              <span
                aria-hidden="true"
                className={`absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2 transition-[background-color,border-color,transform] duration-200 ease-snap ${
                  isFilled
                    ? 'border-trace bg-trace scale-100'
                    : 'border-hairline bg-paper scale-90'
                }`}
              />

              <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold font-[family-name:var(--font-mono)]">
                {LABELS[type] ?? type}
              </p>

              {isFilled ? (
                parts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-baseline justify-between gap-2 mt-0.5"
                  >
                    <span className="text-xs font-semibold text-ink truncate">
                      {c.brand} <span className="font-normal">{c.name}</span>
                    </span>
                    <span className="text-[11px] font-bold font-[family-name:var(--font-mono)] text-ink-muted shrink-0">
                      {formatPrice(c.price)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink-muted/70 mt-0.5">seçilmedi</p>
              )}
            </li>
          );
        })}
      </ol>

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
