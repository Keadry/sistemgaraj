'use client';

import { useState } from 'react';
import { sendAnnouncement } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';

/** Sunucudaki sınırla aynı. İkisi ayrışırsa kullanıcı sınırı ancak
 *  gönderdikten sonra, hata mesajıyla öğrenir. */
const MAX_LENGTH = 280;

export default function AnnouncementsTab({ token }: { token: string }) {
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const trimmed = message.trim();
  const remaining = MAX_LENGTH - message.length;
  const canSend = trimmed.length > 0 && remaining >= 0 && !isSending;

  async function handleSend() {
    if (!canSend) return;

    /* Onay soruyoruz çünkü bu geri alınamaz ve herkese gidiyor: gönderilen
       duyuru her kullanıcının çanında beliriyor, silme yolu da yok. */
    const ok = await confirmDialog({
      title: 'Duyuruyu gönder',
      description:
        'Bu duyuru sitedeki tüm kullanıcılara bildirim olarak gidecek ve geri alınamayacak.',
      confirmLabel: 'Gönder',
    });
    if (!ok) return;

    setIsSending(true);
    try {
      const result = await sendAnnouncement(trimmed, token);
      showToast(result.message, 'success');
      setMessage('');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Bir hata oluştu.',
        'error',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
        Duyuru Gönder
      </h2>
      <p className="text-sm text-ink-muted mt-1">
        Tüm kullanıcıların bildirim çanında görünür. Bakım, yeni özellik ya da
        kural değişikliği gibi herkesi ilgilendiren şeyler için.
      </p>

      <label
        htmlFor="announcement"
        className="block text-xs font-bold uppercase tracking-wider text-ink-muted mt-6 mb-2 font-[family-name:var(--font-mono)]"
      >
        Duyuru metni
      </label>
      <textarea
        id="announcement"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Örn. Pazar 03:00-05:00 arası bakım yapılacak, site kısa süre kapalı olacak."
        className="w-full rounded-xl border border-hairline bg-surface/30 px-4 py-3 text-sm text-ink outline-none focus:border-trace focus:ring-2 focus:ring-trace/15 transition-all resize-none placeholder:text-ink-muted/50"
      />

      <div className="flex items-center justify-between gap-4 mt-3">
        <span
          className={`text-xs font-[family-name:var(--font-mono)] ${
            remaining < 0 ? 'text-incompatible' : 'text-ink-muted'
          }`}
        >
          {remaining}
        </span>

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="rounded-xl bg-trace hover:bg-trace-dark text-paper text-sm font-semibold px-5 py-2.5 transition-colors duration-200 ease-trace disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
        >
          {isSending ? 'Gönderiliyor...' : 'Herkese Gönder'}
        </button>
      </div>
    </div>
  );
}
