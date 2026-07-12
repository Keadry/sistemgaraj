'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ComponentPicker from '@/components/ComponentPicker';
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
  caseId: string | null;
};

const CATEGORIES: { key: keyof Selection; type: string; label: string }[] = [
  { key: 'cpuId', type: 'CPU', label: 'İşlemci (CPU)' },
  { key: 'motherboardId', type: 'MOTHERBOARD', label: 'Anakart' },
  { key: 'ramId', type: 'RAM', label: 'RAM' },
  { key: 'gpuId', type: 'GPU', label: 'Ekran Kartı' },
  { key: 'psuId', type: 'PSU', label: 'Güç Kaynağı' },
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

// pcCase'in içine motherboard'un fiziksel olarak sığıp sığmadığını kontrol eder.
function doesFitInCase(
  motherboardFormFactor: string,
  caseFormFactor: string,
): boolean {
  const boardSize = FORM_FACTOR_SIZE[motherboardFormFactor];
  const caseSize = FORM_FACTOR_SIZE[caseFormFactor];
  const fits = boardSize <= caseSize;
  return fits;
}

// Bir parçanın, mevcut diğer seçimlerle uyumlu olup olmadığını kontrol eder.
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
    if (component.socket !== motherboard.socket) {
      return false;
    }
  }

  if (component.type === 'MOTHERBOARD') {
    if (cpu && component.socket !== cpu.socket) {
      return false;
    }
    if (ram && component.ramType !== ram.ramType) {
      return false;
    }
    if (pcCase && component.formFactor && pcCase.formFactor) {
      const fits = doesFitInCase(component.formFactor, pcCase.formFactor);
      if (!fits) {
        return false;
      }
    }
  }

  if (component.type === 'RAM' && motherboard) {
    if (component.ramType !== motherboard.ramType) {
      return false;
    }
  }

  if (component.type === 'CASE' && motherboard) {
    if (component.formFactor && motherboard.formFactor) {
      const fits = doesFitInCase(motherboard.formFactor, component.formFactor);
      if (!fits) {
        return false;
      }
    }
  }

  return true;
}

function getIncompatibleIds(
  type: string,
  selection: Selection,
  components: Component[],
): Set<string> {
  const ofType = components.filter((c) => c.type === type);
  const incompatible = ofType.filter(
    (c) => !isCompatible(c, selection, components),
  );
  return new Set(incompatible.map((c) => c.id));
}

export default function SistemToplaPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [components, setComponents] = useState<Component[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [name, setName] = useState('');
  const [selection, setSelection] = useState<Selection>({
    cpuId: null,
    motherboardId: null,
    ramId: null,
    gpuId: null,
    psuId: null,
    caseId: null,
  });
  const [issues, setIssues] = useState<CompatibilityIssue[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selection.cpuId,
    selection.motherboardId,
    selection.ramId,
    selection.caseId,
    components,
  ]);

  function handleSelect(key: keyof Selection, id: string) {
    setSelection((prev) => ({
      ...prev,
      [key]: prev[key] === id ? null : id,
    }));
  }

  const selectedComponents = CATEGORIES.map((cat) => {
    const id = selection[cat.key];
    return components.find((c) => c.id === id) ?? null;
  }).filter((c): c is Component => c !== null);

  const totalPrice = selectedComponents.reduce((sum, c) => sum + c.price, 0);
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
    <main className="min-h-screen bg-paper pb-32">
      <Navbar />

      <div className="px-6 md:px-12 py-10 max-w-4xl mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Sistem Topla
        </h1>
        <p className="text-ink-muted mt-2">
          6 kategoriden parça seç, uyumsuz seçenekler otomatik soluklaşır.
        </p>

        <div className="mt-8">
          <label
            htmlFor="build-name"
            className="block text-sm font-medium mb-1.5"
          >
            Sistem Adı
          </label>
          <input
            id="build-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Bütçe Dostu Oyun Bilgisayarı"
            className="w-full max-w-md rounded-xl border border-hairline px-4 py-2.5 outline-none focus:border-trace transition-colors"
          />
        </div>

        {isLoadingComponents ? (
          <p className="text-ink-muted mt-12">Parçalar yükleniyor...</p>
        ) : (
          <div className="mt-10 space-y-10">
            {CATEGORIES.map((cat) => {
              const ofType = components.filter((c) => c.type === cat.type);
              const incompatibleIds = getIncompatibleIds(
                cat.type,
                selection,
                components,
              );

              return (
                <ComponentPicker
                  key={cat.key}
                  label={cat.label}
                  components={ofType}
                  selectedId={selection[cat.key]}
                  incompatibleIds={incompatibleIds}
                  onSelect={(id) => handleSelect(cat.key, id)}
                />
              );
            })}
          </div>
        )}

        {generalError && (
          <p className="mt-6 text-sm text-incompatible">{generalError}</p>
        )}

        {issues.length > 0 && (
          <div className="mt-6 rounded-xl border border-incompatible bg-incompatible/5 p-4">
            <p className="font-medium text-sm text-incompatible mb-2">
              Seçilen parçalar uyumlu değil:
            </p>
            <ul className="space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-sm text-incompatible">
                  • {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-paper border-t border-hairline px-6 md:px-12 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted">Toplam</p>
          <p className="font-[family-name:var(--font-mono)] text-xl font-semibold">
            {formatPrice(totalPrice)}
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="rounded-full bg-ink text-paper text-sm font-medium px-8 py-3.5 hover:bg-trace transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
        >
          {isSubmitting
            ? 'Kontrol ediliyor...'
            : isComplete
              ? 'Sistemi Oluştur'
              : `${selectedComponents.length}/6 parça seçildi`}
        </button>
      </div>
    </main>
  );
}
