'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ComponentPicker from '@/components/ComponentPicker';
import LiveSidebar from '@/components/LiveSidebar';
import {
  getIncompatibilityReason,
  isCompatible,
} from '@/lib/compatibility-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraftContent,
} from '@/lib/build-draft';
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
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState<File[]>([]);

  // lg altında sağdaki özet sütunu gizleniyor; onun içeriğini alttan açılan
  // bir sayfada gösteriyoruz.
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);

  // Sayfanın altındaki sabit bar toast'ların üstüne biniyordu. Barın gerçek
  // yüksekliğini ölçüp `--toast-offset`'e yazıyoruz; toast konteyneri bu kadar
  // yukarı kayıyor. Sabit bir sayı yazmak yerine ölçmek, barın yüksekliği
  // ekran genişliğine ve buton metnine göre değiştiği için gerekli.
  const bottomBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = bottomBarRef.current;
    if (!bar) return;

    const observer = new ResizeObserver(() => {
      document.body.style.setProperty('--toast-offset', `${bar.offsetHeight}px`);
    });
    observer.observe(bar);

    return () => {
      observer.disconnect();
      document.body.style.removeProperty('--toast-offset');
    };
    // Bar, kullanıcı yüklenene kadar render edilmiyor (aşağıdaki erken return);
    // ref'in dolduğu render'da efektin tekrar çalışması için user bağımlılıkta.
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isSummaryOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setIsSummaryOpen(false);
      summaryButtonRef.current?.focus();
    }

    // Masaüstü genişliğine geçilirse özet zaten sağ sütunda görünür olur,
    // sheet'i açık tutmanın anlamı kalmaz.
    const desktop = window.matchMedia('(min-width: 1024px)');
    function onBreakpointChange(e: MediaQueryListEvent) {
      if (e.matches) setIsSummaryOpen(false);
    }

    document.body.dataset.sheetOpen = 'true';
    document.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onBreakpointChange);

    return () => {
      delete document.body.dataset.sheetOpen;
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpointChange);
    };
  }, [isSummaryOpen]);

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
  const [draftRestored, setDraftRestored] = useState(false);

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

  // Sayfa ilk açıldığında, varsa kaydedilmiş taslağı geri yükle.
  // Bilerek sessiz: geri yüklenen seçimler zaten ekranda görünüyor, açıklama
  // metni otomatik kaydedildiğini söylüyor ve seçim varken "Yeni Başlangıç"
  // butonu çıkıyor. Ayrıca bu efekt mount'ta çalıştığı için buradan atılan bir
  // toast StrictMode'da iki kez görünüyordu.
  useEffect(() => {
    const draft = loadDraft();
    if (draft && hasDraftContent(draft)) {
      setName(draft.name);
      setIsPublic(draft.isPublic);
      setSelection({
        cpuId: draft.cpuId,
        motherboardId: draft.motherboardId,
        gpuId: draft.gpuId,
        psuId: draft.psuId,
        caseId: draft.caseId,
      });
      setRamIds(draft.ramIds);
      setStorageIds(draft.storageIds);
    }
    setDraftRestored(true);
  }, []);

  // Herhangi bir seçim değiştiğinde taslağı otomatik kaydet
  useEffect(() => {
    if (!draftRestored) return;

    const draft = {
      name,
      isPublic,
      cpuId: selection.cpuId,
      motherboardId: selection.motherboardId,
      gpuId: selection.gpuId,
      psuId: selection.psuId,
      caseId: selection.caseId,
      ramIds,
      storageIds,
    };

    if (hasDraftContent(draft)) {
      saveDraft(draft);
    } else {
      clearDraft();
    }
  }, [name, isPublic, selection, ramIds, storageIds, draftRestored]);

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

  const totalPrice = selectedComponents.reduce((sum, c) => sum + c.price, 0);

  const isComplete =
    CATEGORIES.every((cat) => selection[cat.key] !== null) &&
    ramIds.length > 0 &&
    storageIds.length > 0;

  const hasAnySelection =
    Boolean(name) ||
    Object.values(selection).some(Boolean) ||
    ramIds.length > 0 ||
    storageIds.length > 0;

  async function handleReset() {
    const ok = await confirmDialog({
      title: 'Yeni Başlangıç',
      description: 'Şu ana kadar seçtiğin tüm parçalar silinecek.',
      confirmLabel: 'Sıfırla',
      danger: true,
    });
    if (!ok) return;

    setName('');
    setIsPublic(true);
    setSelection({
      cpuId: null,
      motherboardId: null,
      gpuId: null,
      psuId: null,
      caseId: null,
    });
    setRamIds([]);
    setStorageIds([]);
    setImages([]);
    clearDraft();
    setActiveCategory('cpuId');
    showToast('Taslak temizlendi.', 'success');
  }

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
      clearDraft();
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
    // Uyumsuzları listeden çıkarmıyoruz; sebepleriyle birlikte kilitli
    // gösteriyoruz ki kullanıcı bir parçanın neden seçilemediğini görsün.
    const incompatibleReasons = new Map<string, string>();
    for (const c of ofType) {
      const reason = getIncompatibilityReason(
        c,
        selection,
        ramTypeSelected,
        components,
      );
      if (reason) incompatibleReasons.set(c.id, reason);
    }
    const selectedComponent = components.find(
      (c) => c.id === selection[cat.key],
    );
    const isOpen = activeCategory === cat.key;

    return (
      <div key={cat.key} className="transition-all duration-200">
        <button
          type="button"
          onClick={() => setActiveCategory(isOpen ? null : cat.key)}
          className={`w-full flex items-center justify-between p-4 text-left transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
            isOpen ? 'bg-trace/5' : 'bg-paper hover:bg-surface/60'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted font-[family-name:var(--font-mono)]">
                {cat.label}
              </span>
              {selectedComponent && (
                <span className="w-2 h-2 rounded-full bg-trace" />
              )}
            </div>

            {selectedComponent ? (
              <p className="text-sm font-bold text-ink mt-0.5 truncate">
                {selectedComponent.brand} {selectedComponent.name}
              </p>
            ) : (
              <p className="text-xs text-ink-muted mt-0.5 font-medium italic">
                Bileşen Seçilmedi — Seçmek için tıklayın
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedComponent && (
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-trace bg-trace/10 px-2.5 py-1 rounded-lg border border-trace/20">
                {formatPrice(selectedComponent.price)}
              </span>
            )}
            <span
              className={`text-ink-muted text-xs transition-transform duration-300 ease-in-out ${
                isOpen ? 'rotate-180 text-trace' : 'rotate-0'
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen
              ? 'grid-rows-[1fr] opacity-100 border-t border-hairline p-4 bg-surface/60'
              : 'grid-rows-[0fr] opacity-0 p-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <ComponentPicker
              label=""
              components={ofType}
              incompatibleReasons={incompatibleReasons}
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

    const formatSelectedNames = () => {
      if (opts.selectedComponents.length === 0) return '';
      if (opts.selectedComponents.length === 1) {
        return `${opts.selectedComponents[0].brand} ${opts.selectedComponents[0].name}`;
      }
      const first = `${opts.selectedComponents[0].brand} ${opts.selectedComponents[0].name}`;
      const extraCount = opts.selectedComponents.length - 1;
      return `${first} (+${extraCount} parça daha)`;
    };

    return (
      <div className="transition-all duration-200">
        <button
          type="button"
          onClick={opts.onToggleOpen}
          className={`w-full flex items-center justify-between p-4 text-left transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
            opts.isOpen ? 'bg-trace/5' : 'bg-paper hover:bg-surface/60'
          }`}
        >
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted font-[family-name:var(--font-mono)]">
                {opts.label}
              </span>
              {hasSelection && (
                <span className="w-2 h-2 rounded-full bg-trace" />
              )}
            </div>

            {hasSelection ? (
              <p className="text-sm font-bold text-ink mt-0.5 truncate">
                {formatSelectedNames()}
              </p>
            ) : (
              <p className="text-xs text-ink-muted mt-0.5 font-medium italic">
                Bileşen Seçilmedi — Seçmek için tıklayın
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasSelection && (
              <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-trace bg-trace/10 px-2.5 py-1 rounded-lg border border-trace/20">
                {formatPrice(
                  opts.selectedComponents.reduce((s, c) => s + c.price, 0),
                )}
              </span>
            )}
            <span
              className={`text-ink-muted text-xs transition-transform duration-300 ease-in-out ${
                opts.isOpen ? 'rotate-180 text-trace' : 'rotate-0'
              }`}
            >
              ▼
            </span>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            opts.isOpen
              ? 'grid-rows-[1fr] opacity-100 border-t border-hairline p-4 bg-surface/60'
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
    <main className="min-h-screen pb-36 text-ink relative">
      <Navbar />

      <div className="px-4 md:px-8 py-8 md:py-10 max-w-7xl mx-auto grid lg:grid-cols-[1fr_320px] gap-8 relative z-10">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trace/10 border border-trace/20 text-trace text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-trace animate-pulse" />
                Sistem Yapılandırıcı
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold tracking-tight text-ink">
                Sistem Topla
              </h1>
              <p className="text-ink-muted text-sm">
                Kategorilere tıklayarak parça listesini açabilir, sisteminizi
                adım adım oluşturabilirsiniz. Seçimlerin otomatik kaydedilir.
              </p>
            </div>

            {hasAnySelection && (
              <button
                onClick={handleReset}
                className="shrink-0 text-sm text-ink-muted hover:text-incompatible transition-colors rounded-lg px-3 py-1.5 border border-hairline hover:border-incompatible focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
              >
                Yeni Başlangıç
              </button>
            )}
          </div>

          {/* SİSTEM BİLGİLERİ FORM KARTI */}
          <div className="mt-8 p-6 bg-paper border border-hairline rounded-3xl space-y-5 shadow-xs">
            <div>
              <label
                htmlFor="build-name"
                className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 font-[family-name:var(--font-mono)]"
              >
                Sistem Adı
              </label>
              <input
                id="build-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Bütçe Dostu Oyun Bilgisayarı"
                className="w-full max-w-md rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace focus:ring-2 focus:ring-trace/15 transition-all bg-surface/40 font-medium placeholder:text-ink-muted"
              />
            </div>

            <label className="flex items-center gap-3 text-sm cursor-pointer w-fit text-ink font-semibold select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-hairline accent-trace cursor-pointer"
              />
              Herkese açık olsun (topluluk akışında görünsün)
            </label>

            <div className="pt-2 border-t border-hairline">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 font-[family-name:var(--font-mono)]">
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
                  <p className="text-xs text-trace font-semibold">
                    ✓ {images.length}/5 görsel seçildi. Görseller admin
                    onayından sonra yayınlanır.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {images.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={index}
                          className="relative group w-20 h-20 rounded-2xl border border-hairline overflow-hidden bg-surface shadow-2xs"
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
                            className="absolute inset-0 bg-ink/60 flex items-center justify-center text-paper font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
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
            <div className="mt-8 p-8 bg-paper border border-hairline rounded-3xl text-center">
              <p className="text-ink-muted text-sm font-medium animate-pulse">
                Bileşenler ve uyumluluk verileri yükleniyor...
              </p>
            </div>
          ) : (
            <div className="mt-8 bg-paper border border-hairline rounded-3xl divide-y divide-hairline overflow-hidden shadow-xs">
              {renderCategoryRow(CATEGORIES[0])}
              {renderCategoryRow(CATEGORIES[1])}

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
            <p className="mt-6 text-sm text-incompatible font-semibold bg-incompatible/10 p-4 rounded-2xl border border-incompatible/30 shadow-2xs">
              {generalError}
            </p>
          )}

          {issues.length > 0 && (
            <div className="mt-6 rounded-2xl border border-incompatible/30 bg-incompatible/10 p-5 space-y-2 shadow-2xs">
              <p className="font-bold text-sm text-incompatible flex items-center gap-1.5">
                <span>⚠️</span> Seçilen parçalar arasında uyumsuzluk tespit
                edildi:
              </p>
              <ul className="space-y-1.5 pl-5 list-disc text-sm text-incompatible font-medium">
                {issues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-24 h-fit">
          <LiveSidebar selectedComponents={selectedComponents} />
        </aside>
      </div>

      <div
        ref={bottomBarRef}
        className="fixed bottom-0 left-0 right-0 bg-paper/90 backdrop-blur-md border-t border-hairline px-4 md:px-8 py-4 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.08)] z-40"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* lg altında fiyat bloğu aynı zamanda özeti açan butondur — dar
              ekranda ayrı bir butona yer yok, fiyat zaten oraya bakılan yer. */}
          <button
            ref={summaryButtonRef}
            type="button"
            onClick={() => setIsSummaryOpen(true)}
            aria-expanded={isSummaryOpen}
            aria-controls="ozet-sheet"
            className="lg:hidden -mx-2 px-2 py-1 rounded-xl text-left hover:bg-surface transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider font-[family-name:var(--font-mono)] flex items-center gap-1">
              {selectedComponents.length} parça · Özeti gör
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </span>
            <span className="block font-[family-name:var(--font-mono)] text-xl font-extrabold text-trace tracking-tight">
              {formatPrice(totalPrice)}
            </span>
          </button>

          <div className="hidden lg:block">
            <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]">
              Toplam Konfigürasyon Tutarı
            </p>
            <p className="font-[family-name:var(--font-mono)] text-2xl font-extrabold text-trace tracking-tight">
              {formatPrice(totalPrice)}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className="rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-bold px-5 md:px-8 py-3.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_16px_-4px_rgba(var(--color-trace-rgb),0.25)] active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            {isSubmitting
              ? 'Uyumluluk Kontrol Ediliyor...'
              : isComplete
                ? 'Sistemi Oluştur'
                : 'Tüm Parçaları Tamamla'}
          </button>
        </div>
      </div>

      {/* MOBİL ÖZET SAYFASI — sağdaki sütunun lg altındaki karşılığı */}
      {isSummaryOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-xs"
            onClick={() => setIsSummaryOpen(false)}
            aria-hidden="true"
          />

          <div
            id="ozet-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Sistem özeti"
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-paper border-t border-hairline shadow-[0_-20px_40px_-12px_rgba(0,0,0,0.25)] animate-[slideUpSheet_220ms_ease-out]"
          >
            <div className="sticky top-0 bg-paper/95 backdrop-blur-md flex items-center justify-between px-5 pt-4 pb-3 border-b border-hairline">
              <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
                Sistem Özeti
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsSummaryOpen(false);
                  summaryButtonRef.current?.focus();
                }}
                aria-label="Özeti kapat"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <LiveSidebar
              selectedComponents={selectedComponents}
              className="p-5 pb-8"
            />
          </div>
        </div>
      )}
    </main>
  );
}
