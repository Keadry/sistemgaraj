'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describeType(type: string): string {
  return type.replace('image/', '').toUpperCase();
}

export default function ImageDropzone({
  files,
  onChange,
  maxFiles = 5,
  reservedSlots = 0,
  disabled = false,
}: {
  files: File[];
  onChange: (next: File[]) => void;
  /** Görsel üst sınırı — hem yeni seçilenleri hem `reservedSlots`'u kapsar. */
  maxFiles?: number;
  /** Sunucuda zaten duran ve kotadan düşen görsel sayısı (düzenleme ekranı). */
  reservedSlots?: number;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Sürükleme olayları alt elemanlara girip çıkarken de tetiklendiği için
  // dragenter/dragleave'i sayaçla dengeliyoruz; yoksa fare bir çocuğun
  // üstüne geldiğinde vurgu sönüp yanıyor.
  const dragDepth = useRef(0);

  const usedSlots = reservedSlots + files.length;
  const remainingSlots = Math.max(0, maxFiles - usedSlots);
  const isFull = remainingSlots === 0;

  // Önizleme URL'leri dosyalardan türeyen veri — state'e kopyalamıyoruz.
  // useMemo, render gövdesinde her seferinde yeni URL üretilmesini engelliyor;
  // efekt de bir önceki takımı (ve unmount'ta sonuncuyu) geri veriyor.
  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function addFiles(incoming: File[]) {
    if (disabled || incoming.length === 0) return;

    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        problems.push(`${file.name} — desteklenmeyen tür (${file.type || 'bilinmiyor'})`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        problems.push(`${file.name} — ${formatSize(file.size)}, sınır 8 MB`);
        continue;
      }
      // Aynı dosyayı iki kez eklemeyi engelle: ad + boyut + değiştirilme
      // tarihi pratikte yeterli bir kimlik.
      const isDuplicate = [...files, ...accepted].some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified,
      );
      if (isDuplicate) {
        problems.push(`${file.name} — zaten eklenmiş`);
        continue;
      }
      accepted.push(file);
    }

    const fitting = accepted.slice(0, remainingSlots);
    if (accepted.length > fitting.length) {
      problems.push(
        `${accepted.length - fitting.length} görsel eklenmedi — en fazla ${maxFiles} görsel yükleyebilirsin`,
      );
    }

    setErrors(problems);
    if (fitting.length > 0) onChange([...files, ...fitting]);
  }

  function removeAt(index: number) {
    setErrors([]);
    onChange(files.filter((_, i) => i !== index));
  }

  // Dinleyici bir kez bağlansın diye en güncel addFiles'ı ref'te tutuyoruz;
  // bağımlılığa koysaydık her render'da listener sökülüp takılırdı.
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });

  // Panodan yapıştırma. Sayfanın herhangi bir yerinde çalışıyor; sadece dosya
  // içeren yapıştırmalara tepki verdiği için metin alanlarına yazmayı
  // etkilemiyor.
  useEffect(() => {
    if (disabled) return;

    function onPaste(e: ClipboardEvent) {
      const pasted = Array.from(e.clipboardData?.files ?? []);
      if (pasted.length === 0) return;
      e.preventDefault();
      addFilesRef.current(pasted);
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-[family-name:var(--font-mono)]"
        >
          Sistem Görselleri
        </label>
        <span className="text-[11px] text-ink-muted font-[family-name:var(--font-mono)] shrink-0">
          {usedSlots} / {maxFiles}
        </span>
      </div>

      <p className="text-[11px] text-ink-muted mb-2.5">
        {ACCEPTED_TYPES.map(describeType).join(', ')} · her biri en fazla 8 MB
      </p>

      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        disabled={disabled || isFull}
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
        className="sr-only"
      />

      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          if (disabled || isFull) return;
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`flex items-center gap-4 rounded-2xl border border-dashed p-5 transition-colors ${
          disabled || isFull
            ? 'border-hairline bg-surface/30 cursor-not-allowed'
            : isDragging
              ? 'border-trace bg-trace/10 cursor-copy animate-drop-glow'
              : 'border-hairline bg-surface/40 hover:border-trace/50 hover:bg-surface/60 cursor-pointer'
        } focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-trace`}
      >
        <span
          className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-trace text-paper' : 'bg-trace/10 text-trace'
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </span>

        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">
            {isFull
              ? 'Görsel sınırına ulaştın'
              : isDragging
                ? 'Bırak, ekleyelim'
                : 'Dosyaları buraya sürükle'}
          </span>
          <span className="block text-xs text-ink-muted mt-0.5">
            {isFull
              ? `Yeni görsel eklemek için önce birini kaldır`
              : 'ya da seçmek için tıkla · panodan yapıştırabilirsin'}
          </span>
        </span>
      </label>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1" role="alert">
          {errors.map((message, i) => (
            <li
              key={i}
              className="text-xs text-incompatible font-medium flex gap-1.5"
            >
              <span aria-hidden="true">•</span>
              <span>{message}</span>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-paper p-2.5"
            >
              <span className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-hairline bg-surface">
                {previews[index] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previews[index]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink truncate">
                  {file.name}
                </span>
                <span className="block text-[11px] text-ink-muted font-[family-name:var(--font-mono)] mt-0.5">
                  {formatSize(file.size)} · {describeType(file.type)}
                </span>
              </span>

              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`${file.name} görselini kaldır`}
                className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-ink-muted hover:text-incompatible hover:bg-incompatible/10 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-muted">
            Görseller admin onayından sonra yayınlanır.
          </p>
          <button
            type="button"
            onClick={() => {
              setErrors([]);
              onChange([]);
            }}
            className="text-xs font-semibold text-ink-muted hover:text-incompatible transition-colors shrink-0 rounded px-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
          >
            Tümünü kaldır
          </button>
        </div>
      )}
    </div>
  );
}
