'use client';

import { useState } from 'react';
import { uploadAvatar } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileAvatar({
  username,
  avatarUrl,
  isOwner,
  token,
  onUploaded,
}: {
  username: string;
  avatarUrl: string | null;
  isOwner: boolean;
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
    <div className="relative w-20 h-20 rounded-full border-2 border-paper shadow-sm overflow-hidden bg-trace/10 group">
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
        <label className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
          <span className="text-paper text-[10px] font-medium text-center px-1">
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
  );
}
