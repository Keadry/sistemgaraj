'use client';

import { useState } from 'react';
import { uploadCover } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileCover({
  coverUrl,
  isOwner,
  token,
  onUploaded,
}: {
  coverUrl: string | null;
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
      const url = await uploadCover(file, token);
      onUploaded(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden bg-surface group">
      {' '}
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_URL}${coverUrl}`}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      {isOwner && (
        <label className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/40 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
          <span className="text-paper text-xs font-medium rounded-full border border-paper px-3 py-1.5">
            {isUploading ? 'Yükleniyor...' : 'Kapak Fotoğrafını Değiştir'}
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
