'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { likeBuild, unlikeBuild, type Like } from '@/lib/api';

export default function LikeButton({
  buildId,
  initialLikes,
}: {
  buildId: string;
  initialLikes: Like[];
}) {
  const { user, token } = useAuth();
  const router = useRouter();

  const [likes, setLikes] = useState(initialLikes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasLiked = user ? likes.some((l) => l.userId === user.id) : false;

  async function handleClick() {
    if (!user || !token) {
      router.push('/giris');
      return;
    }

    setIsSubmitting(true);

    try {
      if (hasLiked) {
        await unlikeBuild(buildId, token);
        setLikes((prev) => prev.filter((l) => l.userId !== user.id));
      } else {
        await likeBuild(buildId, token);
        setLikes((prev) => [...prev, { id: 'temp', userId: user.id }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSubmitting}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trace ${
        hasLiked
          ? 'border-trace bg-trace/10 text-trace'
          : 'border-hairline text-ink-muted hover:border-trace hover:text-trace'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={hasLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {likes.length}
    </button>
  );
}
