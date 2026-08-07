'use client';

import { useState } from 'react';
import { uploadAvatar } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileAvatar({
  username,
  avatarUrl,
  isOwner,
  isOnline = false,
  token,
  onUploaded,
}: {
  username: string;
  avatarUrl: string | null;
  isOwner: boolean;
  /** Gizlilik ayarı kapalıysa API null döndürüyor — o zaman rozet çıkmıyor. */
  isOnline?: boolean | null;
  token: string | null;
  onUploaded: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    try {
      const url = await uploadAvatar(file, token);
      onUploaded(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  return (
    /* Dış kapsayıcı kırpmıyor — çevrimiçi rozeti avatarın kenarına oturuyor,
       `overflow-hidden` burada olsaydı kesilirdi. Kırpma bir alttaki
       daireye taşındı. */
    <div className="relative w-24 h-24 shrink-0 group">
      {/* Halka `paper` değil `on-scrim`: avatar kapak fotoğrafının üstünde
          duruyor, karanlık temada `paper` koyulaşıp fotoğrafta kaybolurdu. */}
      <div className="w-full h-full rounded-full border-[3px] border-on-scrim shadow-lg overflow-hidden bg-trace/10">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}${avatarUrl}`}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-trace">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {isOwner && (
          <label className="absolute inset-0 flex items-center justify-center rounded-full bg-scrim/0 group-hover:bg-scrim/60 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-within:bg-scrim/60">
            <span className="text-on-scrim text-[10px] font-medium text-center px-1">
              {isUploading ? '...' : 'Değiştir'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isUploading}
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {/* Dairenin 45° noktası merkezden r + r/√2 uzakta; 96px'lik avatarda
          bu köşeden ~4px içeri düşüyor, `bottom-1 right-1` tam oraya oturuyor. */}
      {isOnline === true && (
        <span
          title="Çevrimiçi"
          className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-compatible border-[3px] border-on-scrim shadow-sm"
        >
          <span className="sr-only">Çevrimiçi</span>
        </span>
      )}
    </div>
  );
}
