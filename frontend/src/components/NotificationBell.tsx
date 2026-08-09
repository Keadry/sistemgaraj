'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { imageUrl } from '@/lib/image-url';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/lib/api';

/** Bildirim metni türden üretiliyor, veritabanında saklanmıyor: metin
 *  değişince ya da dil eklenince eski kayıtlar da kendiliğinden güncelleniyor.
 *  Saklansaydı geçmiş bildirimler eski cümlelerle donup kalırdı. */
function describe(n: Notification): string {
  const who = n.actor ? `@${n.actor.username}` : 'Birisi';

  switch (n.type) {
    case 'BUILD_COMMENT':
      return `${who} sistemine yorum yaptı`;
    case 'BUILD_PART_COMMENT': {
      const part = n.comment?.component;
      /* Parça çekilemediyse (silinmiş bir parça `SetNull` bırakıyor) genel
         cümleye düşüyor — "undefined hakkında" yazmaktansa daha az bilgi
         veren ama doğru bir cümle. */
      if (!part) return `${who} sistemindeki bir parça hakkında yorum yaptı`;
      return `${who} sisteminde ${part.brand} ${part.name} hakkında yorum yaptı`;
    }
    case 'COMMENT_REPLY':
      return `${who} yorumuna yanıt verdi`;
    case 'MENTION':
      return `${who} bir yorumda senden bahsetti`;
    case 'BUILD_LIKE':
      return `${who} sistemini beğendi`;
    case 'COMMENT_LIKE':
      return `${who} yorumunu beğendi`;
    case 'BUILD_APPROVED':
      return 'Sistemin incelemeden geçti ve yayınlandı';
    case 'BUILD_REJECTED':
      return 'Sistemin incelemeden geçemedi';
    case 'EDIT_APPROVED':
      return 'Düzenleme isteğin onaylandı';
    case 'EDIT_REJECTED':
      return 'Düzenleme isteğin reddedildi';
    case 'ANNOUNCEMENT':
      return n.message ?? 'Yeni duyuru';
  }
}

function formatRelative(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün`;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* `showLoading` yalnızca kullanıcı paneli açtığında true. Açılıştaki sessiz
     çekimde false olması gerekiyor: aksi halde efekt `setIsLoading(true)`'ı
     senkron çağırıp basamaklı render tetikliyor. Zaten görünürde bir panel
     yokken "Yükleniyor" durumunun bir karşılığı da yok. */
  const load = useCallback(
    async (showLoading = false) => {
      if (!token) return;
      if (showLoading) setIsLoading(true);
      try {
        const data = await getNotifications(token);
        setItems(data.notifications);
        setUnread(data.unreadCount);
      } catch {
        // Sessiz: çan ikincil bir öge, hatası sayfayı meşgul etmemeli.
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [token],
  );

  /* Açılışta bir kez okunmamış sayısını alıyoruz. Bilerek yoklama (polling)
     yok: her kullanıcı için dakikada bir istek, tek başına bu özelliğin
     getireceği değerden pahalı. Sayı sayfa gezindikçe tazeleniyor.

     `load` çağırmak yerine istek burada açılıyor: state güncellemeleri
     `await`in arkasında kalıyor ve `cancelled` bayrağı, cevap dönmeden
     bileşen sökülürse güncellemeyi düşürüyor. */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getNotifications(token);
        if (cancelled) return;
        setItems(data.notifications);
        setUnread(data.unreadCount);
      } catch {
        // Sessiz — çan ikincil bir öge.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;

    function close() {
      setIsOpen(false);
      buttonRef.current?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen]);

  async function handleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) await load(true);
  }

  async function handleMarkAll() {
    if (!token || unread === 0) return;
    // İyimser güncelleme: sunucuyu beklemek, tıklamayla tepki arasında
    // sebepsiz bir boşluk bırakıyordu.
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead(token);
    } catch {
      load();
    }
  }

  async function handleItemClick(n: Notification) {
    setIsOpen(false);
    if (n.isRead || !token) return;
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
    );
    setUnread((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(n.id, token);
    } catch {
      load();
    }
  }

  if (!token) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        aria-expanded={isOpen}
        aria-label={
          unread > 0 ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'
        }
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-trace hover:bg-surface transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unread > 0 && (
          /* Sayı rozetin içinde: yalnızca nokta göstermek "bir şey var"
             diyor ama "ne kadar" demiyor, ve o fark açıp açmama kararını
             değiştiriyor. */
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-incompatible text-paper text-[10px] font-bold flex items-center justify-center font-[family-name:var(--font-mono)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Bildirimler"
          className="absolute right-0 top-full mt-2 w-[min(360px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl border border-hairline bg-paper shadow-[0_16px_40px_-12px_rgba(var(--color-trace-rgb),0.25)] z-50 animate-[slideDown_180ms_ease-out]"
        >
          <div className="sticky top-0 bg-paper/95 backdrop-blur-md flex items-center justify-between px-4 py-3 border-b border-hairline">
            <h2 className="text-sm font-bold text-ink">Bildirimler</h2>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-medium text-trace hover:underline rounded px-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          {isLoading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-ink-muted">
              Yükleniyor...
            </p>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-ink">Henüz bildirim yok</p>
              <p className="text-xs text-ink-muted mt-1">
                Sistemlerine gelen yorum ve beğeniler burada görünecek.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {items.map((n) => {
                const href = n.build ? `/sistemler/${n.build.id}` : null;

                const content = (
                  <>
                    <span className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-hairline bg-trace/10 flex items-center justify-center">
                      {n.actor?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imageUrl(n.actor.avatarUrl)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-trace">
                          {n.actor
                            ? n.actor.username.slice(0, 2).toUpperCase()
                            : 'SG'}
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink leading-snug">
                        {describe(n)}
                      </span>
                      {n.build && (
                        <span className="block text-[11px] text-ink-muted truncate mt-0.5">
                          {n.build.name}
                        </span>
                      )}
                      <span className="block text-[10px] text-ink-muted/80 mt-1 font-[family-name:var(--font-mono)]">
                        {formatRelative(n.createdAt)}
                      </span>
                    </span>

                    {!n.isRead && (
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full bg-trace shrink-0 mt-1.5"
                      />
                    )}
                  </>
                );

                const rowClass = `flex items-start gap-3 px-4 py-3 w-full text-left transition-colors ${
                  n.isRead ? 'hover:bg-surface' : 'bg-trace/5 hover:bg-trace/10'
                } focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-trace`;

                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => handleItemClick(n)}
                        className={rowClass}
                      >
                        {content}
                      </Link>
                    ) : (
                      /* Hedefi olmayan bildirim (duyuru) tıklanabilir ama
                         gitmiyor — yalnızca okundu işaretleniyor. */
                      <button
                        onClick={() => handleItemClick(n)}
                        className={rowClass}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
