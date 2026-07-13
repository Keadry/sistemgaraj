'use client';

import { useState } from 'react';
import { toggleFeatured } from '@/lib/api';

export default function FeaturedToggle({
  buildId,
  initialIsFeatured,
  token,
}: {
  buildId: string;
  initialIsFeatured: boolean;
  token: string;
}) {
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      const updated = await toggleFeatured(buildId, token);
      setIsFeatured(updated.isFeatured);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSubmitting}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
        isFeatured
          ? 'border-trace bg-trace/10 text-trace'
          : 'border-hairline text-ink-muted hover:border-trace hover:text-trace'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isFeatured ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {isFeatured ? 'Öne Çıkarıldı' : 'Öne Çıkar'}
    </button>
  );
}
