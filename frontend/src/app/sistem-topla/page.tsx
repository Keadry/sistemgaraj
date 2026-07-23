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
      <div key={cat.key} className="transition-all duration-200">
        <button
          type="button"
          onClick={() => setActiveCategory(isOpen ? null : cat.key)}
          className={`w-full flex items-center justify-between p-4 text-left transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'bg-[#4e49f6]/5'
              : selectedComponent
                ? 'bg-white hover:bg-slate-50/80'
                : 'bg-white hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-[family-name:var(--font-mono)]">
                {cat.label}
              </span>
              {selectedComponent && (
                <span className="w-2 h-2 rounded-full bg-[#4e49f6]" />
              )}
            </div>

            {selectedComponent ? (
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {selectedComponent.brand} {selectedComponent.name}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5 font-medium italic">
                Bileşen Seçilmedi — Seçmek için tıklayın
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedComponent && (
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[#4e49f6] bg-[#4e49f6]/10 px-2.5 py-1 rounded-lg border border-[#4e49f6]/20">
                {formatPrice(selectedComponent.price)}
              </span>
            )}
            <span
              className={`text-slate-400 text-xs transition-transform duration-300 ease-in-out ${
                isOpen ? 'rotate-180 text-[#4e49f6]' : 'rotate-0'
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen
              ? 'grid-rows-[1fr] opacity-100 border-t border-slate-200/80 p-4 bg-slate-50/60'
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
    const hasSelection = opts.selectedComponents.length > 0;

    // 2 veya daha fazla eleman seçilince ismin uzamasını engelleyen format
    const formatSelectedNames = () => {
      if (opts.selectedComponents.length === 0) return '';
      if (opts.selectedComponents.length === 1) {
        return `${opts.selectedComponents[0].brand} ${opts.selectedComponents[0].name}`;
      }
      // İlk parçayı gösterip yanına ek parça sayısını ekliyoruz
      const first = `${opts.selectedComponents[0].brand} ${opts.selectedComponents[0].name}`;
      const extraCount = opts.selectedComponents.length - 1;
      return `${first} (+${extraCount} parça daha)`;
    };

    return (
      <div className="transition-all duration-200">
        <button
          type="button"
          onClick={opts.onToggleOpen}
          className={`w-full flex items-center justify-between p-4 text-left transition-all duration-200 cursor-pointer ${
            opts.isOpen
              ? 'bg-[#4e49f6]/5'
              : hasSelection
                ? 'bg-white hover:bg-slate-50/80'
                : 'bg-white hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-[family-name:var(--font-mono)]">
                {opts.label}
              </span>
              {hasSelection && (
                <span className="w-2 h-2 rounded-full bg-[#4e49f6]" />
              )}
            </div>

            {hasSelection ? (
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {formatSelectedNames()}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5 font-medium italic">
                Bileşen Seçilmedi — Seçmek için tıklayın
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasSelection && (
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[#4e49f6] bg-[#4e49f6]/10 px-2.5 py-1 rounded-lg border border-[#4e49f6]/20">
                {formatPrice(
                  opts.selectedComponents.reduce((s, c) => s + c.price, 0),
                )}
              </span>
            )}
            <span
              className={`text-slate-400 text-xs transition-transform duration-300 ease-in-out ${
                opts.isOpen ? 'rotate-180 text-[#4e49f6]' : 'rotate-0'
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            opts.isOpen
              ? 'grid-rows-[1fr] opacity-100 border-t border-slate-200/80 p-4 bg-slate-50/60'
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
    <main className="min-h-screen pb-36 text-slate-900 relative">
      <Navbar />

      <div className="px-4 md:px-8 py-8 md:py-10 max-w-7xl mx-auto grid lg:grid-cols-[1fr_320px] gap-8 relative z-10">
        {/* SOL TARAF: FORM & BİLEŞEN SEÇİM ALANI */}
        <div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4e49f6]/10 border border-[#4e49f6]/20 text-[#4e49f6] text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#4e49f6] animate-pulse" />
              Sistem Yapılandırıcı
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Sistem Topla
            </h1>
            <p className="text-slate-500 text-sm">
              Kategorilere tıklayarak parça listesini açabilir, sisteminizi adım
              adım oluşturabilirsiniz.
            </p>
          </div>

          {/* SİSTEM BİLGİLERİ FORM KARTI */}
          <div className="mt-8 p-6 bg-white border border-slate-200/80 rounded-3xl space-y-5 shadow-xs">
            <div>
              <label
                htmlFor="build-name"
                className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-[family-name:var(--font-mono)]"
              >
                Sistem Adı
              </label>
              <input
                id="build-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Bütçe Dostu Oyun Bilgisayarı"
                className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#4e49f6] focus:ring-2 focus:ring-[#4e49f6]/15 transition-all bg-slate-50/50 font-medium placeholder:text-slate-400"
              />
            </div>

            <label className="flex items-center gap-3 text-sm cursor-pointer w-fit text-slate-700 font-semibold select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#4e49f6] cursor-pointer"
              />
              Herkese açık olsun (topluluk akışında görünsün)
            </label>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-[family-name:var(--font-mono)]">
                Sistem Görselleri (En fazla 5 adet)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={images.length >= 5}
                onChange={handleImageChange}
                className="block text-xs text-slate-500 file:mr-4 file:rounded-xl file:border file:border-slate-200 file:bg-slate-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-100 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-[#4e49f6] font-semibold">
                    ✓ {images.length}/5 görsel seçildi. Görseller admin
                    onayından sonra yayınlanır.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {images.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={index}
                          className="relative group w-20 h-20 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs"
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
                            className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
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

          {/* ACCORDION BİLEŞEN SEÇİM LİSTESİ */}
          {isLoadingComponents ? (
            <div className="mt-8 p-8 bg-white border border-slate-200/80 rounded-3xl text-center">
              <p className="text-slate-400 text-sm font-medium animate-pulse">
                Bileşenler ve uyumluluk verileri yükleniyor...
              </p>
            </div>
          ) : (
            <div className="mt-8 bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-xs">
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

          {/* HATA BİLDİRİMLERİ */}
          {generalError && (
            <p className="mt-6 text-sm text-red-600 font-semibold bg-red-50 p-4 rounded-2xl border border-red-200/80 shadow-2xs">
              {generalError}
            </p>
          )}

          {issues.length > 0 && (
            <div className="mt-6 rounded-2xl border border-red-200/80 bg-red-50/90 p-5 space-y-2 shadow-2xs">
              <p className="font-bold text-sm text-red-700 flex items-center gap-1.5">
                <span>⚠️</span> Seçilen parçalar arasında uyumsuzluk tespit
                edildi:
              </p>
              <ul className="space-y-1.5 pl-5 list-disc text-sm text-red-600 font-medium">
                {issues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* SAĞ TARAF: CANLI SİSTEM ÖZETİ (SIDEBAR) */}
        <aside className="hidden lg:block lg:sticky lg:top-24 h-fit">
          <LiveSidebar selectedComponents={selectedComponents} />
        </aside>
      </div>

      {/* ALT YAPİŞKAN MALİYET BAR (FIXED BOTTOM BAR) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/90 px-4 md:px-8 py-4 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]">
              Toplam Konfigürasyon Tutarı
            </p>
            <p className="font-[family-name:var(--font-mono)] text-xl md:text-2xl font-extrabold text-[#4e49f6] tracking-tight">
              {formatPrice(selectedComponents.reduce((s, c) => s + c.price, 0))}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className="rounded-xl bg-[#4e49f6] hover:bg-[#3d39c4] text-white text-sm font-bold px-8 py-3.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#4e49f6]/25 active:scale-95 cursor-pointer"
          >
            {isSubmitting
              ? 'Uyumluluk Kontrol Ediliyor...'
              : isComplete
                ? 'Sistemi Oluştur'
                : 'Tüm Parçaları Tamamla'}
          </button>
        </div>
      </div>
    </main>
  );
}
