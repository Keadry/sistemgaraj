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
  onSelect,
}: {
  label: string;
  components: Component[];
  selectedId?: string | null;
  selectedIds?: string[];
  multiple?: boolean;
  onSelect: (id: string) => void;
}) {
  const isSelected = (id: string) =>
    multiple ? (selectedIds ?? []).includes(id) : id === selectedId;

  return (
    <div>
      {label && (
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          {label}
        </h3>
      )}
      {components.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Mevcut seçimlerinle uyumlu parça bulunamadı.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {components.map((component) => {
            const selected = isSelected(component.id);
            return (
              <button
                key={component.id}
                type="button"
                onClick={() => onSelect(component.id)}
                className={`text-left rounded-xl border p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
                  selected
                    ? 'border-trace bg-trace/5'
                    : 'border-hairline hover:border-ink-muted'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-snug">
                    {component.brand} {component.name}
                  </p>
                  {selected && (
                    <span className="text-trace shrink-0 mt-0.5">✓</span>
                  )}
                </div>
                <p className="font-[family-name:var(--font-mono)] text-xs text-ink-muted mt-1.5">
                  {getSpecLine(component)}
                </p>
                <p className="font-[family-name:var(--font-mono)] text-sm font-semibold mt-2">
                  {formatPrice(component.price)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
