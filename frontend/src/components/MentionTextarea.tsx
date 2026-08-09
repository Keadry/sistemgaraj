'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';

/**
 * Yorum ve yanıt kutusu: `@` yazıldığında bu sohbetteki kişileri öneriyor.
 *
 * Öneri listesi **sayfadaki** kişilerle sınırlı (sistem sahibi + yorum
 * yazarları). Site genelinde arama yapmak için bir kullanıcı arama uç
 * noktası gerekiyordu ve yoktu; ayrıca etiketlenen kişi pratikte neredeyse
 * her zaman sohbetin içinden biri. Listede olmayan birini elle yazmak yine
 * mümkün — sunucu adı kendisi çözümlüyor, öneri yalnızca bir kolaylık.
 */

export type MentionCandidate = { id: string; username: string };

/** Kaç öneri gösterilecek. Kutunun altındaki panel sayfayı itmemeli. */
const MAX_SUGGESTIONS = 5;

/**
 * İmlecin o an yazılmakta olan bir etiketin içinde olup olmadığını söyler.
 *
 * `{0,20}` bilerek sıfırdan başlıyor: `@` yazıldığı anda liste açılsın.
 * Geriye bakış sunucudaki desenle aynı sebeple var — e-posta yazarken
 * (`biri@...`) öneri paneli açılmamalı.
 */
function activeMention(
  value: string,
  caret: number,
): { query: string; start: number } | null {
  const match = /(?<!\w)@([a-zA-Z0-9_]{0,20})$/.exec(value.slice(0, caret));
  if (!match) return null;
  return { query: match[1]!, start: caret - match[0].length };
}

export default function MentionTextarea({
  value,
  onChange,
  candidates,
  placeholder,
  rows = 3,
  className = '',
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  candidates: MentionCandidate[];
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listboxId = useId();

  const [query, setQuery] = useState<{ query: string; start: number } | null>(
    null,
  );
  const [highlighted, setHighlighted] = useState(0);

  /* Öneri kabul edildikten sonra imlecin gideceği yer. Değeri `onChange` ile
     yukarı gönderip aşağı prop olarak geri aldığımız için, imleci aynı anda
     ayarlamak işe yaramıyor: React değeri sonra yazıyor ve tarayıcı imleci
     metnin sonuna atıyor. Bu yüzden konum burada bekletiliyor ve yeni değer
     DOM'a işlendikten sonra, boyama öncesinde uygulanıyor. */
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(caret, caret);
  }, [value]);

  const suggestions = query
    ? candidates
        .filter((candidate) =>
          candidate.username.toLowerCase().startsWith(query.query.toLowerCase()),
        )
        .slice(0, MAX_SUGGESTIONS)
    : [];

  const isOpen = suggestions.length > 0;

  /* Liste daralınca eski indeks dışarıda kalabiliyor ("@t" iki öneri
     verirken ikinciyi seçip "@ta" yazmak gibi). İşaret her render'da
     sınırlanıyor; state'i düzeltmeye çalışmak efekt içinde setState
     gerektirirdi. */
  const activeIndex = Math.min(highlighted, Math.max(0, suggestions.length - 1));

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    // Metin değişti: öneri listesi de değişti, seçim başa dönüyor.
    setQuery(activeMention(e.target.value, e.target.selectionStart));
    setHighlighted(0);
  }

  /**
   * İmleç yer değiştirdiğinde paneli tazeliyor — metnin ortasındaki bir
   * etikete dönüp devam etmek mümkün.
   *
   * Buradan `highlighted` sıfırlanmıyor. React'in `onSelect`'i keyup'ta da
   * tetikleniyor: sıfırlarsak ArrowDown ile ilerletilen seçim, tuş
   * bırakıldığı anda başa dönüyor ve klavyeyle gezinmek hiç çalışmıyor.
   */
  function handleSelectionChange(caret: number) {
    const next = activeMention(value, caret);
    setQuery((prev) => {
      if (prev?.start === next?.start && prev?.query === next?.query) {
        return prev;
      }
      return next;
    });
  }

  function accept(username: string) {
    if (!query) return;

    const caret = textareaRef.current?.selectionStart ?? value.length;
    /* Sonuna boşluk konuyor: etiketten sonra yazmaya devam etmek en yaygın
       durum, ve boşluk olmadan bir sonraki kelime etikete yapışıyor. */
    const inserted = `@${username} `;
    const next = value.slice(0, query.start) + inserted + value.slice(caret);

    pendingCaret.current = query.start + inserted.length;
    onChange(next);
    setQuery(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      // Panel açıkken Enter satır atlamıyor, öneriyi kabul ediyor.
      e.preventDefault();
      accept(suggestions[activeIndex]!.username);
      return;
    }

    if (e.key === 'Escape') {
      // Yalnızca paneli kapatıyor. Yayılmayı durdurmak gerekiyor: dışarıda
      // Escape'i dinleyen paneller var, onlar da kapanırdı.
      e.preventDefault();
      e.stopPropagation();
      setQuery(null);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        // İmleç tıklamayla veya okla taşındığında da panel güncellenmeli:
        // metnin ortasındaki bir etikete dönüp devam etmek mümkün.
        onSelect={(e) =>
          handleSelectionChange(e.currentTarget.selectionStart ?? 0)
        }
        onBlur={() => setQuery(null)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-autocomplete="list"
        className={className}
      />

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Etiketlenecek kişiler"
          className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-hairline bg-paper shadow-[0_12px_32px_-12px_rgba(var(--color-trace-rgb),0.3)] overflow-hidden"
        >
          {suggestions.map((candidate, index) => (
            <li key={candidate.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                /* `onMouseDown`, `onClick` değil: textarea'nın `onBlur`u
                   tıklamadan önce çalışıp paneli kapatıyordu, tıklama
                   hiçbir zaman ulaşmıyordu. */
                onMouseDown={(e) => {
                  e.preventDefault();
                  accept(candidate.username);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                  index === activeIndex
                    ? 'bg-trace/10 text-trace'
                    : 'text-ink hover:bg-surface'
                }`}
              >
                <span className="font-[family-name:var(--font-mono)]">@</span>
                {candidate.username}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
