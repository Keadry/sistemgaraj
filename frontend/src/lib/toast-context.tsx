'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Mobilde iki yandan boşluk bırakıp genişliği ekrana bırakıyoruz.
          `w-full` + `right-6` dar ekranda viewport'tan taşıp yatay kaydırma
          yaratıyordu. sm ve üstünde eski sağ-alt sabit genişlik davranışı.

          Alt kenar boşluğuna `--toast-offset` ekleniyor. Sayfanın altında sabit
          bir çubuk varsa (Sistem Topla'daki gönder barı gibi) o sayfa bu
          değişkeni kendi yüksekliğine ayarlıyor ve toast'lar çubuğun üstüne
          çıkıyor. Değişken tanımlı değilse 0px, yani varsayılan davranış. */}
      <div className="fixed bottom-[calc(1.5rem+var(--toast-offset,0px))] left-4 right-4 sm:left-auto sm:right-6 z-[100] flex flex-col gap-2 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            role="status"
            className={`rounded-xl border px-4 py-3 shadow-lg text-sm cursor-pointer animate-[slideInRight_250ms_ease-out] ${
              toast.type === 'success'
                ? 'bg-compatible/10 border-compatible/30 text-compatible'
                : toast.type === 'error'
                  ? 'bg-incompatible/10 border-incompatible/30 text-incompatible'
                  : 'bg-trace/10 border-trace/30 text-trace'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast, ToastProvider içinde kullanılmalı.');
  }
  return context;
}
