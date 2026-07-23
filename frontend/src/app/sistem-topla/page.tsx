'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ComponentPicker from '@/components/ComponentPicker';
import LiveSidebar from '@/components/LiveSidebar';
import { isCompatible } from '@/lib/compatibility-client';
import { useAuth } from '@/lib/auth-context';
import {
  getComponents,
  createBuild,
  type Component,
  type CompatibilityIssue,
} from '@/lib/api';

type Selection = {
  cpuId: string | null;
  motherboardId: string | null;
  gpuId: string | null;
  psuId: string | null;
  caseId: string | null;
};

type StepKey = keyof Selection | 'ramId' | 'storageId';

const CATEGORIES: { key: keyof Selection; type: string; label: string }[] = [
  { key: 'cpuId', type: 'CPU', label: 'İşlemci (CPU)' },
  { key: 'motherboardId', type: 'MOTHERBOARD', label: 'Anakart' },
  { key: 'gpuId', type: 'GPU', label: 'Ekran Kartı' },
  { key: 'psuId', type: 'PSU', label: 'Güç Kaynağı' },
  { key: 'caseId', type: 'CASE', label: 'Kasa' },
];

// Ekranda gösterilecek sıra
const STEP_ORDER: StepKey[] = [
  'cpuId',
  'motherboardId',
  'ramId',
  'gpuId',
  'psuId',
  'storageId',
  'caseId',
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

export default function SistemToplaPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState<File[]>([]);

  const [selection, setSelection] = useState<Selection>({
    cpuId: null,
    motherboardId: null,
    gpuId: null,
    psuId: null,
    caseId: null,
  });
  const [ramIds, setRamIds] = useState<string[]>([]);
  const [storageIds, setStorageIds] = useState<string[]>([]);

  const [issues, setIssues] = useState<CompatibilityIssue[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeCategory, setActiveCategory] = useState<StepKey | null>('cpuId');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/giris');
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    getComponents()
      .then(setComponents)
      .catch(() => setGeneralError('Parçalar yüklenirken bir hata oluştu.'))
      .finally(() => setIsLoadingComponents(false));
  }, []);

  const ramTypeSelected =
    ramIds.length > 0
      ? (components.find((c) => c.id === ramIds[0])?.ramType ?? null)
      : null;

  // Uyumsuz hale gelen tekli seçimleri otomatik temizle
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
          next[cat.key] = null;
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

  // Anakart değişince, artık uyumsuz olan RAM'leri otomatik temizle
  useEffect(() => {
    if (components.length === 0 || ramIds.length === 0) return;
    const motherboard = components.find(
      (c) => c.id === selection.motherboardId,
    );
    if (!motherboard) return;

    setRamIds((prev) =>
      prev.filter((id) => {
        const ram = components.find((c) => c.id === id);
        return ram && ram.ramType === motherboard.ramType;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.motherboardId]);

  function isStepComplete(key: StepKey): boolean {
    if (key === 'ramId') return ramIds.length > 0;
    if (key === 'storageId') return storageIds.length > 0;
    return selection[key] !== null;
  }

  function advanceAfter(key: StepKey) {
    const currentIndex = STEP_ORDER.indexOf(key);
    const next = STEP_ORDER.slice(currentIndex + 1).find(
      (k) => !isStepComplete(k),
    );

    if (next) {
      setTimeout(() => setActiveCategory(next), 150);
    } else {
      setActiveCategory(null);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setImages((prevImages) => {
      const combined = [...prevImages, ...selectedFiles];
      return combined.slice(0, 5);
    });

    e.target.value = '';
  }

  function removeImage(indexToRemove: number) {
    setImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove),
    );
  }

  function handleSelect(key: keyof Selection, id: string) {
    const isDeselecting = selection[key] === id;

    setSelection((prev) => ({
      ...prev,
      [key]: isDeselecting ? null : id,
    }));

    if (!isDeselecting) {
      advanceAfter(key);
    }
  }

  function handleRamToggle(id: string) {
    const wasEmpty = ramIds.length === 0;
    const isRemoving = ramIds.includes(id);

    setRamIds((prev) =>
      isRemoving ? prev.filter((r) => r !== id) : [...prev, id],
    );

    if (!isRemoving && wasEmpty) {
      advanceAfter('ramId');
    }
  }

  function handleStorageToggle(id: string) {
    const wasEmpty = storageIds.length === 0;
    const isRemoving = storageIds.includes(id);

    setStorageIds((prev) =>
      isRemoving ? prev.filter((s) => s !== id) : [...prev, id],
    );

    if (!isRemoving && wasEmpty) {
      advanceAfter('storageId');
    }
  }

  const selectedComponents = [
    ...CATEGORIES.map((cat) => {
      const id = selection[cat.key];
      return components.find((c) => c.id === id) ?? null;
    }).filter((c): c is Component => c !== null),
    ...ramIds
      .map((id) => components.find((c) => c.id === id))
      .filter((c): c is Component => c !== undefined),
    ...storageIds
      .map((id) => components.find((c) => c.id === id))
      .filter((c): c is Component => c !== undefined),
  ];

  const isComplete =
    CATEGORIES.every((cat) => selection[cat.key] !== null) &&
    ramIds.length > 0 &&
    storageIds.length > 0;

  async function handleSubmit() {
    if (!token || !isComplete) return;

    setIsSubmitting(true);
    setIssues([]);
    setGeneralError(null);

    const result = await createBuild(
      {
        name: name.trim() || 'Adsız Sistem',
        cpuId: selection.cpuId!,
        motherboardId: selection.motherboardId!,
        ramIds,
        gpuId: selection.gpuId!,
        psuId: selection.psuId!,
        caseId: selection.caseId!,
        storageIds,
        isPublic,
        images: images.length > 0 ? images : undefined,
      },
      token,
    );

    setIsSubmitting(false);

    if (result.error) {
      if (result.issues) {
        setIssues(result.issues);
      } else {
        setGeneralError(result.error);
      }
      return;
    }

    if (result.build) {
      router.push(`/sistemler/${result.build.id}`);
    }
  }

  if (isAuthLoading || !user) {
    return null;
  }

  const motherboard = components.find((c) => c.id === selection.motherboardId);

  const ramComponents = components.filter((c) => c.type === 'RAM');
  const compatibleRam = motherboard
    ? ramComponents.filter((c) => c.ramType === motherboard.ramType)
    : ramComponents;
  const selectedRamComponents = ramIds
    .map((id) => components.find((c) => c.id === id))
    .filter((c): c is Component => c !== undefined);
  const isRamOpen = activeCategory === 'ramId';

  const storageComponents = components.filter((c) => c.type === 'STORAGE');
  const selectedStorageComponents = storageIds
    .map((id) => components.find((c) => c.id === id))
    .filter((c): c is Component => c !== undefined);
  const isStorageOpen = activeCategory === 'storageId';

  function renderCategoryRow(cat: (typeof CATEGORIES)[number]) {
    const ofType = components.filter((c) => c.type === cat.type);
    const compatibleList = ofType.filter((c) =>
      isCompatible(c, selection, ramTypeSelected, components),
    );
    const selectedComponent = components.find(
      (c) => c.id === selection[cat.key],
    );
    const isOpen = activeCategory === cat.key;

    return (
      <div key={cat.key} className="transition-colors duration-200">
        <button
          type="button"
          onClick={() => setActiveCategory(isOpen ? null : cat.key)}
          className={`w-full flex items-center justify-between p-4 text-left transition-all duration-300 ${
            isOpen ? 'bg-surface/50' : 'bg-paper'
          }`}
        >
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted font-[family-name:var(--font-mono)]">
              {cat.label}
            </span>
            {selectedComponent ? (
              <p className="text-sm font-semibold text-ink mt-0.5 truncate">
                {selectedComponent.brand} {selectedComponent.name}
              </p>
            ) : (
              <p className="text-xs text-ink-muted mt-0.5 font-medium">
                Bileşen Seçilmedi
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {selectedComponent && (
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-trace bg-trace/10 px-2 py-1 rounded-lg">
                {formatPrice(selectedComponent.price)}
              </span>
            )}
            <span
              className={`text-ink-muted text-[10px] transition-transform duration-300 ease-in-out ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out border-hairline ${
            isOpen
              ? 'grid-rows-[1fr] opacity-100 border-t p-4 bg-surface/20'
              : 'grid-rows-[0fr] opacity-0 p-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <ComponentPicker
              label=""
              components={compatibleList}
              selectedId={selection[cat.key]}
              onSelect={(id) => handleSelect(cat.key, id)}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderMultiRow(opts: {
    label: string;
    isOpen: boolean;
    onToggleOpen: () => void;
    components: Component[];
    selectedIds: string[];
    selectedComponents: Component[];
    onSelect: (id: string) => void;
  }) {
    return (
      <div className="transition-colors duration-200">
        <button
          type="button"
          onClick={opts.onToggleOpen}
          className={`w-full flex items-center justify-between p-4 text-left transition-all duration-300 ${
            opts.isOpen ? 'bg-surface/50' : 'bg-paper'
          }`}
        >
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted font-[family-name:var(--font-mono)]">
              {opts.label}
            </span>
            {opts.selectedComponents.length > 0 ? (
              <p className="text-sm font-semibold text-ink mt-0.5 truncate">
                {opts.selectedComponents
                  .map((c) => `${c.brand} ${c.name}`)
                  .join(', ')}
              </p>
            ) : (
              <p className="text-xs text-ink-muted mt-0.5 font-medium">
                Bileşen Seçilmedi
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {opts.selectedComponents.length > 0 && (
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-trace bg-trace/10 px-2 py-1 rounded-lg">
                {formatPrice(
                  opts.selectedComponents.reduce((s, c) => s + c.price, 0),
                )}
              </span>
            )}
            <span
              className={`text-ink-muted text-[10px] transition-transform duration-300 ease-in-out ${
                opts.isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out border-hairline ${
            opts.isOpen
              ? 'grid-rows-[1fr] opacity-100 border-t p-4 bg-surface/20'
              : 'grid-rows-[0fr] opacity-0 p-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <ComponentPicker
              label=""
              components={opts.components}
              selectedIds={opts.selectedIds}
              multiple
              onSelect={opts.onSelect}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <Navbar />

      <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Sistem Topla
          </h1>
          <p className="text-ink-muted mt-2 text-sm">
            Kategorilere tıklayarak parça listesini açabilir, sisteminizi adım
            adım toplayabilirsiniz.
          </p>

          <div className="mt-8 p-5 bg-paper border border-hairline rounded-2xl space-y-4 shadow-sm">
            <div>
              <label
                htmlFor="build-name"
                className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5"
              >
                Sistem Adı
              </label>
              <input
                id="build-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Bütçe Dostu Oyun Bilgisayarı"
                className="w-full max-w-md rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors bg-surface/30"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer w-fit text-ink font-medium">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-hairline accent-trace"
              />
              Herkese açık olsun (topluluk akışında görünsün)
            </label>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Sistem Görselleri (En fazla 5 adet)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={images.length >= 5}
                onChange={handleImageChange}
                className="block text-xs text-ink-muted file:mr-4 file:rounded-xl file:border file:border-hairline file:bg-surface file:px-4 file:py-2 file:text-xs file:font-semibold file:text-ink hover:file:bg-hairline file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-trace font-medium">
                    ✓ {images.length}/5 görsel seçildi. Görseller admin
                    onayından sonra yayınlanır.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {images.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={index}
                          className="relative group w-16 h-16 rounded-xl border border-hairline overflow-hidden bg-surface"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt="Önizleme"
                            className="w-full h-full object-cover"
                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute inset-0 bg-ink/50 flex items-center justify-center text-paper font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          >
                            Kaldır
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLoadingComponents ? (
            <p className="text-ink-muted text-sm mt-12 animate-pulse">
              Parçalar yükleniyor...
            </p>
          ) : (
            <div className="mt-8 border border-hairline bg-paper rounded-2xl divide-y divide-hairline overflow-hidden shadow-sm">
              {renderCategoryRow(CATEGORIES[0])}
              {renderCategoryRow(CATEGORIES[1])}

              {/* RAM — ANAKART'TAN SONRA, ÇOKLU SEÇİM */}
              {renderMultiRow({
                label: `RAM (birden fazla seçilebilir${
                  motherboard?.ramSlots
                    ? `, en fazla ${motherboard.ramSlots}`
                    : ''
                })`,
                isOpen: isRamOpen,
                onToggleOpen: () =>
                  setActiveCategory(isRamOpen ? null : 'ramId'),
                components: compatibleRam,
                selectedIds: ramIds,
                selectedComponents: selectedRamComponents,
                onSelect: handleRamToggle,
              })}

              {renderCategoryRow(CATEGORIES[2])}
              {renderCategoryRow(CATEGORIES[3])}

              {/* DEPOLAMA — PSU'DAN SONRA, ÇOKLU SEÇİM */}
              {renderMultiRow({
                label: 'Depolama (SATA / M.2, birden fazla seçilebilir)',
                isOpen: isStorageOpen,
                onToggleOpen: () =>
                  setActiveCategory(isStorageOpen ? null : 'storageId'),
                components: storageComponents,
                selectedIds: storageIds,
                selectedComponents: selectedStorageComponents,
                onSelect: handleStorageToggle,
              })}

              {renderCategoryRow(CATEGORIES[4])}
            </div>
          )}

          {generalError && (
            <p className="mt-6 text-sm text-incompatible font-medium bg-incompatible/5 p-3 rounded-xl border border-incompatible/20">
              {generalError}
            </p>
          )}

          {issues.length > 0 && (
            <div className="mt-6 rounded-xl border border-incompatible bg-incompatible/5 p-4">
              <p className="font-bold text-sm text-incompatible mb-2">
                Seçilen parçalar uyumlu değil:
              </p>
              <ul className="space-y-1">
                {issues.map((issue, i) => (
                  <li key={i} className="text-sm text-incompatible font-medium">
                    • {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <LiveSidebar selectedComponents={selectedComponents} />
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-hairline px-6 md:px-12 py-4 flex items-center justify-between shadow-md z-40">
        <div>
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">
            Maliyet
          </p>
          <p className="font-[family-name:var(--font-mono)] text-xl font-extrabold text-ink tracking-tight">
            {formatPrice(selectedComponents.reduce((s, c) => s + c.price, 0))}
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="rounded-xl bg-ink text-paper text-sm font-bold px-8 py-3.5 hover:bg-trace transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting
            ? 'Kontrol ediliyor...'
            : isComplete
              ? 'Sistemi Oluştur'
              : 'Eksik parça var'}
        </button>
      </div>
    </main>
  );
}
