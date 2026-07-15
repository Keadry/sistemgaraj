'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ComponentPicker from './ComponentPicker';
import {
  getComponents,
  submitEditRequest,
  type Build,
  type Component,
  type EditRequestNoteInput,
  type CompatibilityIssue,
} from '@/lib/api';

const CATEGORIES: { type: string; label: string; key: string }[] = [
  { type: 'CPU', label: 'İşlemci (CPU)', key: 'cpuId' },
  { type: 'MOTHERBOARD', label: 'Anakart', key: 'motherboardId' },
  { type: 'RAM', label: 'RAM', key: 'ramId' },
  { type: 'GPU', label: 'Ekran Kartı', key: 'gpuId' },
  { type: 'PSU', label: 'Güç Kaynağı', key: 'psuId' },
  { type: 'CASE', label: 'Kasa', key: 'caseId' },
];

const FORM_FACTOR_SIZE: Record<string, number> = {
  'Mini-ITX': 1,
  'Micro-ATX': 2,
  ATX: 3,
};

type Selection = Record<string, string>;

function isCompatible(
  component: Component,
  selection: Selection,
  components: Component[],
): boolean {
  const byId = (id: string | undefined) =>
    id ? (components.find((c) => c.id === id) ?? null) : null;

  const cpu = byId(selection.cpuId);
  const motherboard = byId(selection.motherboardId);
  const ram = byId(selection.ramId);
  const pcCase = byId(selection.caseId);

  if (component.type === 'CPU' && motherboard) {
    if (component.socket !== motherboard.socket) return false;
  }

  if (component.type === 'MOTHERBOARD') {
    if (cpu && component.socket !== cpu.socket) return false;
    if (ram && component.ramType !== ram.ramType) return false;
    if (pcCase && component.formFactor && pcCase.formFactor) {
      if (
        FORM_FACTOR_SIZE[component.formFactor] >
        FORM_FACTOR_SIZE[pcCase.formFactor]
      )
        return false;
    }
  }

  if (component.type === 'RAM' && motherboard) {
    if (component.ramType !== motherboard.ramType) return false;
  }

  if (component.type === 'CASE' && motherboard) {
    if (component.formFactor && motherboard.formFactor) {
      if (
        FORM_FACTOR_SIZE[motherboard.formFactor] >
        FORM_FACTOR_SIZE[component.formFactor]
      )
        return false;
    }
  }

  return true;
}

export default function EditPanel({
  build,
  onDone,
}: {
  build: Build;
  onDone: () => void;
}) {
  const { token } = useAuth();

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [selection, setSelection] = useState<Selection>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [description, setDescription] = useState(build.description ?? '');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<CompatibilityIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    getComponents()
      .then((all) => {
        setComponents(all);

        // Başlangıçta mevcut parçaları seçili göster
        const initial: Selection = {};
        for (const cat of CATEGORIES) {
          const current = build.components.find(
            (bc) => bc.component.type === cat.type,
          );
          if (current) initial[cat.key] = current.component.id;
        }
        setSelection(initial);

        const initialNotes: Record<string, string> = {};
        for (const bc of build.components) {
          if (bc.note) initialNotes[bc.component.type] = bc.note;
        }
        setNotes(initialNotes);
      })
      .finally(() => setIsLoadingComponents(false));
  }, [build]);

  // Uyumsuz hale gelen seçimleri otomatik temizle
  useEffect(() => {
    if (components.length === 0) return;

    setSelection((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const cat of CATEGORIES) {
        const currentId = prev[cat.key];
        if (!currentId) continue;
        const component = components.find((c) => c.id === currentId);
        if (component && !isCompatible(component, prev, components)) {
          delete next[cat.key];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selection.cpuId,
    selection.motherboardId,
    selection.ramId,
    selection.caseId,
    components,
  ]);

  function getIncompatibleIds(type: string): Set<string> {
    const ofType = components.filter((c) => c.type === type);
    const incompatible = ofType.filter(
      (c) => !isCompatible(c, selection, components),
    );
    return new Set(incompatible.map((c) => c.id));
  }

  async function handleSubmit() {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);
    setIssues([]);
    setSuccessMessage(null);

    // Sadece mevcut halinden FARKLI olan parçaları gönderiyoruz
    const changedParts: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      const current = build.components.find(
        (bc) => bc.component.type === cat.type,
      );
      const selected = selection[cat.key];
      if (selected && selected !== current?.component.id) {
        changedParts[cat.key] = selected;
      }
    }

    const noteInputs: EditRequestNoteInput[] = Object.entries(notes)
      .filter(([, value]) => value && value.trim().length > 0)
      .map(([componentType, note]) => ({ componentType, note }));

    const result = await submitEditRequest(
      build.id,
      {
        description: description.trim() || undefined,
        ...changedParts,
        notes: noteInputs.length > 0 ? noteInputs : undefined,
        images: images.length > 0 ? images : undefined,
      },
      token,
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      if (result.issues) setIssues(result.issues);
      return;
    }

    setSuccessMessage(result.message);
    setTimeout(() => onDone(), 1200);
  }

  return (
    <div className="mt-6 rounded-2xl border border-hairline p-5 bg-surface">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-4">
        Sistemi Düzenle
      </h3>

      <div>
        <label className="block text-sm font-medium mb-1.5">Açıklama</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Sistemin hakkında birkaç kelime yaz..."
          className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors resize-none bg-paper"
        />
      </div>

      <div className="mt-5">
        <label className="block text-sm font-medium mb-1.5">
          Yeni Görsel Ekle (opsiyonel, en fazla 5)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) =>
            setImages(Array.from(e.target.files ?? []).slice(0, 5))
          }
          className="block text-sm text-ink-muted file:mr-4 file:rounded-lg file:border-0 file:bg-paper file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-hairline file:cursor-pointer"
        />
        {images.length > 0 && (
          <p className="text-xs text-trace mt-2">
            {images.length} yeni görsel seçildi. Görsel eklersen bu düzenleme
            admin onayına düşer.
          </p>
        )}
      </div>

      {isLoadingComponents ? (
        <p className="text-ink-muted text-sm mt-6">Parçalar yükleniyor...</p>
      ) : (
        <div className="mt-6 space-y-8">
          {CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <ComponentPicker
                label={cat.label}
                components={components.filter((c) => c.type === cat.type)}
                selectedId={selection[cat.key] ?? null}
                incompatibleIds={getIncompatibleIds(cat.type)}
                onSelect={(id) =>
                  setSelection((prev) => ({ ...prev, [cat.key]: id }))
                }
              />
              <div className="mt-2">
                <textarea
                  value={notes[cat.type] ?? ''}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [cat.type]: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder={`${cat.label} hakkında not ekle (opsiyonel)...`}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-incompatible mt-4">{error}</p>}

      {issues.length > 0 && (
        <div className="mt-3 rounded-xl border border-incompatible bg-incompatible/5 p-4">
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="text-sm text-incompatible">
                • {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <p className="text-sm text-compatible mt-4">{successMessage}</p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-ink text-paper text-sm font-medium px-6 py-2.5 hover:bg-trace transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Gönderiliyor...' : 'Değişiklikleri Gönder'}
        </button>
        <button
          onClick={onDone}
          disabled={isSubmitting}
          className="rounded-lg border border-hairline text-sm font-medium px-6 py-2.5 hover:border-ink transition-colors disabled:opacity-50"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
