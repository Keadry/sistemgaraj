'use client';

import { useState } from 'react';
import LikeButton from './LikeButton';
import CommentForm from './CommentForm';
import type { Like, Comment } from '@/lib/api';

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default function BuildInteractions({
  buildId,
  initialLikes,
  initialComments,
}: {
  buildId: string;
  initialLikes: Like[];
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);

  return (
    <>
      {/* BEĞENİ / YORUM SAYACI */}
      <div className="mt-6 flex items-center gap-3 pb-6 border-b border-hairline">
        <LikeButton buildId={buildId} initialLikes={initialLikes} />
        <span className="text-sm text-ink-muted">{comments.length} yorum</span>
      </div>

      {/* YORUMLAR */}
      <section className="mt-10 pb-16">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-4">
          Yorumlar ({comments.length})
        </h2>

        <CommentForm
          buildId={buildId}
          onCommentAdded={(comment) =>
            setComments((prev) => [comment, ...prev])
          }
        />

        {comments.length === 0 ? (
          <p className="text-ink-muted text-sm">
            Henüz yorum yok. İlk yorumu sen yaz.
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {comment.user.username ?? 'Anonim'}
                  </span>
                  <span className="text-xs text-ink-muted font-[family-name:var(--font-mono)]">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-ink mt-2 leading-relaxed">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
