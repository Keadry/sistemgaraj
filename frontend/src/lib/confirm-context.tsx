'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(
    null,
  );

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  function handleChoice(result: boolean) {
    resolver?.(result);
    setOptions(null);
    setResolver(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center p-6 z-[110]"
          onClick={() => handleChoice(false)}
        >
          <div
            className="bg-paper rounded-2xl border border-hairline max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              {options.title}
            </h3>
            {options.description && (
              <p className="text-sm text-ink-muted mt-2 leading-relaxed">
                {options.description}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleChoice(true)}
                autoFocus
                className={`flex-1 rounded-xl text-sm font-medium px-4 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  options.danger
                    ? 'bg-incompatible text-paper hover:bg-incompatible/90 focus-visible:outline-incompatible'
                    : 'bg-ink text-paper hover:bg-trace focus-visible:outline-trace'
                }`}
              >
                {options.confirmLabel ?? 'Onayla'}
              </button>
              <button
                onClick={() => handleChoice(false)}
                className="flex-1 rounded-xl border border-hairline text-sm font-medium px-4 py-2.5 hover:border-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace"
              >
                {options.cancelLabel ?? 'Vazgeç'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm, ConfirmProvider içinde kullanılmalı.');
  }
  return context.confirm;
}
