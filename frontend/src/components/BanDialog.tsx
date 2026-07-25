'use client';

import { useState } from 'react';

export default function BanDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(reason || 'Belirtilmedi');
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
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-incompatible">
          Kullanıcıyı Banla
        </h3>
        <p className="text-sm text-ink-muted mt-1">
          Bu işlem kullanıcının hesabını kalıcı olarak askıya alır.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5">Ban sebebi</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            placeholder="Belirtilmedi"
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-incompatible transition-colors"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-incompatible text-paper text-sm font-medium px-4 py-2.5 hover:bg-incompatible/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incompatible"
          >
            Banla
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
