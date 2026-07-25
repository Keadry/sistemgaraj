'use client';

import { useState } from 'react';

export default function MuteDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (hours: number, reason: string) => void;
  onCancel: () => void;
}) {
  const [hours, setHours] = useState('24');
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hours || Number(hours) <= 0) return;
    onConfirm(Number(hours), reason);
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center p-6 z-[110]"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-paper rounded-2xl border border-hairline max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Kullanıcıyı Sustur
        </h3>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">
            Süre (saat)
          </label>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            min={1}
            autoFocus
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">
            Sebep (opsiyonel)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={!hours || Number(hours) <= 0}
            className="flex-1 rounded-xl bg-ink text-paper text-sm font-medium px-4 py-2.5 hover:bg-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            Sustur
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-hairline text-sm font-medium px-4 py-2.5 hover:border-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
}
