'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ComponentPicker from '@/components/ComponentPicker';
import LiveSidebar from '@/components/LiveSidebar';
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
  ramId: string | null;
  gpuId: string | null;
  psuId: string | null;
  storageId: string | null;
  caseId: string | null;
};

const CATEGORIES: { key: keyof Selection; type: string; label: string }[] = [
  { key: 'cpuId', type: 'CPU', label: 'İşlemci (CPU)' },
  { key: 'motherboardId', type: 'MOTHERBOARD', label: 'Anakart' },
  { key: 'ramId', type: 'RAM', label: 'RAM' },
  { key: 'gpuId', type: 'GPU', label: 'Ekran Kartı' },
  { key: 'psuId', type: 'PSU', label: 'Güç Kaynağı' },
  { key: 'storageId', type: 'STORAGE', label: 'Depolama (SATA veya M.2)' },
  { key: 'caseId', type: 'CASE', label: 'Kasa' },
];

const FORM_FACTOR_SIZE: Record<string, number> = {
  'Mini-ITX': 1,
  'Micro-ATX': 2,
  ATX: 3,
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price);
}

function isCompatible(
  component: Component,
  selection: Selection,
  components: Component[],
): boolean {
  const byId = (id: string | null) =>
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

export default function SistemToplaPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Resimleri biriktiren state mekanizması
  const [images, setImages] = useState<File[]>([]);

  const [selection, setSelection] = useState<Selection>({
    cpuId: null,
    motherboardId: null,
    ramId: null,
    gpuId: null,
    psuId: null,
    storageId: null,
    caseId: null,
  });
  const [issues, setIssues] = useState<CompatibilityIssue[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeCategory, setActiveCategory] = useState<keyof Selection | null>(
    'cpuId',
  );

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
          next[cat.key] = null;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    selection.cpuId,
    selection.motherboardId,
    selection.ramId,
    selection.caseId,
    components,
  ]);

  // Üst üste resim eklemeyi sağlayan akıllı handler fonksiyonu
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setImages((prevImages) => {
      // Mevcut resimlerle yeni gelen resimleri birleştiriyoruz
      const combined = [...prevImages, ...selectedFiles];
      // Backend sınırına (en fazla 5) sadık kalmak için kesiyoruz
      return combined.slice(0, 5);
    });

    // Aynı resmi tekrar seçebilmek için inputun değerini sıfırlıyoruz
    e.target.value = '';
  }

  // Kullanıcının eklediği resmi listeden tek tıkla silebilmesi için
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
      const currentIndex = CATEGORIES.findIndex((cat) => cat.key === key);
      const nextCategory = CATEGORIES.slice(currentIndex + 1).find(
        (cat) => !selection[cat.key],
      );

      if (nextCategory) {
        setTimeout(() => {
          setActiveCategory(nextCategory.key);
        }, 150);
      } else {
        setActiveCategory(null);
      }
    }
  }

  const selectedComponents = CATEGORIES.map((cat) => {
    const id = selection[cat.key];
    return components.find((c) => c.id === id) ?? null;
  }).filter((c): c is Component => c !== null);

  const isComplete = CATEGORIES.every((cat) => selection[cat.key] !== null);

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
        ramId: selection.ramId!,
        gpuId: selection.gpuId!,
        psuId: selection.psuId!,
        caseId: selection.caseId!,
        storageId: selection.storageId!,
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

  return (
    <main className="min-h-screen pb-32 bg-zinc-50/50">
      <Navbar />

      <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-zinc-950">
            Sistem Topla
          </h1>
          <p className="text-zinc-500 mt-2 text-sm">
            Kategorilere tıklayarak parça listesini açabilir, sisteminizi adım
            adım toplayabilirsiniz.
          </p>

          {/* Meta Bilgiler Modülü */}
          <div className="mt-8 p-5 bg-white border border-zinc-200 rounded-2xl space-y-4 shadow-2xs">
            <div>
              <label
                htmlFor="build-name"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5"
              >
                Sistem Adı
              </label>
              <input
                id="build-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Bütçe Dostu Oyun Bilgisayarı"
                className="w-full max-w-md rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-zinc-400 transition-colors bg-zinc-50/30"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer w-fit text-zinc-700 font-medium">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
              />
              Herkese açık olsun (topluluk akışında görünsün)
            </label>

            {/* Yenilenen Gelişmiş Çoklu Görsel Yükleme Paneli */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Sistem Görselleri (En fazla 5 adet)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={images.length >= 5}
                onChange={handleImageChange}
                className="block text-xs text-zinc-500 file:mr-4 file:rounded-xl file:border file:border-zinc-200 file:bg-zinc-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-100 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Seçilen Görsellerin Anlık Canlı Önizleme Alanı */}
              {images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-zinc-600 font-medium">
                    ✓ {images.length}/5 görsel seçildi. Görseller admin
                    onayından sonra yayınlanır.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {images.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={index}
                          className="relative group w-16 h-16 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt="Önizleme"
                            className="w-full h-full object-cover"
                            onLoad={() => URL.revokeObjectURL(previewUrl)} // Bellek sızıntısını önler
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150"
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
            <p className="text-zinc-500 text-sm mt-12 animate-pulse">
              Parçalar yükleniyor...
            </p>
          ) : (
            <div className="mt-8 border border-zinc-200 bg-white rounded-2xl divide-y divide-zinc-100 overflow-hidden shadow-2xs">
              {CATEGORIES.map((cat) => {
                const ofType = components.filter((c) => c.type === cat.type);
                const compatibleList = ofType.filter((c) =>
                  isCompatible(c, selection, components),
                );
                const selectedComponent = components.find(
                  (c) => c.id === selection[cat.key],
                );
                const isOpen = activeCategory === cat.key;

                return (
                  <div
                    key={cat.key}
                    className="transition-colors duration-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveCategory(isOpen ? null : cat.key)}
                      className={`w-full flex items-center justify-between p-4 text-left transition-all duration-300 ${
                        isOpen ? 'bg-zinc-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-[family-name:var(--font-mono)]">
                          {cat.label}
                        </span>
                        {selectedComponent ? (
                          <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                            {selectedComponent.brand} {selectedComponent.name}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                            Bileşen Seçilmedi
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {selectedComponent && (
                          <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-zinc-700 bg-zinc-100 px-2 py-1 rounded-lg">
                            {formatPrice(selectedComponent.price)}
                          </span>
                        )}
                        <span
                          className={`text-zinc-400 text-[10px] transition-transform duration-300 ease-in-out ${
                            isOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        >
                          ▼
                        </span>
                      </div>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-in-out border-zinc-100 ${
                        isOpen
                          ? 'grid-rows-[1fr] opacity-100 border-t p-4 bg-zinc-50/20'
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
              })}
            </div>
          )}

          {generalError && (
            <p className="mt-6 text-sm text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100">
              {generalError}
            </p>
          )}

          {issues.length > 0 && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-4">
              <p className="font-bold text-sm text-red-600 mb-2">
                Seçilen parçalar uyumlu değil:
              </p>
              <ul className="space-y-1">
                {issues.map((issue, i) => (
                  <li key={i} className="text-sm text-red-600 font-medium">
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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 md:px-12 py-4 flex items-center justify-between shadow-md z-40">
        <div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Maliyet
          </p>
          <p className="font-[family-name:var(--font-mono)] text-xl font-extrabold text-zinc-900 tracking-tight">
            {formatPrice(selectedComponents.reduce((s, c) => s + c.price, 0))}
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="rounded-xl bg-zinc-900 text-white text-sm font-bold px-8 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
        >
          {isSubmitting
            ? 'Kontrol ediliyor...'
            : isComplete
              ? 'Sistemi Oluştur'
              : `${selectedComponents.length}/7 parça seçildi`}
        </button>
      </div>
    </main>
  );
}
