'use client';

import type { Component } from '@/lib/api';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

function getSpecLine(component: Component): string {
  const parts = [
    component.socket,
    component.ramType,
    component.wattage ? `${component.wattage}W` : null,
    component.formFactor,
  ].filter(Boolean);
  return parts.join(' · ');
}

export default function ComponentPicker({
  label,
  components,
  selectedId,
  selectedIds,
  multiple = false,
  incompatibleReasons,
  onSelect,
}: {
  label: string;
  components: Component[];
  selectedId?: string | null;
  selectedIds?: string[];
  multiple?: boolean;
  /** Parça id'si → uyumsuzluk sebebi. Haritada olmak uyumsuz olmak demektir. */
  incompatibleReasons?: Map<string, string>;
  onSelect: (id: string) => void;
}) {
  const isSelected = (id: string) =>
    multiple ? (selectedIds ?? []).includes(id) : id === selectedId;

  const reasonFor = (id: string) => incompatibleReasons?.get(id) ?? null;

  // Uyumsuzları listeden çıkarmıyoruz ama seçilebilir olanları da onların
  // arkasına gömmüyoruz — uyumsuzlar sona iner, kendi aralarındaki sıra korunur.
  const compatible = components.filter((c) => !reasonFor(c.id));
  const incompatible = components.filter((c) => reasonFor(c.id));
  const ordered = [...compatible, ...incompatible];

  return (
    <div>
      {label && (
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          {label}
        </h3>
      )}
      {components.length === 0 ? (
        <p className="text-xs text-ink-muted">Bu kategoride parça bulunamadı.</p>
      ) : (
        <>
          {incompatible.length > 0 && (
            <p className="text-xs text-ink-muted mb-3">
              {incompatible.length} parça mevcut seçimlerinle uyumsuz — nedeni
              kartların üstünde yazıyor.
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ordered.map((component) => {
              const selected = isSelected(component.id);
              const reason = reasonFor(component.id);

              return (
                <button
                  key={component.id}
                  type="button"
                  disabled={reason !== null}
                  onClick={() => onSelect(component.id)}
                  className={`text-left rounded-xl border p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                    reason
                      ? 'border-hairline bg-surface/50 cursor-not-allowed'
                      : selected
                        ? 'border-trace bg-trace/5'
                        : 'border-hairline hover:border-ink-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`font-medium text-sm leading-snug ${
                        reason ? 'text-ink-muted' : ''
                      }`}
                    >
                      {component.brand} {component.name}
                    </p>
                    {selected && (
                      <span className="text-trace shrink-0 mt-0.5">✓</span>
                    )}
                  </div>
                  <p className="font-[family-name:var(--font-mono)] text-xs text-ink-muted mt-1.5">
                    {getSpecLine(component)}
                  </p>
                  <p
                    className={`font-[family-name:var(--font-mono)] text-sm font-semibold mt-2 ${
                      reason ? 'text-ink-muted' : ''
                    }`}
                  >
                    {formatPrice(component.price)}
                  </p>
                  {reason && (
                    <p className="text-xs text-incompatible font-medium leading-snug mt-2 pt-2 border-t border-hairline">
                      {reason}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
