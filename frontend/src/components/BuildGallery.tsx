'use client';

import { useState } from 'react';
import BuildImage from './BuildImage';
import type { BuildImageType } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BuildGallery({ images }: { images: BuildImageType[] }) {
  const approved = images.filter((img) => img.status === 'APPROVED');
  const [index, setIndex] = useState(0);

  if (approved.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-2xl bg-surface overflow-hidden">
        <BuildImage imageUrl={null} />
      </div>
    );
  }

  const current = approved[index];

  function goPrev() {
    setIndex((i) => (i === 0 ? approved.length - 1 : i - 1));
  }

  function goNext() {
    setIndex((i) => (i === approved.length - 1 ? 0 : i + 1));
  }

  return (
    <div>
      <div className="aspect-[16/9] rounded-2xl bg-surface overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${API_URL}${current.url}`}
          alt="Sistem görseli"
          className="w-full h-full object-cover"
        />

        {approved.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Önceki görsel"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 border border-hairline flex items-center justify-center hover:bg-paper transition-colors"
            >
              ←
            </button>
            <button
              onClick={goNext}
              aria-label="Sonraki görsel"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 border border-hairline flex items-center justify-center hover:bg-paper transition-colors"
            >
              →
            </button>
            <span className="absolute bottom-3 right-3 text-xs bg-ink/70 text-paper rounded-full px-2.5 py-1">
              {index + 1} / {approved.length}
            </span>
          </>
        )}
      </div>

      {approved.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {approved.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIndex(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                i === index ? 'border-trace' : 'border-transparent'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}${img.url}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
