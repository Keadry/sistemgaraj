'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  getIncompatibilityReason,
  isCompatible,
} from '@/lib/compatibility-client';
import ComponentPicker from './ComponentPicker';
import ImageDropzone from './ImageDropzone';
import {
  getComponents,
  submitEditRequest,
  setExistingImageMain,
  deleteExistingImage,
  type Build,
  type Component,
  type EditRequestNoteInput,
  type CompatibilityIssue,
} from '@/lib/api';

const CATEGORIES: { type: string; label: string; key: string }[] = [
  { type: 'CPU', label: 'İşlemci (CPU)', key: 'cpuId' },
  { type: 'MOTHERBOARD', label: 'Anakart', key: 'motherboardId' },
  { type: 'GPU', label: 'Ekran Kartı', key: 'gpuId' },
  { type: 'PSU', label: 'Güç Kaynağı', key: 'psuId' },
  { type: 'CASE', label: 'Kasa', key: 'caseId' },
];

type Selection = Record<string, string>;

export default function EditPanel({
  build,
  onDone,
  onImagesChanged,
}: {
  build: Build;
  onDone: () => void;
  onImagesChanged: () => void;
}) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [selection, setSelection] = useState<Selection>({});
  const [ramIds, setRamIds] = useState<string[]>([]);
  const [storageIds, setStorageIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [name, setName] = useState(build.name);
  const [description, setDescription] = useState(build.description ?? '');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<CompatibilityIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [imageActionId, setImageActionId] = useState<string | null>(null);

  useEffect(() => {
    getComponents()
      .then((all) => {
        setComponents(all);

        const initial: Selection = {};
        for (const cat of CATEGORIES) {
          const current = build.components.find(
            (bc) => bc.component.type === cat.type,
          );
          if (current) initial[cat.key] = current.component.id;
        }
        setSelection(initial);

        const initialRam = build.components
          .filter((bc) => bc.component.type === 'RAM')
          .map((bc) => bc.component.id);
        setRamIds(initialRam);

        const initialStorage = build.components
          .filter((bc) => bc.component.type === 'STORAGE')
          .map((bc) => bc.component.id);
        setStorageIds(initialStorage);

        const initialNotes: Record<string, string> = {};
        for (const bc of build.components) {
          if (bc.note) initialNotes[bc.component.type] = bc.note;
        }
        setNotes(initialNotes);
      })
      .finally(() => setIsLoadingComponents(false));
  }, [build]);

  const ramTypeSelected =
    ramIds.length > 0
      ? (components.find((c) => c.id === ramIds[0])?.ramType ?? null)
      : null;

  useEffect(() => {
    if (components.length === 0) return;

    setSelection((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const cat of CATEGORIES) {
        const currentId = prev[cat.key];
        if (!currentId) continue;
        const component = components.find((c) => c.id === currentId);
        if (
          component &&
          !isCompatible(component, prev, ramTypeSelected, components)
        ) {
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
    selection.caseId,
    ramTypeSelected,
    components,
  ]);

  function getIncompatibleReasons(type: string): Map<string, string> {
    const reasons = new Map<string, string>();
    for (const c of components) {
      if (c.type !== type) continue;
      const reason = getIncompatibilityReason(
        c,
        selection,
        ramTypeSelected,
        components,
      );
      if (reason) reasons.set(c.id, reason);
    }
    return reasons;
  }

  const motherboard = components.find((c) => c.id === selection.motherboardId);
  const ramComponents = components.filter((c) => c.type === 'RAM');
  const compatibleRam = motherboard
    ? ramComponents.filter((c) => c.ramType === motherboard.ramType)
    : ramComponents;

  async function handleSetMain(imageId: string) {
    if (!token) return;
    setImageActionId(imageId);
    try {
      await setExistingImageMain(build.id, imageId, token);
      onImagesChanged();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setImageActionId(null);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!token) return;
    const ok = await confirmDialog({
      title: 'Görseli sil',
      description: 'Bu işlem geri alınamaz.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    setImageActionId(imageId);
    try {
      await deleteExistingImage(build.id, imageId, token);
      onImagesChanged();
      showToast('Görsel silindi.', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setImageActionId(null);
    }
  }

  async function handleSubmit() {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);
    setIssues([]);
    setSuccessMessage(null);

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

    const currentRamIds = build.components
      .filter((bc) => bc.component.type === 'RAM')
      .map((bc) => bc.component.id)
      .sort();
    const sortedRamIds = [...ramIds].sort();
    const ramChanged =
      JSON.stringify(currentRamIds) !== JSON.stringify(sortedRamIds);

    const currentStorageIds = build.components
      .filter((bc) => bc.component.type === 'STORAGE')
      .map((bc) => bc.component.id)
      .sort();
    const sortedStorageIds = [...storageIds].sort();
    const storageChanged =
      JSON.stringify(currentStorageIds) !== JSON.stringify(sortedStorageIds);

    const noteInputs: EditRequestNoteInput[] = Object.entries(notes)
      .filter(([, value]) => value && value.trim().length > 0)
      .map(([componentType, note]) => ({ componentType, note }));

    const result = await submitEditRequest(
      build.id,
      {
        name:
          name.trim() && name.trim() !== build.name ? name.trim() : undefined,
        description: description.trim() || undefined,
        ...changedParts,
        ramIds: ramChanged ? ramIds : undefined,
        storageIds: storageChanged ? storageIds : undefined,
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

      <div className="mb-5">
        <label className="block text-sm font-medium mb-1.5">Sistem Adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-paper"
        />
      </div>

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

      {build.images.length > 0 && (
        <div className="mt-5">
          <label className="block text-sm font-medium mb-1.5">
            Mevcut Görseller
          </label>
          <div className="flex flex-wrap gap-3">
            {build.images.map((img) => {
              const API_URL = process.env.NEXT_PUBLIC_API_URL;
              const isBusy = imageActionId === img.id;
              return (
                <div
                  key={img.id}
                  className="relative w-24 h-20 rounded-lg overflow-hidden border border-hairline"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${API_URL}${img.url}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {img.status === 'PENDING' && (
                    <span className="absolute top-1 left-1 text-[10px] bg-trace text-paper rounded px-1.5 py-0.5">
                      Onayda
                    </span>
                  )}
                  {img.status === 'REJECTED' && (
                    <span className="absolute top-1 left-1 text-[10px] bg-incompatible text-paper rounded px-1.5 py-0.5">
                      Reddedildi
                    </span>
                  )}
                  {img.isMain && (
                    <span className="absolute top-1 right-1 text-[10px] bg-ink text-paper rounded px-1.5 py-0.5">
                      Ana
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex bg-ink/60">
                    {!img.isMain && img.status === 'APPROVED' && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleSetMain(img.id)}
                        className="flex-1 text-[10px] text-paper py-1 hover:bg-ink/80 disabled:opacity-50"
                      >
                        Ana Yap
                      </button>
                    )}
                    <button
                      disabled={isBusy}
                      onClick={() => handleDeleteImage(img.id)}
                      className="flex-1 text-[10px] text-paper py-1 hover:bg-incompatible/80 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <ImageDropzone
          files={images}
          onChange={setImages}
          maxFiles={5}
          reservedSlots={build.images.length}
        />
        {images.length > 0 && (
          <p className="text-xs text-trace mt-2">
            Görsel eklediğin için bu düzenleme admin onayına düşecek.
          </p>
        )}
      </div>

      {isLoadingComponents ? (
        <p className="text-ink-muted text-sm mt-6">Parçalar yükleniyor...</p>
      ) : (
        <div className="mt-6 space-y-8">
          {/* CPU */}
          <div>
            <ComponentPicker
              label="İşlemci (CPU)"
              components={components.filter((c) => c.type === 'CPU')}
              selectedId={selection.cpuId ?? null}
              incompatibleReasons={getIncompatibleReasons('CPU')}
              onSelect={(id) =>
                setSelection((prev) => ({ ...prev, cpuId: id }))
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['CPU'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, CPU: e.target.value }))
                }
                rows={2}
                placeholder="İşlemci hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>

          {/* ANAKART */}
          <div>
            <ComponentPicker
              label="Anakart"
              components={components.filter((c) => c.type === 'MOTHERBOARD')}
              selectedId={selection.motherboardId ?? null}
              incompatibleReasons={getIncompatibleReasons('MOTHERBOARD')}
              onSelect={(id) =>
                setSelection((prev) => ({ ...prev, motherboardId: id }))
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['MOTHERBOARD'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    MOTHERBOARD: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Anakart hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>

          {/* RAM — ÇOKLU SEÇİM */}
          <div>
            <ComponentPicker
              label={`RAM (birden fazla seçilebilir${
                motherboard?.ramSlots
                  ? `, en fazla ${motherboard.ramSlots}`
                  : ''
              })`}
              components={compatibleRam}
              selectedIds={ramIds}
              multiple
              onSelect={(id) =>
                setRamIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((r) => r !== id)
                    : [...prev, id],
                )
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['RAM'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, RAM: e.target.value }))
                }
                rows={2}
                placeholder="RAM hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>

          {/* GPU */}
          <div>
            <ComponentPicker
              label="Ekran Kartı"
              components={components.filter((c) => c.type === 'GPU')}
              selectedId={selection.gpuId ?? null}
              incompatibleReasons={getIncompatibleReasons('GPU')}
              onSelect={(id) =>
                setSelection((prev) => ({ ...prev, gpuId: id }))
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['GPU'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, GPU: e.target.value }))
                }
                rows={2}
                placeholder="Ekran kartı hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>

          {/* PSU */}
          <div>
            <ComponentPicker
              label="Güç Kaynağı"
              components={components.filter((c) => c.type === 'PSU')}
              selectedId={selection.psuId ?? null}
              incompatibleReasons={getIncompatibleReasons('PSU')}
              onSelect={(id) =>
                setSelection((prev) => ({ ...prev, psuId: id }))
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['PSU'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, PSU: e.target.value }))
                }
                rows={2}
                placeholder="Güç kaynağı hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>

          {/* DEPOLAMA — ÇOKLU SEÇİM */}
          <div>
            <ComponentPicker
              label="Depolama (SATA / M.2, birden fazla seçilebilir)"
              components={components.filter((c) => c.type === 'STORAGE')}
              selectedIds={storageIds}
              multiple
              onSelect={(id) =>
                setStorageIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((s) => s !== id)
                    : [...prev, id],
                )
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['STORAGE'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, STORAGE: e.target.value }))
                }
                rows={2}
                placeholder="Depolama hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>

          {/* KASA */}
          <div>
            <ComponentPicker
              label="Kasa"
              components={components.filter((c) => c.type === 'CASE')}
              selectedId={selection.caseId ?? null}
              incompatibleReasons={getIncompatibleReasons('CASE')}
              onSelect={(id) =>
                setSelection((prev) => ({ ...prev, caseId: id }))
              }
            />
            <div className="mt-2">
              <textarea
                value={notes['CASE'] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, CASE: e.target.value }))
                }
                rows={2}
                placeholder="Kasa hakkında not ekle (opsiyonel)..."
                className="w-full rounded-lg border border-hairline px-3 py-2 text-xs outline-none focus:border-trace transition-colors resize-none bg-paper"
              />
            </div>
          </div>
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
          className="rounded-xl bg-ink text-paper text-sm font-medium px-6 py-2.5 hover:bg-trace transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Gönderiliyor...' : 'Değişiklikleri Gönder'}
        </button>
        <button
          onClick={onDone}
          disabled={isSubmitting}
          className="rounded-xl border border-hairline text-sm font-medium px-6 py-2.5 hover:border-ink transition-colors disabled:opacity-50"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
