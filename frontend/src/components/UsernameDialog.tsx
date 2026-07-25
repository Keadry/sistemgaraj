'use client';

import { useState } from 'react';

export default function UsernameDialog({
  currentUsername,
  onConfirm,
  onCancel,
}: {
  currentUsername: string;
  onConfirm: (username: string) => void;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState(currentUsername);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    onConfirm(username);
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
          Kullanıcı Adını Değiştir
        </h3>

        <div className="mt-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm outline-none focus:border-trace transition-colors"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={!username.trim()}
            className="flex-1 rounded-xl bg-ink text-paper text-sm font-medium px-4 py-2.5 hover:bg-trace transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
          >
            Kaydet
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
